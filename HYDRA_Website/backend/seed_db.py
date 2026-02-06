#!/usr/bin/env python3
"""
Seed script for Web-Hydra database
Run this to create initial admin user and sample data
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from models import db, User, WAFLog, Alert, Restriction, Signature, Model, PatchingReport, SuspiciousUserProfile, SysLog
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///hydra.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

def seed_database():
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if admin exists
        if User.query.filter_by(username='admin').first():
            print("Admin user already exists. Skipping user creation.")
        else:
            # Create admin user
            admin = User(
                username='admin',
                email='admin@webhydra.local',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            print("Created admin user (admin / admin123)")
        
        # Create sample models if not exist
        if Model.query.count() == 0:
            models = [
                Model(model_type='ZeroDay Deep Learning', model_description='Primary deep learning model (autoencoder) for zero-day attack detection', model_threshold=0.7),
                Model(model_type='Signature Engine', model_description='Regex-based pattern matching for known attack signatures', model_threshold=0.2),
                Model(model_type='LLM Analysis', model_description='AI-powered attack explanation and patching recommendations', model_threshold=0.1)
            ]
            for m in models:
                db.session.add(m)
            print("Created sample AI models")
        
        # Create sample restrictions if not exist
        if Restriction.query.count() == 0:
            restrictions = [
                Restriction(restriction_type='ip', restriction_description='192.168.1.100'),
                Restriction(restriction_type='domain', restriction_description='malicious-site.com'),
                Restriction(restriction_type='hash', restriction_description='e99a18c428cb38d5f260853678922e03')
            ]
            for r in restrictions:
                db.session.add(r)
            print("Created sample restrictions")
        
        # Create sample signatures if not exist
        if Signature.query.count() == 0:
            signatures = [
                Signature(signature_type='SQLi', signature_content="(?i)(union\\s+select|select\\s+.*\\s+from)"),
                Signature(signature_type='XSS', signature_content="(?i)(<script|javascript:|on\\w+=)"),
                Signature(signature_type='Command Injection', signature_content="(?i)(;\\s*(ls|cat|rm|wget|curl)|\\|\\s*(bash|sh))"),
            ]
            for s in signatures:
                db.session.add(s)
            print("Created sample signatures")
        
        # Create sample WAF logs and alerts if not exist
        if WAFLog.query.count() == 0:
            for i in range(5):
                waf_log = WAFLog(
                    intercepted_req=f"GET /api/users?id=1 OR 1=1 HTTP/1.1",
                    wlog_type='SQL Injection' if i % 2 == 0 else 'XSS',
                    wlog_timestamp=datetime.utcnow() - timedelta(hours=i),
                    severity=['Medium', 'High', 'Critical'][i % 3],
                    detection_source='Signature' if i % 2 == 0 else 'ML'
                )
                db.session.add(waf_log)
                db.session.flush()  # Get the ID
                
                alert = Alert(
                    alert_type=waf_log.wlog_type,
                    status='open',
                    wlog_id=waf_log.wlog_id
                )
                db.session.add(alert)
            print("Created sample WAF logs and alerts")
        
        # Create sample suspicious user profile if not exist
        if SuspiciousUserProfile.query.count() == 0:
            profile = SuspiciousUserProfile(
                sus_username='suspicious_user_1',
                pc_number='PC-001',
                ip_address='10.0.0.50',
                mac_address='AA:BB:CC:DD:EE:FF',
                session_cookie='sess_abc123xyz',
                suspicion_level='High'
            )
            db.session.add(profile)
            print("Created sample suspicious user profile")
        
        # Create sample patching report if not exist
        if PatchingReport.query.count() == 0:
            report = PatchingReport(
                report_details='Update input validation to use parameterized queries. Apply security patches for SQL injection vulnerabilities.',
                report_timestamp=datetime.utcnow()
            )
            db.session.add(report)
            print("Created sample patching report")
        
        # Create sample syslog entries
        if SysLog.query.count() == 0:
            for i in range(3):
                syslog = SysLog(
                    message=f'System started successfully - event {i+1}',
                    slog_timestamp=datetime.utcnow() - timedelta(minutes=i*10)
                )
                db.session.add(syslog)
            print("Created sample syslogs")
        
        db.session.commit()
        print("\n✓ Database seeded successfully!")
        print("  - Admin user: admin / admin123")
        print("  - Sample data created for all tables")

if __name__ == '__main__':
    seed_database()
