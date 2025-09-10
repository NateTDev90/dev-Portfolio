"""
File Handler - File handling utilities for copying files and validating PDFs

Authors:
    Nate Tallent - Original creator and primary developer
    Claude (Anthropic) - AI assistant for enhancements and maintenance

Created: 4/14/2025
Last Modified: 5/29/2025
"""

import shutil
import time
import os
import logging
from typing import Union
from PyPDF2 import PdfReader
from config import mask_path

def copy_file_with_retries(src: str, dest: str, retries: int = 5, delay: int = 1) -> bool:
    """Copy a file with retries on permission errors."""
    for attempt in range(retries):
        try:
            shutil.copy(src, dest)
            logging.info(f"Successfully copied file from {mask_path(src)} to {mask_path(dest)}")
            return True
        except PermissionError as e:
            logging.warning(f"Permission error copying {mask_path(src)} to {mask_path(dest)}, attempt {attempt+1}: {e}")
            time.sleep(delay)
        except Exception as e:
            logging.error(f"Unexpected error copying {mask_path(src)} to {mask_path(dest)}: {e}")
            return False
    logging.error(f"Failed to copy {mask_path(src)} to {mask_path(dest)} after {retries} attempts")
    return False

def is_pdf(file_path: str) -> bool:
    """Check if a file is a valid PDF by magic number and structure."""
    try:
        with open(file_path, 'rb') as f:
            if f.read(4) != b'%PDF':
                logging.warning(f"File {mask_path(file_path)} does not have PDF magic number")
                return False
        with open(file_path, 'rb') as f:
            PdfReader(f)
        logging.info(f"Validated {mask_path(file_path)} as a PDF")
        return True
    except Exception as e:
        logging.warning(f"File {mask_path(file_path)} is not a valid PDF: {e}")
        return False

def validate_safe_path(base_dir: str, file_path: str) -> bool:
    """Validate that a file path is within the expected directory (prevent path traversal)."""
    try:
        # Get absolute paths
        base_dir = os.path.abspath(base_dir)
        file_path = os.path.abspath(file_path)
        
        # Check if file_path is within base_dir
        common_path = os.path.commonpath([base_dir, file_path])
        is_safe = common_path == base_dir
        
        if not is_safe:
            logging.warning(f"Path traversal attempt detected: {mask_path(file_path)} not in {mask_path(base_dir)}")
        
        return is_safe
    except Exception as e:
        logging.error(f"Error validating path safety: {e}")
        return False