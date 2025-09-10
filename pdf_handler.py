"""
PDF Handler - Handler for processing new PDF files detected in the watch directory

Authors:
    Nate Tallent - Original creator and primary developer
    Claude (Anthropic) - AI assistant for enhancements and maintenance

Created: 4/14/2025
Last Modified: 5/29/2025
"""

import os
import time
import logging
import re
import traceback
import uuid
import shutil
import html
import tempfile
from datetime import datetime
from watchdog.events import FileSystemEventHandler
from queue import Queue, Empty, Full
from threading import Thread, Lock
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, List
from file_handler import copy_file_with_retries, is_pdf, validate_safe_path
from email_utils import send_email
from config import TEMPLATES, mask_traceback, mask_path, PDF_RENAME_FORMAT, ERROR_EMAIL_TO, WATCH_DIR
from xml_handler import find_companion_xml, get_user_email_from_xml

def mask_filename(filename: str) -> str:
    """Mask entire PDF filename, preserving only the extension."""
    if filename.lower().endswith(".pdf"):
        return "[REDACTED_FILE].pdf"
    return filename

class WirePDFHandler(FileSystemEventHandler):
    def __init__(self, temp_dir: str, email_from: str, smtp_server: str, smtp_port: int):
        self.temp_dir = temp_dir
        self.email_from = email_from
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.recent_filenames = {}
        self.event_queue = Queue(maxsize=100)  # Max queue size
        self.queue_lock = Lock()
        self.email_rate_limit = 60
        self.email_count = 0
        self.last_reset_time = time.time()
        self.processing_thread = Thread(target=self.process_queue, daemon=True)
        self.executor = ThreadPoolExecutor(max_workers=4)  # Parallel processing
        self.processing_times = []
        self.processing_thread.start()

    def cleanup_recent_filenames(self) -> None:
        """Remove filenames older than 1 hour."""
        current_time = time.time()
        self.recent_filenames = {
            fname: t for fname, t in self.recent_filenames.items()
            if current_time - t < 3600
        }

    def cleanup_temp_dir(self) -> None:
        """Clean up temporary directories with retries."""
        try:
            total, used, free = shutil.disk_usage(self.temp_dir)
            if free < 1 * 1024 * 1024 * 1024:
                send_email(
                    self.smtp_server, self.smtp_port, self.email_from, ERROR_EMAIL_TO,
                    "Low Disk Space Alert",
                    f"Free disk space on {mask_path(self.temp_dir)} is below 1 GB: {free / (1024 * 1024):.2f} MB",
                    use_ssl=(self.smtp_port == 465)
                )
            for subdir in os.listdir(self.temp_dir):
                subdir_path = os.path.join(self.temp_dir, subdir)
                if os.path.isdir(subdir_path):
                    for attempt in range(3):
                        try:
                            file_age = time.time() - os.path.getmtime(subdir_path)
                            shutil.rmtree(subdir_path, ignore_errors=False)
                            logging.info(f"Deleted temp subdir: {mask_path(subdir_path)}")
                            break
                        except Exception as e:
                            logging.warning(f"Attempt {attempt+1} failed to delete {mask_path(subdir_path)}: {e}")
                            time.sleep(1)
                    else:
                        logging.error(f"Failed to delete {mask_path(subdir_path)} after 3 attempts, age: {file_age/3600:.2f} hours")
        except Exception as e:
            tb = mask_traceback(traceback.format_exc())
            logging.error(f"Error during temp directory cleanup: {e}\n{tb}")

    def on_created(self, event) -> None:
        """Handle new file creation events."""
        if not event.is_directory and event.src_path.lower().endswith(".pdf"):
            logging.info(f"Detected new PDF event: {mask_filename(os.path.basename(event.src_path))}")
            with self.queue_lock:
                try:
                    self.event_queue.put_nowait(event)
                except Full:
                    send_email(
                        self.smtp_server, self.smtp_port, self.email_from, ERROR_EMAIL_TO,
                        "PDF Watcher Queue Full",
                        "Event queue is full, new events are being dropped.",
                        use_ssl=(self.smtp_port == 465)
                    )
                    logging.error("Event queue full, dropping event")

    def process_queue(self) -> None:
        """Process queued PDF events."""
        while True:
            try:
                with self.queue_lock:
                    if self.event_queue.qsize() > 50:
                        send_email(
                            self.smtp_server, self.smtp_port, self.email_from, ERROR_EMAIL_TO,
                            "PDF Watcher Queue Alert",
                            f"Queue size exceeded 50 items: {self.event_queue.qsize()}.",
                            use_ssl=(self.smtp_port == 465)
                        )
                event = self.event_queue.get(timeout=1.0)
                start_time = time.time()
                self.executor.submit(self.process_pdf_event, event)
                self.event_queue.task_done()
                processing_time = time.time() - start_time
                self.processing_times.append(processing_time)
                if len(self.processing_times) > 100:
                    self.processing_times.pop(0)
                avg_time = sum(self.processing_times) / len(self.processing_times) if self.processing_times else 0
                logging.info(f"Processed event in {processing_time:.2f}s, avg: {avg_time:.2f}s")
            except Empty:
                continue
            except Exception as e:
                tb = mask_traceback(traceback.format_exc())
                logging.error(f"Error in queue processing: {e}\n{tb}")

    def process_pdf_event(self, event) -> None:
        """Process a single PDF event."""
        original_path = event.src_path
        filename = os.path.basename(original_path)
        masked_filename = mask_filename(filename)
        current_time = time.time()

        if filename in self.recent_filenames:
            logging.info(f"Ignored recently processed file: {masked_filename}")
            return

        if current_time - self.last_reset_time >= 60:
            self.email_count = 0
            self.last_reset_time = current_time
        if self.email_count >= self.email_rate_limit:
            logging.warning(f"Email rate limit exceeded for {masked_filename}")
            return

        temp_subdir: Optional[str] = None
        try:
            logging.info(f"Processing a new PDF: {masked_filename}")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_name = os.path.splitext(filename)[0]
            new_name = PDF_RENAME_FORMAT.format(base=base_name, timestamp=timestamp)
            masked_new_name = mask_filename(new_name)

            # Validate path safety
            if not validate_safe_path(WATCH_DIR, original_path):
                logging.error(f"Path traversal attempt detected: {masked_filename}")
                return
                
            # Use secure temporary directory
            temp_subdir = tempfile.mkdtemp(dir=self.temp_dir, prefix='pdf_')
            os.chmod(temp_subdir, 0o700)  # Restrict to owner only
            logging.info(f"Created secure temp subfolder: {mask_path(temp_subdir)}")

            dest_path = os.path.join(temp_subdir, new_name)
            if copy_file_with_retries(original_path, dest_path):
                logging.info(f"Copied PDF to temp: {masked_new_name}")
            else:
                logging.error(f"Failed to copy file: {masked_new_name}")
                return

            # Try to copy companion XML file if it exists
            xml_dest_path = None
            xml_source = find_companion_xml(original_path)
            if xml_source:
                xml_filename = os.path.basename(xml_source)
                xml_dest_path = os.path.join(temp_subdir, xml_filename)
                if copy_file_with_retries(xml_source, xml_dest_path):
                    logging.info(f"Copied companion XML to temp: {mask_filename(xml_filename)}")
                    # Set restrictive permissions on XML file
                    os.chmod(xml_dest_path, 0o600)
                else:
                    logging.warning(f"Failed to copy XML file: {mask_filename(xml_filename)}")
                    xml_dest_path = None

            if not is_pdf(dest_path):
                logging.warning(f"Temp file is not a valid PDF, skipping: {masked_new_name}")
                return

            matches = []
            for template_name, template in TEMPLATES.items():
                pattern = re.compile(template["pattern"])
                if pattern.search(new_name):
                    matches.append((template_name, template))
            if len(matches) > 1:
                logging.warning(f"Multiple template matches for {masked_new_name}: {', '.join(m[0] for m in matches)}")
                return
            elif not matches:
                logging.warning(f"No matching template found for file: {masked_new_name}")
                return

            template_name, template = matches[0]
            match = re.search(template["pattern"], new_name)
            email_to = template["email_to"]
            # Sanitize regex groups before formatting
            sanitized_groups = tuple(html.escape(str(g)) for g in match.groups())
            subject = template["subject_template"].format(*sanitized_groups)
            body = template["body"]
            
            # Extract user email from XML if available
            cc_addrs = None
            if xml_dest_path:
                user_email = get_user_email_from_xml(dest_path)  # Use PDF path to find XML
                if user_email:
                    cc_addrs = [user_email]
                    logging.info("Extracted user email from XML for CC")
            MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
            if os.path.getsize(dest_path) > MAX_ATTACHMENT_SIZE:
                logging.warning(f"File {masked_new_name} exceeds attachment size limit")
                body += "\nFile too large to attach; please access it at [alternative location]."
                send_email(
                    self.smtp_server, self.smtp_port, self.email_from, email_to,
                    subject, body, use_ssl=(self.smtp_port == 465), cc_addrs=cc_addrs
                )
            else:
                send_email(
                    self.smtp_server, self.smtp_port, self.email_from, email_to,
                    subject, body, attachment=dest_path, use_ssl=(self.smtp_port == 465), cc_addrs=cc_addrs
                )
                logging.info(f"Email sent with attachment (template: {template_name}) for {masked_new_name}")
                self.recent_filenames[filename] = current_time
                self.email_count += 1
        except Exception as e:
            tb = mask_traceback(traceback.format_exc())
            logging.error(f"Error processing file {masked_filename}: {e}\n{tb}")
        finally:
            if temp_subdir and os.path.exists(temp_subdir):
                for attempt in range(3):
                    try:
                        shutil.rmtree(temp_subdir, ignore_errors=False)
                        logging.info(f"Successfully deleted temp subfolder: {mask_path(temp_subdir)}")
                        break
                    except Exception as e:
                        logging.warning(f"Attempt {attempt+1} failed to delete {mask_path(temp_subdir)}: {e}")
                        time.sleep(1)
                else:
                    logging.error(f"Failed to delete temp subfolder {mask_path(temp_subdir)} after 3 attempts")
