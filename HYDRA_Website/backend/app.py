import os
import json
import time
import secrets
import csv
import io
import jwt
import requests
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

import hashlib
from services.llama_service import LlamaService
from models import db, User, WAFLog, Alert, Restriction, Signature, Model, PatchingReport, SuspiciousUserProfile, WhiteListedRequest, SysLog, init_db

app = Flask(__name__)
CORS(app)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hydra.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))

# Initialize Database
init_db(app)

# Initialize Services
llama_service = LlamaService()

# Configuration
VT_API_KEY = os.getenv('VT_API_KEY')
OTX_API_KEY = os.getenv('OTX_API_KEY')
ABUSEIPDB_API_KEY = os.getenv('ABUSEIPDB_API_KEY')

# Constants
CACHE_TTL = 1800
TIMEOUT = 5
CACHE = {}

# Rate Limiters
class RateLimiter:
    def __init__(self, calls, period):
        self.calls = calls
        self.period = period
        self.timestamps = []

    def allow(self):
        now = time.time()
        self.timestamps = [t for t in self.timestamps if now - t < self.period]
        if len(self.timestamps) < self.calls:
            self.timestamps.append(now)
            return True, 0
        oldest = self.timestamps[0]
        wait_time = self.period - (now - oldest)
        return False, wait_time

vt_limiter = RateLimiter(4, 60)
abuse_limiter = RateLimiter(1000, 86400)
patch_limiter = RateLimiter(10, 60)

FEED_CACHE_TTL_ABUSE = 43200
FEED_CACHE_TTL_OTX = 3600
PATCH_CACHE_TTL = 86400
PATCH_CACHE = {}
FEED_CACHE = {}


# ==================== AUTH DECORATOR ====================

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    return decorated


# ==================== AUTH ENDPOINTS ====================

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    
    if not all([username, password, email]):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409
    
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409
    
    # Create user with provided role or default to 'user'
    role = data.get('role', 'user')
    user = User(username=username, email=email, role=role)
    user.set_password(password)
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'success': True, 'user': user.to_dict()}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    if not all([username, password]):
        return jsonify({'error': 'Missing credentials'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    
    # Allow all valid roles to access the system
    # (Role-based access control can be implemented on specific pages)
    
    token = jwt.encode({
        'user_id': user.user_id,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm='HS256')
    
    return jsonify({
        'success': True,
        'token': token,
        'user': user.to_dict()
    })


# ==================== DASHBOARD ENDPOINTS ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})


@app.route('/api/kpis', methods=['GET'])
def get_kpis():
    """Get dashboard KPI metrics from real database data"""
    from sqlalchemy import func
    
    # Total requests (WAF logs)
    total_requests = WAFLog.query.count()
    
    # Blocked attacks (alerts with blocked status or severity >= High)
    blocked_attacks = Alert.query.filter(Alert.status == 'open').count()
    
    # False positives (whitelisted requests)
    false_positives = WhiteListedRequest.query.count()
    
    # Model confidence (from Model table or default 87%)
    model = Model.query.first()
    model_confidence = model.model_threshold if model and model.model_threshold else 0.87
    
    return jsonify({
        'totalRequests': total_requests,
        'blockedAttacks': blocked_attacks,
        'falsePositives': false_positives,
        'modelConfidence': model_confidence
    })


@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get WAF logs for the logs page"""
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    logs = WAFLog.query.order_by(WAFLog.wlog_timestamp.desc()).offset(offset).limit(limit).all()
    total = WAFLog.query.count()
    
    return jsonify({
        'logs': [log.to_dict() for log in logs],
        'total': total
    })


@app.route('/api/traffic', methods=['GET'])
def get_traffic():
    """Get traffic data for the last 30 days"""
    from sqlalchemy import func
    
    # Get daily request counts for the last 30 days
    cutoff = datetime.utcnow() - timedelta(days=30)
    
    daily_counts = db.session.query(
        func.date(WAFLog.wlog_timestamp).label('date'),
        func.count(WAFLog.wlog_id).label('count')
    ).filter(
        WAFLog.wlog_timestamp >= cutoff
    ).group_by(
        func.date(WAFLog.wlog_timestamp)
    ).order_by(
        func.date(WAFLog.wlog_timestamp)
    ).all()
    
    # Fill in missing days with 0
    traffic_data = []
    if daily_counts:
        for i in range(30):
            day = (datetime.utcnow() - timedelta(days=29-i)).date()
            count = next((c.count for c in daily_counts if c.date == day), 0)
            traffic_data.append(count)
    else:
        traffic_data = [0] * 30
    
    return jsonify({'trafficData': traffic_data})


@app.route('/api/owasp', methods=['GET'])
def get_owasp():
    """Get OWASP attack type breakdown"""
    from sqlalchemy import func
    
    # Count attacks by type
    type_counts = db.session.query(
        WAFLog.wlog_type,
        func.count(WAFLog.wlog_id).label('count')
    ).group_by(WAFLog.wlog_type).all()
    
    owasp_counts = {tc.wlog_type: tc.count for tc in type_counts}
    
    # If no data, return empty dict
    return jsonify(owasp_counts if owasp_counts else {})


@app.route('/api/heatmap', methods=['GET'])
def get_heatmap():
    """Get anomaly heatmap data (7 days x 24 hours)"""
    from sqlalchemy import func
    
    # Get hourly counts for the last 7 days
    cutoff = datetime.utcnow() - timedelta(days=7)
    
    hourly_data = db.session.query(
        func.strftime('%w', WAFLog.wlog_timestamp).label('day'),
        func.strftime('%H', WAFLog.wlog_timestamp).label('hour'),
        func.count(WAFLog.wlog_id).label('count')
    ).filter(
        WAFLog.wlog_timestamp >= cutoff
    ).group_by(
        func.strftime('%w', WAFLog.wlog_timestamp),
        func.strftime('%H', WAFLog.wlog_timestamp)
    ).all()
    
    # Build 7x24 heatmap matrix (normalized 0-1)
    heatmap = [[0]*24 for _ in range(7)]
    max_count = max((h.count for h in hourly_data), default=1)
    
    for h in hourly_data:
        day = int(h.day)
        hour = int(h.hour)
        heatmap[day][hour] = h.count / max_count if max_count > 0 else 0
    
    return jsonify({'heatmap': heatmap})


# ==================== ALERTS ENDPOINTS ====================

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    status_filter = request.args.get('status')
    severity_filter = request.args.get('severity')
    
    query = Alert.query.join(WAFLog, Alert.wlog_id == WAFLog.wlog_id, isouter=True)
    
    if status_filter:
        query = query.filter(Alert.status == status_filter)
    
    if severity_filter:
        query = query.filter(WAFLog.severity == severity_filter)
    else:
        # Default: Medium to Critical
        query = query.filter(WAFLog.severity.in_(['Medium', 'High', 'Critical']))
    
    alerts = query.order_by(Alert.created_at.desc()).limit(100).all()
    
    return jsonify({'alerts': [a.to_dict() for a in alerts]})


@app.route('/api/alerts/<int:alert_id>/check', methods=['PUT'])
@token_required
def check_alert(current_user, alert_id):
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404
    
    alert.status = 'checked'
    alert.resolved_at = datetime.utcnow()
    db.session.commit()
    
    # Log the action
    sys_log = SysLog(
        message=f'Alert {alert_id} marked as checked by {current_user.username}',
        user_id=current_user.user_id
    )
    db.session.add(sys_log)
    db.session.commit()
    
    return jsonify({'success': True, 'alert': alert.to_dict()})


# ==================== RESTRICTIONS ENDPOINTS ====================

@app.route('/api/restrictions', methods=['GET'])
def get_restrictions():
    restrictions = Restriction.query.order_by(Restriction.created_at.desc()).all()
    return jsonify({'restrictions': [r.to_dict() for r in restrictions]})


@app.route('/api/restrictions', methods=['POST'])
@token_required
def add_restriction(current_user):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    r_type = data.get('type')
    r_value = data.get('value')
    
    if not all([r_type, r_value]):
        return jsonify({'error': 'Missing type or value'}), 400
    
    if r_type not in ['ip', 'hash', 'domain']:
        return jsonify({'error': 'Invalid type. Must be ip, hash, or domain'}), 400
    
    restriction = Restriction(
        restriction_type=r_type,
        restriction_description=r_value
    )
    db.session.add(restriction)
    db.session.commit()
    
    # Log the action
    sys_log = SysLog(
        message=f'Restriction added: {r_type} = {r_value}',
        restriction_id=restriction.restriction_id,
        user_id=current_user.user_id
    )
    db.session.add(sys_log)
    db.session.commit()
    
    return jsonify({'success': True, 'restriction': restriction.to_dict()}), 201


@app.route('/api/restrictions/<int:restriction_id>', methods=['DELETE'])
@token_required
def delete_restriction(current_user, restriction_id):
    restriction = Restriction.query.get(restriction_id)
    if not restriction:
        return jsonify({'error': 'Restriction not found'}), 404
    
    db.session.delete(restriction)
    db.session.commit()
    
    return jsonify({'success': True})


# ==================== SIGNATURES ENDPOINTS ====================

@app.route('/api/signatures', methods=['GET'])
def get_signatures():
    signatures = Signature.query.all()
    return jsonify({'signatures': [s.to_dict() for s in signatures]})


@app.route('/api/signatures', methods=['POST'])
@token_required
def add_signature(current_user):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    sig_type = data.get('signature_type')
    sig_content = data.get('signature_content')
    
    if not all([sig_type, sig_content]):
        return jsonify({'error': 'Missing signature_type or signature_content'}), 400
    
    signature = Signature(signature_type=sig_type, signature_content=sig_content)
    db.session.add(signature)
    db.session.commit()
    
    return jsonify({'success': True, 'signature': signature.to_dict()}), 201


@app.route('/api/signatures/<int:signature_id>', methods=['PUT'])
@token_required
def update_signature(current_user, signature_id):
    signature = Signature.query.get(signature_id)
    if not signature:
        return jsonify({'error': 'Signature not found'}), 404
    
    data = request.get_json()
    if data.get('signature_type'):
        signature.signature_type = data['signature_type']
    if data.get('signature_content'):
        signature.signature_content = data['signature_content']
    
    db.session.commit()
    return jsonify({'success': True, 'signature': signature.to_dict()})


@app.route('/api/signatures/<int:signature_id>', methods=['DELETE'])
@token_required
def delete_signature(current_user, signature_id):
    signature = Signature.query.get(signature_id)
    if not signature:
        return jsonify({'error': 'Signature not found'}), 404
    
    db.session.delete(signature)
    db.session.commit()
    
    return jsonify({'success': True})


# ==================== AI MODELS ENDPOINTS ====================

@app.route('/api/models', methods=['GET'])
def get_models():
    models = Model.query.all()
    if not models:
        # Return static data if no models in DB
        return jsonify({'models': [
            {'model_id': 1, 'model_name': 'ZeroDay Deep Learning', 'weight': 70, 'description': 'Primary deep learning model (autoencoder) for zero-day attack detection'},
            {'model_id': 2, 'model_name': 'Signature Engine', 'weight': 20, 'description': 'Regex-based pattern matching for known signatures'},
            {'model_id': 3, 'model_name': 'LLM Analysis', 'weight': 10, 'description': 'AI-powered attack explanation and patching'}
        ]})
    return jsonify({'models': [m.to_dict() for m in models]})


# ==================== REPORTS ENDPOINTS ====================

@app.route('/api/reports', methods=['GET'])
def get_reports():
    days = request.args.get('days', 7, type=int)
    if days not in [3, 7, 30]:
        days = 7
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    reports = PatchingReport.query.filter(
        PatchingReport.report_timestamp >= cutoff
    ).order_by(PatchingReport.report_timestamp.desc()).all()
    
    return jsonify({'reports': [r.to_dict() for r in reports]})


@app.route('/api/reports/<int:report_id>/download', methods=['GET'])
def download_report(report_id):
    report = PatchingReport.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    
    format_type = request.args.get('format', 'csv')
    
    if format_type == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Check if details is JSON
        try:
            details = json.loads(report.report_details)
            is_json = True
        except:
            is_json = False

        if is_json:
            writer.writerow(['Report ID', 'Attack Type', 'Root Cause', 'Mitigations', 'Virtual Patches', 'Vulnerability', 'Created At'])
            mitigations_str = "; ".join([f"[{m['category']}] {m['description']}" for m in details.get('mitigations', [])])
            patches_str = "; ".join([f"[{p['target']}] {p['rule']}" for p in details.get('virtual_patches', [])])
            
            writer.writerow([
                report.report_id,
                details.get('attack_type', 'Unknown'),
                details.get('root_cause', ''),
                mitigations_str,
                patches_str,
                report.waf_log.wlog_type if report.waf_log else 'Unknown',
                report.report_timestamp.isoformat()
            ])
        else:
            writer.writerow(['Report ID', 'Recommendation', 'Vulnerability', 'Created At'])
            writer.writerow([
                report.report_id,
                report.report_details,
                report.waf_log.wlog_type if report.waf_log else 'Unknown',
                report.report_timestamp.isoformat()
            ])
            
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=report_{report_id}.csv'}
        )
    
    elif format_type == 'pdf':
        try:
            from fpdf import FPDF
            pdf = FPDF()
            pdf.add_page()
            
            # Try to parse JSON
            try:
                details = json.loads(report.report_details)
                is_json = True
            except:
                is_json = False

            pdf.set_font('Arial', 'B', 18)
            pdf.set_text_color(20, 158, 140) # Teal accent
            pdf.cell(0, 15, f'Patching Report #{report.report_id}', ln=True, align='C')
            pdf.ln(5)

            pdf.set_font('Arial', '', 10)
            pdf.set_text_color(100, 100, 100)
            pdf.cell(0, 10, f'Generated on: {report.report_timestamp.strftime("%Y-%m-%d %H:%M:%S")}', ln=True)
            pdf.cell(0, 10, f'Severity: {report.waf_log.severity if report.waf_log else "Medium"}', ln=True)
            pdf.ln(5)

            if is_json:
                # Attack Summary
                pdf.set_font('Arial', 'B', 14)
                pdf.set_text_color(0, 0, 0)
                pdf.cell(0, 10, f'Attack Type: {details.get("attack_type", "Unknown")}', ln=True)
                
                pdf.set_font('Arial', 'B', 12)
                pdf.cell(0, 10, 'Root Cause Analysis:', ln=True)
                pdf.set_font('Arial', '', 11)
                pdf.multi_cell(0, 8, details.get('root_cause', 'No analysis available.'))
                pdf.ln(5)

                # Mitigations
                pdf.set_font('Arial', 'B', 12)
                pdf.cell(0, 10, 'Recommended Mitigations:', ln=True)
                pdf.set_font('Arial', '', 11)
                for m in details.get('mitigations', []):
                    pdf.multi_cell(0, 8, f"- [{m['category'].upper()}] {m['description']}")
                pdf.ln(5)

                # Virtual Patches
                if details.get('virtual_patches'):
                    pdf.set_font('Arial', 'B', 12)
                    pdf.cell(0, 10, 'Suggested Virtual Patches:', ln=True)
                    pdf.set_font('Arial', 'I', 10)
                    for p in details.get('virtual_patches', []):
                        pdf.multi_cell(0, 8, f"Target: {p['target']} | Rule: {p['rule']}")
            else:
                pdf.set_font('Arial', 'B', 12)
                pdf.cell(0, 10, 'Recommendation Details:', ln=True)
                pdf.set_font('Arial', '', 11)
                pdf.multi_cell(0, 10, report.report_details)
            
            pdf_output = pdf.output(dest='S').encode('latin-1', 'replace')
            return Response(
                pdf_output,
                mimetype='application/pdf',
                headers={'Content-Disposition': f'attachment; filename=report_{report_id}.pdf'}
            )
        except Exception as e:
            return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500
    
    return jsonify({'error': 'Invalid format. Use csv or pdf'}), 400


# ==================== SYSLOGS ENDPOINTS ====================

@app.route('/api/syslogs', methods=['GET'])
def get_syslogs():
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    logs = SysLog.query.order_by(SysLog.slog_timestamp.desc()).offset(offset).limit(limit).all()
    total = SysLog.query.count()
    
    return jsonify({'logs': [l.to_dict() for l in logs], 'total': total})


# ==================== USER PROFILES ENDPOINTS ====================

@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    profiles = SuspiciousUserProfile.query.order_by(SuspiciousUserProfile.created_at.desc()).all()
    return jsonify({'profiles': [p.to_dict() for p in profiles]})


@app.route('/api/profiles', methods=['POST'])
@token_required
def add_profile(current_user):
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    sus_username = data.get('sus_username')
    if not sus_username:
        return jsonify({'error': 'Missing sus_username'}), 400
    
    profile = SuspiciousUserProfile(
        sus_username=sus_username,
        pc_number=data.get('pc_number'),
        ip_address=data.get('ip_address'),
        mac_address=data.get('mac_address'),
        session_cookie=data.get('session_cookie'),
        suspicion_level=data.get('suspicion_level', 'Low')
    )
    db.session.add(profile)
    db.session.commit()
    
    return jsonify({'success': True, 'profile': profile.to_dict()}), 201


@app.route('/api/profiles/<int:sus_user_id>', methods=['PUT'])
@token_required
def update_profile(current_user, sus_user_id):
    profile = SuspiciousUserProfile.query.get(sus_user_id)
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404
    
    data = request.get_json()
    for field in ['sus_username', 'pc_number', 'ip_address', 'mac_address', 'session_cookie', 'suspicion_level']:
        if field in data:
            setattr(profile, field, data[field])
    
    db.session.commit()
    return jsonify({'success': True, 'profile': profile.to_dict()})


@app.route('/api/profiles/<int:sus_user_id>', methods=['DELETE'])
@token_required
def delete_profile(current_user, sus_user_id):
    profile = SuspiciousUserProfile.query.get(sus_user_id)
    if not profile:
        return jsonify({'error': 'Profile not found'}), 404
    
    db.session.delete(profile)
    db.session.commit()
    
    return jsonify({'success': True})


# ==================== LOG INGESTION (from Proxy) ====================

@app.route('/api/ingest_log', methods=['POST'])
def ingest_log():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Create WAF Log
    waf_log = WAFLog(
        intercepted_req=data.get('url', '') + ' ' + data.get('body', ''),
        wlog_type=data.get('reason', 'Unknown'),
        severity=data.get('severity', 'Medium'),
        detection_source=data.get('detection_source', 'WAF')
    )
    db.session.add(waf_log)
    db.session.commit()
    
    # Create Alert if blocked/alerted
    verdict = data.get('verdict')
    if verdict in ['blocked', 'alert']:
        alert = Alert(
            alert_type=data.get('reason', 'Unknown'),
            status='open',
            wlog_id=waf_log.wlog_id
        )
        db.session.add(alert)
        db.session.commit()
    
    # Add System Log for activity
    sys_log = SysLog(
        message=f"Ingested {waf_log.severity} severity WAF log: {waf_log.wlog_type}"
    )
    db.session.add(sys_log)
    db.session.commit()
    
    return jsonify({'success': True, 'wlog_id': waf_log.wlog_id})


# ==================== THREAT LOOKUP ====================

@app.route('/api/threat/lookup', methods=['GET'])
def threat_lookup():
    t_type = request.args.get('type')
    value = request.args.get('value')
    
    if not all([t_type, value]):
        return jsonify({'error': 'Missing type or value'}), 400
    
    if t_type not in ['ip', 'hash', 'domain']:
        return jsonify({'error': 'Invalid type'}), 400
    
    # Check local database first
    local_match = Restriction.query.filter_by(
        restriction_type=t_type,
        restriction_description=value
    ).first()
    
    if local_match:
        return jsonify({
            'found_in_local_db': True,
            'restriction': local_match.to_dict(),
            'external_lookup': False
        })
    
    # Query external APIs
    external_results = {}
    
    if t_type == 'ip':
        # VirusTotal
        cached = get_cached_data('virustotal', t_type, value)
        if cached:
            external_results['virustotal'] = cached
        else:
            allowed, wait_time = vt_limiter.allow()
            if allowed and VT_API_KEY:
                try:
                    resp = requests.get(
                        f'https://www.virustotal.com/api/v3/ip_addresses/{value}',
                        headers={'x-apikey': VT_API_KEY},
                        timeout=TIMEOUT
                    )
                    if resp.status_code == 200:
                        external_results['virustotal'] = resp.json()
                        set_cached_data('virustotal', t_type, value, resp.json())
                except:
                    pass
    
    return jsonify({
        'found_in_local_db': False,
        'external_lookup': True,
        'results': external_results
    })


# ==================== EXISTING TI ENDPOINTS ====================

def get_cached_data(provider, type_, value):
    key = (provider, type_, value)
    if key in CACHE:
        timestamp, data = CACHE[key]
        if time.time() - timestamp < CACHE_TTL:
            return data
        del CACHE[key]
    return None

def set_cached_data(provider, type_, value, data):
    key = (provider, type_, value)
    CACHE[key] = (time.time(), data)

def get_feed_cache(provider, type_, value):
    key = (provider, type_, value)
    if key in FEED_CACHE:
        timestamp, data, ttl = FEED_CACHE[key]
        if time.time() - timestamp < ttl:
            return data
    return None

def set_feed_cache(provider, type_, value, data, ttl):
    key = (provider, type_, value)
    FEED_CACHE[key] = (time.time(), data, ttl)

def get_patch_cache(key):
    if key in PATCH_CACHE:
        timestamp, data = PATCH_CACHE[key]
        if time.time() - timestamp < PATCH_CACHE_TTL:
            return data
        del PATCH_CACHE[key]
    return None

def set_patch_cache(key, data):
    PATCH_CACHE[key] = (time.time(), data)


@app.route('/api/ti/virustotal', methods=['GET'])
def virustotal():
    ti_type = request.args.get('type')
    value = request.args.get('value')
    
    if not all([ti_type, value]):
        return jsonify({'error': 'Missing type or value'}), 400

    if not VT_API_KEY:
        return jsonify({'error': 'Missing VirusTotal API Key'}), 500

    cached = get_cached_data('virustotal', ti_type, value)
    if cached:
        return jsonify(cached)

    allowed, wait_time = vt_limiter.allow()
    if not allowed:
        return jsonify({'error': 'Rate limit exceeded', 'retry_after': round(wait_time, 1)}), 429

    endpoint_map = {'ip': 'ip_addresses', 'domain': 'domains', 'hash': 'files'}
    if ti_type not in endpoint_map:
        return jsonify({'error': 'Invalid type'}), 400

    try:
        resp = requests.get(
            f'https://www.virustotal.com/api/v3/{endpoint_map[ti_type]}/{value}',
            headers={'x-apikey': VT_API_KEY},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 404:
            result = {'provider': 'virustotal', 'type': ti_type, 'value': value, 'risk': 'unknown', 'summary': 'Not found'}
            set_cached_data('virustotal', ti_type, value, result)
            return jsonify(result)
        
        resp.raise_for_status()
        data = resp.json()
        
        attrs = data.get('data', {}).get('attributes', {})
        stats = attrs.get('last_analysis_stats', {})
        malicious = stats.get('malicious', 0)
        
        risk = 'clean'
        if malicious > 2:
            risk = 'high'
        elif malicious > 0:
            risk = 'medium'
        
        result = {
            'provider': 'virustotal',
            'type': ti_type,
            'value': value,
            'risk': risk,
            'summary': f'Malicious: {malicious}',
            'raw': data
        }
        set_cached_data('virustotal', ti_type, value, result)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/ti/otx', methods=['GET'])
def otx():
    ti_type = request.args.get('type')
    value = request.args.get('value')
    
    if not all([ti_type, value]):
        return jsonify({'error': 'Missing type or value'}), 400

    if not OTX_API_KEY:
        return jsonify({'error': 'Missing OTX API Key'}), 500

    cached = get_cached_data('otx', ti_type, value)
    if cached:
        return jsonify(cached)

    endpoint_map = {'ip': 'IPv4', 'domain': 'domain', 'hash': 'file'}
    if ti_type not in endpoint_map:
        return jsonify({'error': 'Invalid type'}), 400

    try:
        resp = requests.get(
            f'https://otx.alienvault.com/api/v1/indicators/{endpoint_map[ti_type]}/{value}/general',
            headers={'X-OTX-API-KEY': OTX_API_KEY},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 404:
            result = {'provider': 'otx', 'type': ti_type, 'value': value, 'risk': 'unknown', 'summary': 'Not found'}
            set_cached_data('otx', ti_type, value, result)
            return jsonify(result)
        
        resp.raise_for_status()
        data = resp.json()
        pulse_count = data.get('pulse_info', {}).get('count', 0)
        
        risk = 'clean' if pulse_count == 0 else ('high' if pulse_count >= 5 else 'medium')
        
        result = {
            'provider': 'otx',
            'type': ti_type,
            'value': value,
            'risk': risk,
            'summary': f'Found in {pulse_count} pulses',
            'raw': data
        }
        set_cached_data('otx', ti_type, value, result)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/ti/abuseipdb', methods=['GET'])
def abuseipdb():
    value = request.args.get('value')
    if not value:
        return jsonify({'error': 'Missing value'}), 400

    if not ABUSEIPDB_API_KEY:
        return jsonify({'error': 'Missing AbuseIPDB API Key'}), 500

    cached = get_cached_data('abuseipdb', 'ip', value)
    if cached:
        return jsonify(cached)

    allowed, wait_time = abuse_limiter.allow()
    if not allowed:
        return jsonify({'error': 'Rate limit exceeded', 'retry_after': int(wait_time)}), 429

    try:
        resp = requests.get(
            'https://api.abuseipdb.com/api/v2/check',
            headers={'Key': ABUSEIPDB_API_KEY, 'Accept': 'application/json'},
            params={'ipAddress': value, 'maxAgeInDays': '90'},
            timeout=TIMEOUT
        )
        
        if resp.status_code == 422:
            return jsonify({'error': 'Invalid IP address'}), 400
        
        resp.raise_for_status()
        data = resp.json()
        
        score = data.get('data', {}).get('abuseConfidenceScore', 0)
        risk = 'clean'
        if score >= 75:
            risk = 'high'
        elif score >= 25:
            risk = 'medium'
        elif score > 0:
            risk = 'low'
        
        result = {
            'provider': 'abuseipdb',
            'type': 'ip',
            'value': value,
            'risk': risk,
            'summary': f'Score: {score}%',
            'raw': data
        }
        set_cached_data('abuseipdb', 'ip', value, result)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/ti/feed/abuseipdb', methods=['GET'])
def feed_abuseipdb():
    if not ABUSEIPDB_API_KEY:
        return jsonify({'error': 'Missing AbuseIPDB API Key'}), 500

    cached = get_feed_cache('abuseipdb', 'feed', 'blacklist')
    if cached:
        return jsonify(cached)

    try:
        resp = requests.get(
            'https://api.abuseipdb.com/api/v2/blacklist',
            headers={'Key': ABUSEIPDB_API_KEY, 'Accept': 'application/json'},
            params={'limit': '10', 'confidenceMinimum': '90'},
            timeout=10
        )
        resp.raise_for_status()
        
        normalized = [
            {'ip': item.get('ipAddress'), 'score': item.get('abuseConfidenceScore'), 'country': item.get('countryCode')}
            for item in resp.json().get('data', [])
        ]
        result = {'provider': 'abuseipdb', 'data': normalized}
        set_feed_cache('abuseipdb', 'feed', 'blacklist', result, FEED_CACHE_TTL_ABUSE)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/ti/feed/otx', methods=['GET'])
def feed_otx():
    if not OTX_API_KEY:
        return jsonify({'error': 'Missing OTX API Key'}), 500

    cached = get_feed_cache('otx', 'feed', 'pulses')
    if cached:
        return jsonify(cached)

    try:
        resp = requests.get(
            'https://otx.alienvault.com/api/v1/pulses/subscribed',
            headers={'X-OTX-API-KEY': OTX_API_KEY},
            params={'limit': 10},
            timeout=10
        )
        resp.raise_for_status()
        
        normalized = [
            {
                'name': item.get('name'), 
                'id': item.get('id'), 
                'created': item.get('created'), 
                'author': item.get('author_name'),
                'tags': item.get('tags', [])
            }
            for item in resp.json().get('results', [])
        ]
        result = {'provider': 'otx', 'data': normalized}
        set_feed_cache('otx', 'feed', 'pulses', result, FEED_CACHE_TTL_OTX)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/patch/recommend', methods=['POST'])
def recommend_patch():
    allowed, wait_time = patch_limiter.allow()
    if not allowed:
        return jsonify({'error': 'Rate limit exceeded', 'retry_after': int(wait_time)}), 429

    data = request.get_json()
    if not data or 'attack_description' not in data:
        return jsonify({'error': 'Missing attack_description'}), 400

    description = data['attack_description']
    context = data.get('context', {})
    wlog_id = data.get('wlog_id')

    desc_hash = hashlib.sha256(description.encode()).hexdigest()
    cached = get_patch_cache(desc_hash)
    if cached:
        return jsonify({**cached, '_cached': True})

    try:
        print(f"[DEBUG] Analyzing attack for wlog_id: {wlog_id}")
        result = llama_service.analyze_attack(description, context)
        if 'error' in result:
            print(f"[DEBUG] AI Analysis failed: {result['error']}")
            return jsonify(result), 500
        
        set_patch_cache(desc_hash, result)
        
        # Store as patching report with FULL JSON details
        print(f"[DEBUG] Saving report to DB for wlog_id: {wlog_id}")
        report = PatchingReport(
            report_details=json.dumps(result),
            wlog_id=wlog_id
        )
        db.session.add(report)
        db.session.commit()
        print(f"[DEBUG] Report saved with ID: {report.report_id}")
        
        return jsonify({**result, '_cached': False})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== DATABASE ADMIN ENDPOINTS ====================

# Table name to model mapping
TABLE_MODELS = {
    'user': User,
    'waf_log': WAFLog,
    'alert': Alert,
    'restriction': Restriction,
    'signature': Signature,
    'model': Model,
    'patching_report': PatchingReport,
    'suspicious_user_profile': SuspiciousUserProfile,
    'whitelisted_request': WhiteListedRequest,
    'sys_log': SysLog
}

# Primary key field mapping
TABLE_PK = {
    'user': 'user_id',
    'waf_log': 'wlog_id',
    'alert': 'alert_id',
    'restriction': 'restriction_id',
    'signature': 'signature_id',
    'model': 'model_id',
    'patching_report': 'report_id',
    'suspicious_user_profile': 'sus_user_id',
    'whitelisted_request': 'wl_id',
    'sys_log': 'slog_id'
}


def admin_required(f):
    """Decorator to require admin role"""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(current_user, *args, **kwargs)
    return decorated


@app.route('/api/db/<table_name>', methods=['GET'])
@token_required
@admin_required
def db_list_records(current_user, table_name):
    """List all records from a table"""
    if table_name not in TABLE_MODELS:
        return jsonify({'error': 'Invalid table name'}), 400
    
    model = TABLE_MODELS[table_name]
    records = model.query.limit(500).all()
    
    return jsonify({'records': [record_to_dict(r, table_name) for r in records]})


@app.route('/api/db/<table_name>', methods=['POST'])
@token_required
@admin_required
def db_create_record(current_user, table_name):
    """Create a new record"""
    if table_name not in TABLE_MODELS:
        return jsonify({'error': 'Invalid table name'}), 400
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    model = TABLE_MODELS[table_name]
    
    try:
        # Special handling for User (password hashing)
        if table_name == 'user':
            record = User(
                username=data.get('username'),
                email=data.get('email'),
                role=data.get('role', 'user')
            )
            if data.get('password'):
                record.set_password(data['password'])
        else:
            record = model(**data)
        
        db.session.add(record)
        db.session.commit()
        
        # Log the action
        sys_log = SysLog(
            message=f'Admin {current_user.username} created {table_name} record',
            user_id=current_user.user_id
        )
        db.session.add(sys_log)
        db.session.commit()
        
        return jsonify({'success': True, 'record': record_to_dict(record, table_name)}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/db/<table_name>/<int:record_id>', methods=['PUT'])
@token_required
@admin_required
def db_update_record(current_user, table_name, record_id):
    """Update a record"""
    if table_name not in TABLE_MODELS:
        return jsonify({'error': 'Invalid table name'}), 400
    
    model = TABLE_MODELS[table_name]
    pk_field = TABLE_PK[table_name]
    
    record = model.query.get(record_id)
    if not record:
        return jsonify({'error': 'Record not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    try:
        # Special handling for User (password hashing)
        if table_name == 'user':
            if data.get('username'):
                record.username = data['username']
            if data.get('email'):
                record.email = data['email']
            if data.get('role'):
                record.role = data['role']
            if data.get('password'):
                record.set_password(data['password'])
        else:
            for key, value in data.items():
                if hasattr(record, key) and key != pk_field:
                    setattr(record, key, value)
        
        db.session.commit()
        
        # Log the action
        sys_log = SysLog(
            message=f'Admin {current_user.username} updated {table_name} record {record_id}',
            user_id=current_user.user_id
        )
        db.session.add(sys_log)
        db.session.commit()
        
        return jsonify({'success': True, 'record': record_to_dict(record, table_name)})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


@app.route('/api/db/<table_name>/<int:record_id>', methods=['DELETE'])
@token_required
@admin_required
def db_delete_record(current_user, table_name, record_id):
    """Delete a record"""
    if table_name not in TABLE_MODELS:
        return jsonify({'error': 'Invalid table name'}), 400
    
    model = TABLE_MODELS[table_name]
    record = model.query.get(record_id)
    
    if not record:
        return jsonify({'error': 'Record not found'}), 404
    
    # Prevent deleting the current admin user
    if table_name == 'user' and record.user_id == current_user.user_id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    try:
        db.session.delete(record)
        db.session.commit()
        
        # Log the action
        sys_log = SysLog(
            message=f'Admin {current_user.username} deleted {table_name} record {record_id}',
            user_id=current_user.user_id
        )
        db.session.add(sys_log)
        db.session.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400


def record_to_dict(record, table_name):
    """Convert a record to a dictionary with all columns"""
    if hasattr(record, 'to_dict'):
        result = record.to_dict()
    else:
        result = {}
    
    # Add all column values explicitly
    for column in record.__table__.columns:
        val = getattr(record, column.name, None)
        if isinstance(val, datetime):
            result[column.name] = val.isoformat()
        else:
            result[column.name] = val
    
    return result


# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'hydra-backend', 'database': 'connected'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)

