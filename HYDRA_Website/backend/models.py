# Database Models for Web-Hydra
# ERD-compliant SQLAlchemy models

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """User table with password hashing"""
    __tablename__ = 'user'
    
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False, default='user')
    
    # Constraints
    __table_args__ = (
        db.CheckConstraint(role.in_(['admin', 'user', 'analyst']), name='valid_role'),
        db.CheckConstraint(db.func.length(username) >= 3, name='min_username_length'),
        db.CheckConstraint(email.like('%@%.%'), name='valid_email_format'),
    )
    
    # Relationships
    whitelisted_requests = db.relationship('WhiteListedRequest', backref='user', lazy=True)
    sys_logs = db.relationship('SysLog', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'role': self.role
        }


class WAFLog(db.Model):
    """WAF Log entries"""
    __tablename__ = 'waf_log'
    
    wlog_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    intercepted_req = db.Column(db.Text, nullable=False)
    wlog_type = db.Column(db.String(50), nullable=False)
    wlog_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    severity = db.Column(db.String(20), nullable=False)
    detection_source = db.Column(db.String(50), nullable=False)
    
    # Relationships
    alerts = db.relationship('Alert', backref='waf_log', lazy=True)
    patching_reports = db.relationship('PatchingReport', backref='waf_log', lazy=True)
    whitelisted_requests = db.relationship('WhiteListedRequest', backref='waf_log', lazy=True)
    
    def to_dict(self):
        return {
            'wlog_id': self.wlog_id,
            'intercepted_req': self.intercepted_req,
            'wlog_type': self.wlog_type,
            'wlog_timestamp': self.wlog_timestamp.isoformat() if self.wlog_timestamp else None,
            'severity': self.severity,
            'detection_source': self.detection_source
        }


class Alert(db.Model):
    """Alerts generated from WAF logs"""
    __tablename__ = 'alert'
    
    alert_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    alert_type = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), nullable=False, default='open')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    wlog_id = db.Column(db.Integer, db.ForeignKey('waf_log.wlog_id'), nullable=True)
    
    def to_dict(self):
        return {
            'alert_id': self.alert_id,
            'alert_type': self.alert_type,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'wlog_id': self.wlog_id,
            'severity': self.waf_log.severity if self.waf_log else 'Medium',
            'source': self.waf_log.detection_source if self.waf_log else 'Unknown',
            'description': self.waf_log.intercepted_req[:200] if self.waf_log else ''
        }


class Restriction(db.Model):
    """Blocked IPs, Hashes, Domains"""
    __tablename__ = 'restriction'
    
    restriction_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    restriction_type = db.Column(db.String(20), nullable=False)  # ip, hash, domain
    restriction_description = db.Column(db.Text, nullable=False)  # The actual value
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    sys_logs = db.relationship('SysLog', backref='restriction', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.restriction_id,
            'type': self.restriction_type,
            'value': self.restriction_description,
            'reason': 'Blocked indicator',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Signature(db.Model):
    """WAF Signatures"""
    __tablename__ = 'signature'
    
    signature_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    signature_type = db.Column(db.String(50), nullable=False)
    signature_content = db.Column(db.Text, nullable=False)
    
    # Relationships
    sys_logs = db.relationship('SysLog', backref='signature', lazy=True)
    
    def to_dict(self):
        return {
            'signature_id': self.signature_id,
            'signature_type': self.signature_type,
            'signature_content': self.signature_content
        }


class Model(db.Model):
    """AI Model metadata"""
    __tablename__ = 'model'
    
    model_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    model_type = db.Column(db.String(100), nullable=False)
    model_description = db.Column(db.Text, nullable=True)
    model_threshold = db.Column(db.Float, nullable=False, default=0.5)
    
    # Relationships
    sys_logs = db.relationship('SysLog', backref='model', lazy=True)
    
    def to_dict(self):
        return {
            'model_id': self.model_id,
            'model_name': self.model_type,
            'weight': self.model_threshold * 100,  # as percentage
            'description': self.model_description
        }


class PatchingReport(db.Model):
    """Patching recommendation reports"""
    __tablename__ = 'patching_report'
    
    report_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    report_details = db.Column(db.Text, nullable=False)
    report_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    wlog_id = db.Column(db.Integer, db.ForeignKey('waf_log.wlog_id'), nullable=True)
    
    # Relationships
    sys_logs = db.relationship('SysLog', backref='patching_report', lazy=True)
    
    def to_dict(self):
        return {
            'report_id': self.report_id,
            'recommendation_text': self.report_details,
            'related_vulnerability': self.waf_log.wlog_type if self.waf_log else 'Unknown',
            'created_at': self.report_timestamp.isoformat() if self.report_timestamp else None
        }


class SuspiciousUserProfile(db.Model):
    """Suspicious user behavior profiles"""
    __tablename__ = 'suspicious_user_profile'
    
    sus_user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sus_username = db.Column(db.String(100), nullable=False)
    pc_number = db.Column(db.String(50), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    mac_address = db.Column(db.String(17), nullable=True)
    session_cookie = db.Column(db.Text, nullable=True)
    suspicion_level = db.Column(db.String(20), nullable=False, default='Low')
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    sys_logs = db.relationship('SysLog', backref='suspicious_user', lazy=True)
    
    def to_dict(self):
        return {
            'sus_user_id': self.sus_user_id,
            'sus_username': self.sus_username,
            'pc_number': self.pc_number,
            'ip_address': self.ip_address,
            'mac_address': self.mac_address,
            'session_cookie': self.session_cookie,
            'suspicion_level': self.suspicion_level,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class WhiteListedRequest(db.Model):
    """WhiteListed requests"""
    __tablename__ = 'whitelisted_request'
    
    wl_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    wlog_id = db.Column(db.Integer, db.ForeignKey('waf_log.wlog_id'), nullable=True)
    reason = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=True)
    made_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    sys_logs = db.relationship('SysLog', backref='whitelisted_request', lazy=True)
    
    def to_dict(self):
        return {
            'wl_id': self.wl_id,
            'wlog_id': self.wlog_id,
            'reason': self.reason,
            'user_id': self.user_id,
            'made_at': self.made_at.isoformat() if self.made_at else None
        }


class SysLog(db.Model):
    """System logs - central logging table"""
    __tablename__ = 'sys_log'
    
    slog_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    message = db.Column(db.Text, nullable=False)
    slog_timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Foreign Keys
    restriction_id = db.Column(db.Integer, db.ForeignKey('restriction.restriction_id'), nullable=True)
    model_id = db.Column(db.Integer, db.ForeignKey('model.model_id'), nullable=True)
    signature_id = db.Column(db.Integer, db.ForeignKey('signature.signature_id'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.user_id'), nullable=True)
    sus_user_id = db.Column(db.Integer, db.ForeignKey('suspicious_user_profile.sus_user_id'), nullable=True)
    report_id = db.Column(db.Integer, db.ForeignKey('patching_report.report_id'), nullable=True)
    wl_id = db.Column(db.Integer, db.ForeignKey('whitelisted_request.wl_id'), nullable=True)
    
    def to_dict(self):
        return {
            'log_id': self.slog_id,
            'source': self._get_source(),
            'message': self.message,
            'severity': 'Info',
            'timestamp': self.slog_timestamp.isoformat() if self.slog_timestamp else None
        }
    
    def _get_source(self):
        if self.restriction_id:
            return 'Restriction'
        elif self.model_id:
            return 'Model'
        elif self.signature_id:
            return 'Signature'
        elif self.user_id:
            return 'User'
        elif self.sus_user_id:
            return 'SuspiciousUser'
        elif self.report_id:
            return 'Report'
        elif self.wl_id:
            return 'Whitelist'
        return 'System'


def init_db(app):
    """Initialize database with app context"""
    db.init_app(app)
    with app.app_context():
        db.create_all()
