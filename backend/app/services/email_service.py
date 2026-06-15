import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from app.config import settings

logger = logging.getLogger("app.services.email")

class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, body: str) -> bool:
        """
        Sends an email using the SMTP settings from config.
        If SMTP fails, it falls back to logging the email for local development.
        """
        msg = MIMEMultipart()
        msg['From'] = settings.SMTP_FROM_EMAIL
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.starttls()
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
            logger.info(f"Email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
            logger.warning("--- [MOCK MAIL FALLBACK] ---")
            logger.warning(f"To: {to_email}")
            logger.warning(f"Subject: {subject}")
            logger.warning(f"Body: {body}")
            logger.warning("----------------------------")
            return False
