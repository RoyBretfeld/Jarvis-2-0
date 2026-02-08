import smtplib, os, sys, base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path

def send_alert(subject, body):
    # Try to load .env file manually if it exists
    env_path = Path(".env")
    if env_path.exists():
        try:
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    key, val = line.strip().split("=", 1)
                    key = key.strip()
                    val = val.strip().strip('"').strip("'")
                    if key and val:
                        os.environ[key] = val
        except Exception as e:
            print(f"⚠️  Failed to read .env file: {e}")

    # Lade Konfiguration aus Environment
    sender = os.getenv("RB_ALERT_SENDER")
    pw = os.getenv("RB_ALERT_PW")
    receiver = os.getenv("RB_ALERT_RECEIVER")
    
    # SMTP Server Config (Standard: Gmail, aber überschreibbar für web.de)
    smtp_server = os.getenv("RB_SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("RB_SMTP_PORT", "587"))

    if not all([sender, pw, receiver]):
        print("🚨 ALERT FAIL: Env Vars fehlen (RB_ALERT_SENDER/_PW/_RECEIVER)")
        return False
    
    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = receiver
    msg['Subject'] = f"🚨 RB ALERT: {subject}"
    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls() # Wichtig für web.de & gmail
        try:
            # Try standard login (might fail if PW has non-ascii chars)
            server.login(sender, pw)
        except UnicodeEncodeError:
            # Fallback: Manual AUTH PLAIN with UTF-8
            print("⚠️  Standard login encoding failed. Trying manual AUTH PLAIN (UTF-8)...")
            auth_str = f"\0{sender}\0{pw}"
            auth_b64 = base64.b64encode(auth_str.encode("utf-8")).decode("ascii")
            code, resp = server.docmd("AUTH", "PLAIN " + auth_b64)
            if code not in (235, 503): # 235 = success, 503 = already auth
                raise Exception(f"Manual AUTH PLAIN failed: {code} {resp}")
        server.sendmail(sender, receiver, msg.as_string())
        server.quit()
        print(f"✅ E-Mail Alert gesendet an {receiver}.")
        return True
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"🚨 ALERT FEHLGESCHLAGEN: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python alert.py 'Subject' 'Body'")
        sys.exit(1)
    send_alert(sys.argv[1], sys.argv[2])
