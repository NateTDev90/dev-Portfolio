"""
Email Utils - Utilities for sending emails with optional PDF attachments

Author:
    Nate Tallent - Original creator and primary developer
Created: 4/14/2025
Last Modified: 5/29/2025
"""

import smtplib
from email.message import EmailMessage
import os
import html
import logging
import time
from typing import Optional, List
from config import mask_path

def mask_email(email: str) -> str:
    """Mask email addresses for logging to prevent PII exposure."""
    local_part, domain = email.split('@')
    if len(local_part) <= 3:
        masked_local = '[REDACTED_EMAIL]'
    else:
        masked_local = local_part[:2] + '...' + local_part[-1]
    return f"{masked_local}@{domain}"

def send_email(
    smtp_server: str,
    smtp_port: int,
    from_addr: str,
    to_addrs: List[str],
    subject: str,
    body: str,
    attachment: Optional[str] = None,
    use_ssl: bool = False,
    is_html: bool = False,
    cc_addrs: Optional[List[str]] = None
) -> None:
    """Send an email with optional attachment."""
    # Sanitize inputs to prevent injection
    subject = html.escape(subject)
    body = html.escape(body) if not is_html else body

    msg = EmailMessage()
    msg["From"] = from_addr
    msg["To"] = ", ".join(to_addrs)
    if cc_addrs:
        msg["Cc"] = ", ".join(cc_addrs)
    msg["Subject"] = subject

    if is_html:
        msg.set_content(body, subtype="html")
    else:
        msg.set_content(body)

    if attachment:
        try:
            with open(attachment, "rb") as f:
                msg.add_attachment(
                    f.read(),
                    maintype="application",
                    subtype="pdf",
                    filename=os.path.basename(attachment)
                )
            logging.info(f"Attached {mask_path(attachment)} to email")
        except Exception as e:
            logging.error(f"Failed to attach {mask_path(attachment)}: {e}")
            return

    # Attempt to send email with retries
    masked_to_addrs = [mask_email(addr) for addr in to_addrs]
    masked_cc_addrs = [mask_email(addr) for addr in cc_addrs] if cc_addrs else []
    for attempt in range(3):
        try:
            if use_ssl:
                with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=10) as server:
                    server.send_message(msg)
            else:
                with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
                    server.starttls()
                    server.send_message(msg)
            if masked_cc_addrs:
                logging.info(f"Email sent to {', '.join(masked_to_addrs)} with CC to {', '.join(masked_cc_addrs)}")
            else:
                logging.info(f"Email sent to {', '.join(masked_to_addrs)}")
            return
        except Exception as e:
            logging.warning(f"Email send attempt {attempt+1} failed: {e}")
            time.sleep(2)
    logging.error("Failed to send email after 3 attempts")
