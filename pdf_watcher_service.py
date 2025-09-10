"""
PDF Watcher Service - Windows service to monitor a directory for new PDF files and process them

Authors:
    Nate Tallent - Original creator and primary developer
    Claude (Anthropic) - AI assistant for enhancements and maintenance

Created: 4/14/2025
Last Modified: 5/29/2025
"""

import sys
import time
import logging
import servicemanager
import win32event
import win32service
import win32serviceutil
from datetime import datetime
from watchdog.observers import Observer
import win32con
import win32api
import traceback
import os
import psutil
import csv
from typing import Optional
from config import WATCH_DIR, TEMP_DIR, SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO, CSV_FILE, mask_traceback, mask_path
from pdf_handler import WirePDFHandler
from email_utils import send_email

class ResourceMonitor:
    """Handles CPU and memory usage logging with alerts."""
    def __init__(self, csv_file: str):
        self.csv_file = csv_file
        self.cpu_threshold = 80.0  # CPU % threshold for alerts
        self.memory_threshold = 500.0  # Memory MB threshold for alerts
        self.last_alert_time = 0.0
        os.makedirs(os.path.dirname(csv_file), exist_ok=True)

    def log_resource_usage(self) -> None:
        """Log CPU and memory usage to CSV and check thresholds."""
        try:
            process = psutil.Process(os.getpid())
            cpu_percent = process.cpu_percent(interval=1.0)
            memory_info = process.memory_info()
            memory_usage_mb = memory_info.rss / (1024 * 1024)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # Check thresholds and send alert if exceeded (rate-limited to once per 5 min)
            current_time = time.time()
            if (cpu_percent > self.cpu_threshold or memory_usage_mb > self.memory_threshold) and \
               (current_time - self.last_alert_time >= 300):
                send_email(
                    SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO,
                    "Resource Usage Alert",
                    f"High resource usage detected: CPU {cpu_percent:.2f}%, Memory {memory_usage_mb:.2f} MB",
                    use_ssl=(SMTP_PORT == 465)
                )
                self.last_alert_time = current_time

            # Rotate CSV file based on size (5MB) or daily
            MAX_CSV_SIZE = 5 * 1024 * 1024
            if os.path.exists(self.csv_file) and (
                os.path.getsize(self.csv_file) > MAX_CSV_SIZE or
                datetime.now().day != datetime.fromtimestamp(os.path.getmtime(self.csv_file)).day
            ):
                os.rename(self.csv_file, f"{self.csv_file}.{datetime.now().strftime('%Y%m%d_%H%M%S')}.bak")
                self._create_csv()

            # Create CSV if it doesn't exist
            if not os.path.exists(self.csv_file):
                self._create_csv()

            # Append data
            with open(self.csv_file, 'a', newline='') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow([timestamp, cpu_percent, memory_usage_mb])
            logging.info(f"Resource usage logged: CPU {cpu_percent:.2f}%, Memory {memory_usage_mb:.2f} MB")
        except Exception as e:
            tb = mask_traceback(traceback.format_exc())
            logging.error(f"Failed to log resource usage: {e}\n{tb}")

    def _create_csv(self) -> None:
        """Create a new CSV file with headers."""
        with open(self.csv_file, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(["Timestamp", "CPU Percent", "Memory Usage (MB)"])
            os.chmod(self.csv_file, 0o600)
        logging.info("Created new CSV file")

class FileWatcher:
    """Manages directory monitoring and PDF event handling."""
    def __init__(self, watch_dir: str, temp_dir: str, email_from: str, smtp_server: str, smtp_port: int):
        self.watch_dir = watch_dir
        self.temp_dir = temp_dir
        self.email_from = email_from
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.observer: Optional[Observer] = None
        self.event_handler: Optional[WirePDFHandler] = None

    def start(self) -> bool:
        """Start the file watcher with retries."""
        if not self._validate_dirs():
            return False
        try:
            self.event_handler = WirePDFHandler(self.temp_dir, self.email_from, self.smtp_server, self.smtp_port)
            self.observer = Observer()
            self.observer.schedule(self.event_handler, self.watch_dir, recursive=False)
            retry_attempts = 3
            for attempt in range(retry_attempts):
                try:
                    self.observer.start()
                    logging.info("File watcher started successfully")
                    return True
                except Exception as e:
                    tb = mask_traceback(traceback.format_exc())
                    logging.error(f"Observer start attempt {attempt+1} failed: {e}\n{tb}")
                    time.sleep(10)
            logging.error("Failed to start observer after 3 attempts")
            send_email(
                SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO,
                "PDF Watcher Service Failed to Start",
                "The service couldn’t start watching the folder after 3 tries.",
                use_ssl=(SMTP_PORT == 465)
            )
            return False
        except Exception as e:
            tb = mask_traceback(traceback.format_exc())
            logging.error(f"Failed to initialize file watcher: {e}\n{tb}")
            return False

    def stop(self) -> None:
        """Stop the file watcher."""
        if self.observer:
            self.observer.stop()
            self.observer.join(timeout=5.0)
        logging.info("File watcher stopped")

    def is_alive(self) -> bool:
        """Check if the observer is running."""
        return self.observer.is_alive() if self.observer else False

    def cleanup(self) -> None:
        """Clean up temporary directories and recent filenames."""
        if self.event_handler:
            self.event_handler.cleanup_temp_dir()
            self.event_handler.cleanup_recent_filenames()

    def _validate_dirs(self) -> bool:
        """Validate watch and temp directories."""
        if not os.path.exists(self.watch_dir):
            logging.error("WATCH_DIR does not exist")
            return False
        if not os.access(self.watch_dir, os.R_OK):
            logging.error("WATCH_DIR is not readable")
            return False
        try:
            os.makedirs(self.temp_dir, exist_ok=True)
            if not os.access(self.temp_dir, os.W_OK):
                logging.error("Cannot write to base temp directory")
                return False
            logging.info("Base temp directory ready")
            return True
        except Exception as e:
            tb = mask_traceback(traceback.format_exc())
            logging.error(f"Failed to create base temp directory: {e}\n{tb}")
            return False

class ServiceManager(win32serviceutil.ServiceFramework):
    """Handles Windows service lifecycle."""
    _svc_name_ = "PDFWatcherService"
    _svc_display_name_ = "PDF Watcher Service"
    _svc_description_ = "Monitors a folder for PDFs and sends email notifications"

    def __init__(self, args):
        win32serviceutil.ServiceFramework.__init__(self, args)
        self.stop_event = win32event.CreateEvent(None, 0, 0, None)
        self.is_shutting_down = False
        win32api.SetConsoleCtrlHandler(self.on_shutdown, True)
        self.file_watcher = FileWatcher(WATCH_DIR, TEMP_DIR, EMAIL_FROM, SMTP_SERVER, SMTP_PORT)
        self.resource_monitor = ResourceMonitor(CSV_FILE)

    def on_shutdown(self, ctrl_type: int) -> bool:
        """Handle system shutdown or logoff events."""
        if ctrl_type == win32con.CTRL_SHUTDOWN_EVENT:
            logging.info("System shutdown detected")
            self.is_shutting_down = True
            stop_message = f"The PDF Watcher Service is stopping due to system shutdown at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}."
            send_email(
                SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO,
                "PDF Watcher Service Stopped (Shutdown)", stop_message,
                use_ssl=(SMTP_PORT == 465)
            )
            self.file_watcher.stop()
            win32event.SetEvent(self.stop_event)
            return True
        elif ctrl_type == win32con.CTRL_LOGOFF_EVENT:
            logging.info("User logoff detected, service will continue running")
            return False
        return False

    def SvcStop(self) -> None:
        """Handle service stop requests."""
        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
        logging.info("Service stop requested via SCM")
        stop_message = f"The PDF Watcher Service stopped at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}."
        send_email(
            SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO,
            "PDF Watcher Service Stopped", stop_message,
            use_ssl=(SMTP_PORT == 465)
        )
        win32event.SetEvent(self.stop_event)
        self.file_watcher.stop()
        self.ReportServiceStatus(win32service.SERVICE_STOPPED)

    def SvcDoRun(self) -> None:
        """Run the service."""
        servicemanager.LogMsg(
            servicemanager.EVENTLOG_INFORMATION_TYPE,
            servicemanager.PYS_SERVICE_STARTED,
            (self._svc_name_, '')
        )
        try:
            logging.info("Starting PDF Watcher Service")
            self.main()
        except Exception as e:
            tb = mask_traceback(traceback.format_exc())
            logging.error(f"Service crashed unexpectedly: {e}\n{tb}")
            send_email(
                SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO,
                "PDF Watcher Service Crash",
                f"Service crashed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}: {e}\n{tb}",
                use_ssl=(SMTP_PORT == 465)
            )

    def main(self) -> None:
        """Main service loop."""
        if not self.file_watcher.start():
            self.SvcStop()
            return

        start_message = f"The PDF Watcher Service started successfully at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}."
        send_email(
            SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO,
            "PDF Watcher Service Started", start_message,
            use_ssl=(SMTP_PORT == 465)
        )

        cleanup_interval = int(os.getenv("CLEANUP_INTERVAL", "3600"))  # Configurable cleanup interval
        resource_log_interval = 10
        sleep_interval = float(os.getenv("SLEEP_INTERVAL", "0.1"))  # Configurable sleep interval
        last_cleanup_time = time.time()
        last_resource_log_time = time.time()

        try:
            while True:
                if win32event.WaitForSingleObject(self.stop_event, 500) == win32event.WAIT_OBJECT_0:
                    logging.info("Stop event received in main loop")
                    break
                if not self.file_watcher.is_alive() and not self.is_shutting_down:
                    logging.warning("Observer stopped unexpectedly, attempting restart")
                    self.file_watcher.stop()
                    if not self.file_watcher.start():
                        send_email(
                            SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO,
                            "PDF Watcher Service Observer Failure",
                            "Observer failed to restart.",
                            use_ssl=(SMTP_PORT == 465)
                        )
                        self.SvcStop()
                        return
                current_time = time.time()
                if current_time - last_cleanup_time >= cleanup_interval:
                    self.file_watcher.cleanup()
                    last_cleanup_time = current_time
                if current_time - last_resource_log_time >= resource_log_interval:
                    self.resource_monitor.log_resource_usage()
                    last_resource_log_time = current_time
                time.sleep(sleep_interval)
        except Exception as e:
            tb = mask_traceback(traceback.format_exc())
            logging.error(f"Unexpected error in main loop: {e}\n{tb}")
            send_email(
                SMTP_SERVER, SMTP_PORT, EMAIL_FROM, ERROR_EMAIL_TO,
                "PDF Watcher Service Error", f"Unexpected error: {e}\n{tb}",
                use_ssl=(SMTP_PORT == 465)
            )
        finally:
            self.file_watcher.stop()
            logging.info("PDF Watcher Service stopped")

if __name__ == '__main__':
    if len(sys.argv) == 1:
        servicemanager.Initialize()
        servicemanager.PrepareToHostSingle(ServiceManager)
        servicemanager.StartServiceCtrlDispatcher()
    else:
        win32serviceutil.HandleCommandLine(ServiceManager)
