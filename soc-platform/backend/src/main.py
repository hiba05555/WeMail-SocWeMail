from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from bson import ObjectId
from src.config import settings
from src.models import LogEvent
from src.detection import analyze
import motor.motor_asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="WeMail SOC Platform", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client["wemail-soc"]

def serialize(doc):
    if doc is None: return None
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId): result[k] = str(v)
        elif isinstance(v, datetime): result[k] = v.isoformat()
        elif isinstance(v, dict): result[k] = serialize(v)
        else: result[k] = v
    return result

@app.get("/health")
def health():
    return {"status": "healthy", "service": "soc-backend", "version": "1.0.0"}

@app.post("/api/logs")
async def receive_log(event: LogEvent, request: Request):
    event_dict = event.dict()
    if not event_dict.get("timestamp"): event_dict["timestamp"] = datetime.utcnow()
    if not event_dict.get("ip"): event_dict["ip"] = request.client.host
    await db.logs.insert_one(event_dict)
    logger.info(f"📥 Log: {event.service} → {event.event_type}")
    alerts = analyze(event_dict)
    for alert in alerts:
        alert["timestamp"] = datetime.utcnow()
        await db.alerts.insert_one(alert)
        logger.warning(f"🚨 [{alert['severity'].upper()}] {alert['rule']}: {alert['message']}")
        if alert["severity"] in ["critical", "high"]:
            await send_email_alert(alert)
    return {"status": "received", "alerts_triggered": len(alerts), "alerts": [serialize(a) for a in alerts]}

@app.get("/api/alerts")
async def get_alerts(limit: int = 50, severity: str = None):
    query = {"severity": severity} if severity else {}
    cursor = db.alerts.find(query).sort("timestamp", -1).limit(limit)
    alerts = await cursor.to_list(length=limit)
    return {"alerts": [serialize(a) for a in alerts], "total": len(alerts)}

@app.get("/api/logs")
async def get_logs(limit: int = 100, service: str = None):
    query = {"service": service} if service else {}
    cursor = db.logs.find(query).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    return {"logs": [serialize(l) for l in logs], "total": len(logs)}

@app.get("/api/stats")
async def get_stats():
    total_logs   = await db.logs.count_documents({})
    total_alerts = await db.alerts.count_documents({})
    critical     = await db.alerts.count_documents({"severity": "critical"})
    high         = await db.alerts.count_documents({"severity": "high"})
    pipeline     = [{"$group": {"_id": "$rule", "count": {"$sum": 1}}}]
    by_rule      = {doc["_id"]: doc["count"] async for doc in db.alerts.aggregate(pipeline)}
    return {"total_logs": total_logs, "total_alerts": total_alerts, "critical": critical, "high": high, "by_rule": by_rule}

async def send_email_alert(alert: dict):
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"WeMail SOC ALERT — {alert['rule'].upper()} [{alert['severity'].upper()}]"
        msg["From"]    = settings.ALERT_EMAIL_FROM
        msg["To"]      = settings.ALERT_EMAIL_TO
        color = {"critical":"#e96e6e","high":"#e9c96e","medium":"#6eaee9","low":"#6EE96E"}.get(alert["severity"],"#6EE96E")
        text = f"Rule: {alert['rule']}\nSeverity: {alert['severity']}\nIP: {alert.get('ip','?')}\nEmail: {alert.get('email','?')}\nMessage: {alert['message']}"
        html = f"""<div style="font-family:monospace;background:#0d0f0e;color:#d4d8d4;padding:24px;border-radius:8px">
<h2 style="color:{color}">WeMail SOC ALERT</h2>
<p><b style="color:{color}">{alert['rule'].upper()}</b> — {alert['severity'].upper()}</p>
<p>Service: {alert.get('service','?')}</p>
<p>IP: {alert.get('ip','?')}</p>
<p>Email: {alert.get('email','?')}</p>
<p>Time: {alert.get('timestamp','?')}</p>
<hr style="border-color:#333">
<p>{alert['message']}</p>
<p style="color:#444;font-size:11px">— WeMail SOC Platform</p></div>"""
        msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(settings.ALERT_EMAIL_FROM, settings.ALERT_EMAIL_PASSWORD)
            smtp.sendmail(settings.ALERT_EMAIL_FROM, settings.ALERT_EMAIL_TO, msg.as_string())
        logger.info(f"📧 Email sent: {alert['rule']} → {settings.ALERT_EMAIL_TO}")
    except Exception as e:
        logger.error(f"❌ Email failed: {e}")
