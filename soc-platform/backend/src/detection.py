from datetime import datetime, timedelta
from collections import defaultdict
import re

# Mémoire en RAM (simple, efficace)
_failed_logins   = defaultdict(list)  # ip -> [timestamps]
_registrations   = defaultdict(list)  # ip -> [timestamps]

# ── Patterns d'attaques ───────────────────────────────────────────
SQLI_PATTERNS = [
    r"('|--|;|\/\*|\*\/|xp_|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)",
]
XSS_PATTERNS = [
    r"(<script|javascript:|onerror=|onload=|<iframe|<img.*onerror)",
]
PATH_TRAVERSAL = [r"\.\./", r"\.\.\\", r"%2e%2e"]
CMD_INJECTION  = [r"(;|\||&&|\$\(|`)(ls|cat|rm|wget|curl|bash|sh)"]

def _matches(value: str, patterns: list) -> bool:
    if not value:
        return False
    for p in patterns:
        if re.search(p, str(value), re.IGNORECASE):
            return True
    return False

def _check_string_fields(details: dict, patterns: list) -> bool:
    for v in details.values():
        if isinstance(v, str) and _matches(v, patterns):
            return True
    return False

# ── Règles de détection ───────────────────────────────────────────
def analyze(event: dict) -> list:
    alerts = []
    now = datetime.utcnow()
    ip          = event.get("ip", "unknown")
    event_type  = event.get("event_type", "")
    details     = event.get("details", {}) or {}
    service     = event.get("service", "unknown")
    email       = event.get("email", "")

    # 1. Brute Force — 5 logins échoués en 60s
    if event_type == "login_failed":
        _failed_logins[ip].append(now)
        _failed_logins[ip] = [t for t in _failed_logins[ip] if now - t < timedelta(seconds=60)]
        if len(_failed_logins[ip]) >= 5:
            alerts.append({
                "rule": "brute_force",
                "severity": "critical",
                "message": f"Brute force détecté: {len(_failed_logins[ip])} tentatives en 60s depuis {ip}",
                "ip": ip, "email": email, "service": service
            })

    # 2. Mass Registration — 3+ comptes en 60s
    if event_type == "register":
        _registrations[ip].append(now)
        _registrations[ip] = [t for t in _registrations[ip] if now - t < timedelta(seconds=60)]
        if len(_registrations[ip]) >= 3:
            alerts.append({
                "rule": "mass_registration",
                "severity": "high",
                "message": f"Création massive de comptes: {len(_registrations[ip])} en 60s depuis {ip}",
                "ip": ip, "email": email, "service": service
            })

    # 3. SQL Injection
    if _check_string_fields(details, SQLI_PATTERNS):
        alerts.append({
            "rule": "sql_injection",
            "severity": "critical",
            "message": f"SQL Injection détectée depuis {ip} sur {service}",
            "ip": ip, "email": email, "service": service
        })

    # 4. XSS
    if _check_string_fields(details, XSS_PATTERNS):
        alerts.append({
            "rule": "xss",
            "severity": "high",
            "message": f"XSS détecté depuis {ip} sur {service}",
            "ip": ip, "email": email, "service": service
        })

    # 5. Path Traversal
    if _check_string_fields(details, PATH_TRAVERSAL):
        alerts.append({
            "rule": "path_traversal",
            "severity": "high",
            "message": f"Path Traversal détecté depuis {ip} sur {service}",
            "ip": ip, "email": email, "service": service
        })

    # 6. Command Injection
    if _check_string_fields(details, CMD_INJECTION):
        alerts.append({
            "rule": "cmd_injection",
            "severity": "critical",
            "message": f"Command Injection détectée depuis {ip} sur {service}",
            "ip": ip, "email": email, "service": service
        })

    # 7. Large File Upload > 50MB
    file_size = details.get("file_size", 0)
    if event_type == "file_upload" and file_size > 50 * 1024 * 1024:
        alerts.append({
            "rule": "large_file_upload",
            "severity": "medium",
            "message": f"Fichier suspect > 50MB uploadé par {email} depuis {ip}",
            "ip": ip, "email": email, "service": service
        })

    return alerts
