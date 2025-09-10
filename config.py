"""
Config - Configuration settings and utility functions for the PDF Watcher Service

Authors:
    Nate Tallent - Original creator and primary developer
Created: 4/14/2025
Last Modified: 5/29/2025
"""

import os
import logging
import sys
import re
from logging.handlers import RotatingFileHandler
from typing import Dict, List, Union, Optional

def setup_logging(log_file: str) -> None:
    """Configure logging with console and rotating file handlers."""
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    log_format = logging.Formatter(
        '%(asctime)s [%(levelname)s] [PID:%(process)d] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)
    logging.info("Console logging initialized")

    try:
        log_dir = os.path.dirname(log_file)
        os.makedirs(log_dir, exist_ok=True)
        logging.info("Ensured log directory exists")
        if not os.path.exists(log_file):
            with open(log_file, 'a') as f:
                pass
            os.chmod(log_file, 0o600)
            logging.info("Created new log file")
        handler = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=5)
        handler.setFormatter(log_format)
        handler.setLevel(logging.INFO)
        logger.addHandler(handler)
        handler.flush()
        logging.info("File logging initialized")
    except Exception as e:
        logging.error(f"Failed to initialize file logging: {e}. Continuing with console logging.")
        raise

def get_required_env_var(name: str, default: Optional[str] = None) -> str:
    """Retrieve an environment variable with optional default."""
    value = os.getenv(name, default)
    if value is None:
        logging.error(f"Environment variable {name} is not set and no default provided")
        raise ValueError(f"Environment variable {name} must be set")
    return value

def mask_path(path: str) -> str:
    """Mask user paths in log messages."""
    return re.sub(r'C:\\Users\\[^\\]+\\[^\'"]+', '[REDACTED_PATH]', path)

def mask_traceback(tb: str) -> str:
    """Mask sensitive paths and filenames in traceback."""
    tb_lines = tb.splitlines()
    masked_lines = []
    patterns_to_mask = [
        re.compile(pattern, re.IGNORECASE)
        for template in TEMPLATES.values()
        for pattern in [template["pattern"]]
    ]
    for line in tb_lines:
        line = re.sub(r'C:\\Users\\[^\\]+\\[^\'"]+', '[REDACTED_PATH]', line)
        for pattern in patterns_to_mask:
            line = re.sub(pattern, '[REDACTED_FILE]', line)
        line = re.sub(r'[^\'"]+\.pdf', '[REDACTED_FILE]', line)
        masked_lines.append(line)
    return '\n'.join(masked_lines)

# Initialize logging
LOG_FILE = get_required_env_var("PDF_WATCHER_LOG_DIRECTORY")
setup_logging(LOG_FILE)
logging.info("Config module initialized, loading configuration")

# Core configuration
WATCH_DIR = get_required_env_var("PDF_WATCH_DIRECTORY")
TEMP_DIR = get_required_env_var("PDF_WATCHER_TEMP_DIR")
CSV_FILE = get_required_env_var("PDF_WATCHER_RESOURCE_LOG_DIRECTORY")
SMTP_SERVER = get_required_env_var("SMTP_DOMAIN")
SMTP_PORT = get_required_env_var("SMTP_PORT", "587")
try:
    SMTP_PORT = int(SMTP_PORT)
    if SMTP_PORT < 1 or SMTP_PORT > 65535:
        raise ValueError
except ValueError:
    logging.error("SMTP_PORT must be a valid port number")
    raise ValueError("SMTP_PORT must be a valid port number")
EMAIL_FROM = get_required_env_var("OPCON_ALERT_EMAIL")
ERROR_EMAIL_TO = get_required_env_var("ERROR_EMAIL_TO").split(",")
EMAIL_DOMAIN = get_required_env_var("EMAIL_DOMAIN", "LNFCU.COM")
PDF_RENAME_FORMAT = get_required_env_var("PDF_RENAME_FORMAT", "{base}_{timestamp}.pdf")
if "{base}" not in PDF_RENAME_FORMAT or "{timestamp}" not in PDF_RENAME_FORMAT:
    logging.error("PDF_RENAME_FORMAT must contain {base} and {timestamp} placeholders")
    raise ValueError("Invalid PDF_RENAME_FORMAT")

# Template configuration
TEMPLATES: Dict[str, Dict[str, Union[str, List[str]]]] = {
    "WireTransfer": {
        "pattern": get_required_env_var("WIRE_XFER_PDF_PATTERN"),
        "email_to": get_required_env_var("WIRE_XFER_EMAIL_TO").split(","),
        "subject_template": get_required_env_var("WIRE_XFER_SUBJECT"),
        "body": get_required_env_var("WIRE_XFER_BODY")
    },
    "DebitLimit": {
        "pattern": get_required_env_var("DC_LIMIT_PDF_PATTERN"),
        "email_to": get_required_env_var("DC_LIMIT_EMAIL_TO").split(","),
        "subject_template": get_required_env_var("DC_LIMIT_SUBJECT"),
        "body": get_required_env_var("DC_LIMIT_BODY")
    }
}

# Validate templates
for template_name, template in TEMPLATES.items():
    try:
        re.compile(template["pattern"])
    except re.error as e:
        logging.error(f"Invalid regex pattern for {template_name}: {e}")
        raise ValueError(f"Invalid regex pattern for {template_name}")

# Check for overlapping regex patterns
def check_template_conflicts():
    """Ensure no two templates can match the same filename."""
    for t1_name, t1 in TEMPLATES.items():
        for t2_name, t2 in TEMPLATES.items():
            if t1_name < t2_name:  # Avoid comparing same template or reverse pairs
                p1, p2 = re.compile(t1["pattern"]), re.compile(t2["pattern"])
                test_string = "sample_filename.pdf"
                if p1.search(test_string) and p2.search(test_string):
                    logging.warning(f"Potential regex overlap between {t1_name} and {t2_name}")
check_template_conflicts()

# Log loaded configuration (non-sensitive data only)
logging.info("Loaded configuration:")
logging.info(f"WATCH_DIR: {mask_path(WATCH_DIR)}")
logging.info(f"TEMP_DIR: {mask_path(TEMP_DIR)}")
logging.info(f"CSV_FILE: {mask_path(CSV_FILE)}")
logging.info(f"SMTP_PORT: {SMTP_PORT}")
logging.info(f"EMAIL_DOMAIN: {EMAIL_DOMAIN}")
logging.info(f"PDF_RENAME_FORMAT: {PDF_RENAME_FORMAT}")
logging.info("Template configurations loaded (details redacted for security)")
