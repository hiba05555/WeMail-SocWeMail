import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.detection import analyze
from datetime import datetime

def test_brute_force():
    alerts = []
    for i in range(6):
        result = analyze({
            "service": "auth",
            "event_type": "login_failed",
            "ip": "192.168.1.100",
            "email": "test@wemail.io",
            "details": {},
            "timestamp": datetime.utcnow()
        })
        alerts.extend(result)
    bf = [a for a in alerts if a["rule"] == "brute_force"]
    assert len(bf) > 0, "Brute force not detected!"
    print("PASS: Brute force detection OK")

def test_sqli():
    result = analyze({
        "service": "email",
        "event_type": "email_sent",
        "ip": "10.0.0.1",
        "email": "test@wemail.io",
        "details": {"subject": "test OR 1=1 --"},
        "timestamp": datetime.utcnow()
    })
    sqli = [a for a in result if a["rule"] == "sql_injection"]
    assert len(sqli) > 0, "SQLi not detected!"
    print("PASS: SQL Injection detection OK")

def test_xss():
    result = analyze({
        "service": "email",
        "event_type": "email_sent",
        "ip": "10.0.0.1",
        "email": "test@wemail.io",
        "details": {"body": "<script>alert(1)</script>"},
        "timestamp": datetime.utcnow()
    })
    xss = [a for a in result if a["rule"] == "xss"]
    assert len(xss) > 0, "XSS not detected!"
    print("PASS: XSS detection OK")

if __name__ == "__main__":
    test_brute_force()
    test_sqli()
    test_xss()
    print("ALL TESTS PASSED")
