# HYDRA Database Entity Relationship Diagram

This document contains the ERD for the HYDRA WAF database schema.

## Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ WhiteListedRequest : "creates"
    User ||--o{ SysLog : "generates"
    WAFLog ||--o{ Alert : "triggers"
    WAFLog ||--o{ WhiteListedRequest : "referenced_by"
    WAFLog ||--o{ PatchingReport : "has"

    User {
        int user_id PK
        string username UK
        string password_hash
        string email UK
        string role "admin|user|analyst"
    }

    WAFLog {
        int wlog_id PK
        text intercepted_req
        string wlog_type
        string severity "Low|Medium|High|Critical"
        string detection_source
        datetime wlog_timestamp
    }

    Alert {
        int alert_id PK
        int wlog_id FK
        string alert_type
        string severity "Low|Medium|High|Critical"
        text description
        string status "open|checked|resolved"
        string source
        datetime created_at
        datetime resolved_at
    }

    Restriction {
        int restriction_id PK
        string restriction_type "ip|hash|domain"
        text restriction_description
        datetime created_at
    }

    Signature {
        int signature_id PK
        string signature_type
        text signature_content
    }

    Model {
        int model_id PK
        string model_type
        float model_threshold
        text model_description
    }

    PatchingReport {
        int report_id PK
        int wlog_id FK
        text report_details
        datetime report_timestamp
    }

    SuspiciousUserProfile {
        int sus_user_id PK
        string sus_username
        string pc_number
        string ip_address
        string mac_address
        text session_cookie
        string suspicion_level "Low|Medium|High|Critical"
        datetime created_at
    }

    WhiteListedRequest {
        int wl_id PK
        int wlog_id FK
        text reason
        int user_id FK
        datetime made_at
    }

    SysLog {
        int slog_id PK
        text message
        datetime slog_timestamp
        int user_id FK
    }
```

## Table Descriptions

### User
Stores system users with role-based access control (admin, user, analyst).

### WAFLog
Records all intercepted web requests with classification and severity information.

### Alert
Security alerts generated from WAF log entries requiring attention.

### Restriction
Blocked entities (IPs, hashes, domains) that are denied access.

### Signature
Attack patterns used by the signature-based detection engine.

### Model
AI/ML model configurations and thresholds.

### PatchingReport
Recommended actions and patches generated for detected threats.

### SuspiciousUserProfile
Profiles of users exhibiting suspicious behavior patterns.

### WhiteListedRequest
Previously flagged requests that have been manually approved.

### SysLog
System activity and audit logs.
