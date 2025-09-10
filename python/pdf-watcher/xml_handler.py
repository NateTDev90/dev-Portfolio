"""
XML Handler - XML parsing utilities for extracting Synergy index values

Author:
    Nate Tallent - Original creator and primary developer
Created: 4/14/2025
Last Modified: 5/29/2025
"""

import os
import re
import time
import logging
import xml.etree.ElementTree as ET
from typing import Optional, Dict

from config import mask_path, EMAIL_DOMAIN

# Cache for XML parsing failures to avoid repeated attempts
XML_ERROR_CACHE: Dict[str, float] = {}
XML_CACHE_TIMEOUT = 300  # 5 minutes

def find_companion_xml(pdf_path: str) -> Optional[str]:
    """Find the companion XML file for a given PDF file.
    
    The XML file should have the same base name as the PDF file,
    ensuring we only process XML files that are directly associated
    with the wire form PDF (both containing the same account number).
    
    Args:
        pdf_path: Full path to the PDF file
        
    Returns:
        Full path to the companion XML file if found, None otherwise
        
    Example:
        >>> find_companion_xml("/path/wire_12345.pdf")
        "/path/wire_12345.xml"
    """
    # Get the base filename without extension
    base_name = os.path.splitext(pdf_path)[0]
    xml_path = base_name + ".xml"
    
    if os.path.exists(xml_path):
        logging.info(f"Found companion XML file with matching name: {mask_path(xml_path)}")
        return xml_path
    
    # Try uppercase extension
    xml_path_upper = base_name + ".XML"
    if os.path.exists(xml_path_upper):
        logging.info(f"Found companion XML file with matching name: {mask_path(xml_path_upper)}")
        return xml_path_upper
    
    logging.info(f"No companion XML file with matching name found for: {mask_path(pdf_path)}")
    return None

def parse_synergy_xml(xml_path: str) -> Optional[Dict[str, str]]:
    """Parse Synergy XML file and extract index values.
    
    Supports multiple XML structures commonly used by Synergy:
    - Direct index elements: <index name="USER NAME" value="John Doe"/>
    - Field elements: <field name="USER NAME">John Doe</field>
    - Property elements: <property name="USER NAME" value="John Doe"/>
    - Direct child elements: <USER_NAME>John Doe</USER_NAME>
    
    Args:
        xml_path: Full path to the XML file to parse
        
    Returns:
        Dictionary mapping field names to values, or None if parsing fails
        
    Example:
        >>> parse_synergy_xml("/path/wire_12345.xml")
        {"USER NAME": "John Doe", "ACCOUNT": "123456"}
    """
    # Check error cache first
    current_time = time.time()
    if xml_path in XML_ERROR_CACHE:
        if current_time - XML_ERROR_CACHE[xml_path] < XML_CACHE_TIMEOUT:
            logging.debug(f"Skipping recently failed XML file: {mask_path(xml_path)}")
            return None
        else:
            # Cache entry expired, remove it
            del XML_ERROR_CACHE[xml_path]
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
        
        # Dictionary to store index values
        indexes = {}
        strategies_tried = []
        
        # Common XML structures for Synergy
        # Try different possible XML structures
        
        # Structure 1: Direct index elements
        index_elements = root.findall('.//index')
        if index_elements:
            strategies_tried.append("direct_index_elements")
        for index in index_elements:
            name = index.get('name') or index.find('name')
            value = index.get('value') or index.find('value')
            if name and value:
                if isinstance(name, ET.Element):
                    name = name.text
                if isinstance(value, ET.Element):
                    value = value.text
                if name and value:
                    indexes[name] = value
        
        # Structure 2: Field elements
        field_elements = root.findall('.//field')
        if field_elements:
            strategies_tried.append("field_elements")
        for field in field_elements:
            name = field.get('name')
            value = field.text
            if name and value:
                indexes[name] = value
        
        # Structure 3: Property elements
        prop_elements = root.findall('.//property')
        if prop_elements:
            strategies_tried.append("property_elements")
        for prop in prop_elements:
            name = prop.get('name')
            value = prop.get('value') or prop.text
            if name and value:
                indexes[name] = value
        
        # Structure 4: Direct child elements with tag as name
        if list(root):
            strategies_tried.append("direct_child_elements")
        for child in root:
            if child.text and child.text.strip():
                indexes[child.tag] = child.text.strip()
        
        if strategies_tried:
            logging.info(f"Extracted {len(indexes)} index values from XML using strategies: {', '.join(strategies_tried)}")
        else:
            logging.warning(f"No XML parsing strategies were applicable for: {mask_path(xml_path)}")
        
        return indexes if indexes else None
        
    except ET.ParseError as e:
        logging.error(f"Failed to parse XML file {mask_path(xml_path)}: {e}")
        XML_ERROR_CACHE[xml_path] = current_time
        return None
    except Exception as e:
        logging.error(f"Error processing XML file {mask_path(xml_path)}: {e}")
        XML_ERROR_CACHE[xml_path] = current_time
        return None

def extract_user_name(indexes: Dict[str, str]) -> Optional[str]:
    """Extract user name from index values.
    
    Searches for user name in common field variations used by Synergy.
    Field names are matched case-insensitively.
    
    Args:
        indexes: Dictionary of field names to values from XML parsing
        
    Returns:
        User name string if found, None otherwise
        
    Example:
        >>> extract_user_name({"USER NAME": "John Doe", "ACCOUNT": "123456"})
        "John Doe"
    """
    # Try different possible field names for user
    possible_fields = [
        'USER NAME', 'USER_NAME', 'UserName', 'User Name',
        'USERNAME', 'user_name', 'username', 'User',
        'SUBMITTER', 'Submitter', 'submitter',
        'SUBMITTED_BY', 'SubmittedBy', 'Submitted By'
    ]
    
    for field in possible_fields:
        if field in indexes:
            user_name = indexes[field].strip()
            if user_name:
                logging.info(f"Found user name in field '{field}': [REDACTED]")
                return user_name
    
    logging.warning("No user name found in XML indexes")
    return None

def transform_name_to_email(user_name: str, email_domain: Optional[str] = None) -> Optional[str]:
    """Transform a user name to email format.
    
    Converts names to uppercase email format with dots between name parts.
    Removes special characters and normalizes spacing.
    
    Args:
        user_name: Full name to transform (e.g., "John Doe")
        email_domain: Email domain to use (defaults to EMAIL_DOMAIN config)
        
    Returns:
        Email address string or None if transformation fails
        
    Examples:
        >>> transform_name_to_email("John Doe", "COMPANY.COM")
        "JOHN.DOE@COMPANY.COM"
        >>> transform_name_to_email("Jane Smith-Wilson", "COMPANY.COM") 
        "JANE.SMITHWILSON@COMPANY.COM"
    """
    if email_domain is None:
        email_domain = EMAIL_DOMAIN
    try:
        # Remove extra spaces and split the name
        name_parts = user_name.strip().split()
        
        if not name_parts:
            logging.warning("Empty user name provided")
            return None
        
        # Handle different name formats
        if len(name_parts) == 1:
            # Single name - use as is
            email_prefix = name_parts[0].upper()
        elif len(name_parts) == 2:
            # First Last format
            email_prefix = f"{name_parts[0]}.{name_parts[1]}".upper()
        else:
            # Multiple parts - use first and last
            email_prefix = f"{name_parts[0]}.{name_parts[-1]}".upper()
        
        # Remove any non-alphanumeric characters except dots
        email_prefix = re.sub(r'[^A-Z0-9.]', '', email_prefix)
        
        # Ensure no multiple consecutive dots
        email_prefix = re.sub(r'\.+', '.', email_prefix)
        
        # Remove leading/trailing dots
        email_prefix = email_prefix.strip('.')
        
        if not email_prefix:
            logging.warning("Could not create valid email prefix from user name")
            return None
        
        email = f"{email_prefix}@{email_domain}"
        logging.info(f"Transformed user name to email: [REDACTED]@{email_domain}")
        return email
        
    except Exception as e:
        logging.error(f"Error transforming name to email: {e}")
        return None

def get_user_email_from_xml(pdf_path: str, email_domain: Optional[str] = None) -> Optional[str]:
    """Extract user email from companion XML file.
    
    Complete workflow for extracting user email from XML metadata:
    1. Find companion XML file with matching name
    2. Parse XML to extract index values  
    3. Extract user name from known fields
    4. Transform name to email address format
    
    Args:
        pdf_path: Full path to the PDF file
        email_domain: Email domain to use (defaults to EMAIL_DOMAIN config)
        
    Returns:
        User email address string or None if extraction fails at any step
        
    Example:
        >>> get_user_email_from_xml("/path/wire_12345.pdf", "COMPANY.COM")
        "JOHN.DOE@COMPANY.COM"
    """
    if email_domain is None:
        email_domain = EMAIL_DOMAIN
    # Find companion XML
    xml_path = find_companion_xml(pdf_path)
    if not xml_path:
        return None
    
    # Parse XML
    indexes = parse_synergy_xml(xml_path)
    if not indexes:
        return None
    
    # Extract user name
    user_name = extract_user_name(indexes)
    if not user_name:
        return None
    
    # Transform to email
    user_email = transform_name_to_email(user_name, email_domain)
    return user_email
