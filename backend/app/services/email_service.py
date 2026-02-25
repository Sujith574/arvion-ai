"""
Email Service — OTP delivery via Gmail SMTP
"""
import smtplib
import logging
import random
import string
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def send_otp_email(to_email: str, otp: str, purpose: str = "signup") -> bool:
    """Send OTP email via Gmail SMTP. Returns True if successful."""
    if not settings.SMTP_FROM_EMAIL or not settings.SMTP_APP_PASSWORD:
        logger.error("[Email] SMTP credentials not configured")
        return False

    if purpose == "reset":
        subject = "Reset Your Password – Arvix AI"
        heading = "Reset Your Password"
        body_text = "We received a request to reset your password."
        action_text = "Use the OTP below to reset your password."
        footer_note = "If you did not request this, you can safely ignore this email."
    else:
        subject = "Verify Your Email – Arvix AI"
        heading = "Verify Your Email"
        body_text = "Welcome to Arvix AI! Please verify your email address to activate your account."
        action_text = "Use the OTP below to verify your email."
        footer_note = "If you did not create this account, you can ignore this email."

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;background:#f4f6fa;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Arvix AI</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px;">Intelligent University Assistant</p>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">{heading}</h2>
      <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">{body_text}</p>
      <p style="margin:0 0 16px;color:#374151;font-size:14px;font-weight:600;">{action_text}</p>
      <!-- OTP Box -->
      <div style="background:#f5f3ff;border:2px dashed #3b82f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
        <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#2563eb;font-family:'Courier New',monospace;">{otp}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
        This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.<br>
        {footer_note}
      </p>
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© 2026 Arvix AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
"""

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Arvix AI <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.SMTP_FROM_EMAIL, settings.SMTP_APP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, to_email, msg.as_string())

        logger.info(f"[Email] OTP sent to {to_email} for purpose={purpose}")
        return True
    except Exception as e:
        logger.error(f"[Email] Failed to send OTP to {to_email}: {e}")
        return False
