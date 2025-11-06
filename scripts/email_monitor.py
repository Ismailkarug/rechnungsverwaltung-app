#!/usr/bin/env python3
"""
Email Monitor Script for Invoice Management
Monitors Gmail inbox for new invoices and automatically imports them.
"""

import os
import sys
import json
import base64
import logging
from datetime import datetime, timedelta
from pathlib import Path
import requests
from email import message_from_bytes
from email.utils import parsedate_to_datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/ubuntu/rechnungsverwaltung_app/logs/email_monitor.log'),
        logging.StreamHandler()
    ]
)

# Configuration
GMAIL_EMAIL = "rechnungismailkar@gmail.com"
AUTH_SECRETS_PATH = "/home/ubuntu/.config/abacusai_auth_secrets.json"
INVOICES_DIR = "/home/ubuntu/rechnungsverwaltung_app/invoices"
PROCESSED_EMAILS_FILE = "/home/ubuntu/rechnungsverwaltung_app/data/processed_emails.json"
APP_DIR = "/home/ubuntu/rechnungsverwaltung_app/nextjs_space"

def load_env_variables():
    """Load environment variables from .env file."""
    env_path = os.path.join(APP_DIR, '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    os.environ[key] = value

# Load environment variables
load_env_variables()

DATABASE_URL = os.getenv('DATABASE_URL', '')
ABACUSAI_API_KEY = os.getenv('ABACUSAI_API_KEY', '')

# Ensure directories exist
Path(INVOICES_DIR).mkdir(parents=True, exist_ok=True)
Path(PROCESSED_EMAILS_FILE).parent.mkdir(parents=True, exist_ok=True)

def load_gmail_token():
    """Load Gmail OAuth access token."""
    try:
        with open(AUTH_SECRETS_PATH, 'r') as f:
            data = json.load(f)
            return data['gmailuser']['secrets']['access_token']['value']
    except Exception as e:
        logging.error(f"Error loading Gmail token: {e}")
        return None

def load_processed_emails():
    """Load list of already processed email IDs."""
    if os.path.exists(PROCESSED_EMAILS_FILE):
        try:
            with open(PROCESSED_EMAILS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def save_processed_email(email_id):
    """Save processed email ID to avoid reprocessing."""
    processed = load_processed_emails()
    if email_id not in processed:
        processed.append(email_id)
        # Keep only last 1000 entries
        processed = processed[-1000:]
        with open(PROCESSED_EMAILS_FILE, 'w') as f:
            json.dump(processed, f)

def search_invoice_emails(token, hours_back=24):
    """Search for emails with PDF attachments in the last N hours."""
    try:
        # Calculate time threshold
        after_date = datetime.now() - timedelta(hours=hours_back)
        after_timestamp = int(after_date.timestamp())
        
        # Search query: has attachment, is PDF, received after timestamp
        query = f"has:attachment filename:pdf after:{after_timestamp}"
        
        url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
        headers = {"Authorization": f"Bearer {token}"}
        params = {
            "q": query,
            "maxResults": 20
        }
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        messages = response.json().get('messages', [])
        logging.info(f"Found {len(messages)} potential invoice emails")
        return messages
        
    except Exception as e:
        logging.error(f"Error searching emails: {e}")
        return []

def get_email_details(token, message_id):
    """Get full email details including attachments."""
    try:
        url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}"
        headers = {"Authorization": f"Bearer {token}"}
        params = {"format": "full"}
        
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        
        return response.json()
        
    except Exception as e:
        logging.error(f"Error getting email details: {e}")
        return None

def extract_pdf_attachments(email_data):
    """Extract PDF attachments from email."""
    attachments = []
    
    try:
        payload = email_data.get('payload', {})
        parts = payload.get('parts', [])
        
        # Check if there are parts
        if not parts:
            parts = [payload]
        
        for part in parts:
            filename = part.get('filename', '')
            mime_type = part.get('mimeType', '')
            
            # Check if it's a PDF
            if filename.lower().endswith('.pdf') or mime_type == 'application/pdf':
                body = part.get('body', {})
                attachment_id = body.get('attachmentId')
                
                if attachment_id:
                    attachments.append({
                        'filename': filename,
                        'attachment_id': attachment_id,
                        'size': body.get('size', 0)
                    })
                    
            # Check nested parts (multipart messages)
            if 'parts' in part:
                nested_attachments = extract_pdf_attachments({'payload': part})
                attachments.extend(nested_attachments)
                
    except Exception as e:
        logging.error(f"Error extracting attachments: {e}")
    
    return attachments

def download_attachment(token, message_id, attachment_id, filename):
    """Download email attachment."""
    try:
        url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{message_id}/attachments/{attachment_id}"
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        file_data = base64.urlsafe_b64decode(data['data'])
        
        # Save to invoices directory
        file_path = os.path.join(INVOICES_DIR, filename)
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        logging.info(f"Downloaded attachment: {filename}")
        return file_path
        
    except Exception as e:
        logging.error(f"Error downloading attachment: {e}")
        return None

def extract_invoice_data_from_pdf(pdf_path):
    """Extract invoice data using AI."""
    try:
        # Read PDF file
        with open(pdf_path, 'rb') as f:
            pdf_bytes = f.read()
        
        base64_pdf = base64.b64encode(pdf_bytes).decode('utf-8')
        
        # Call LLM API
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "type": "file",
                        "file": {
                            "filename": os.path.basename(pdf_path),
                            "file_data": f"data:application/pdf;base64,{base64_pdf}"
                        }
                    },
                    {
                        "type": "text",
                        "text": """Bitte extrahiere die folgenden Informationen aus dieser Rechnung und gib sie als JSON zurück:

{
  "rechnungsnummer": "Rechnungsnummer (String)",
  "datum": "Rechnungsdatum im Format YYYY-MM-DD",
  "lieferant": "Name des Lieferanten/Ausstellers",
  "betragNetto": "Nettobetrag als Zahl (nur Ziffern, kein Währungssymbol)",
  "mwstSatz": "MwSt-Satz in Prozent (z.B. '19' oder '7')",
  "mwstBetrag": "MwSt-Betrag als Zahl",
  "betragBrutto": "Bruttobetrag als Zahl",
  "leistungszeitraum": "Leistungszeitraum falls vorhanden, sonst null"
}

Falls eine Information nicht vorhanden ist, verwende null. Alle Beträge ohne Währungssymbole und Punkte als Tausendertrennzeichen. Antworte nur mit dem JSON-Objekt, ohne Code-Blöcke oder Markdown."""
                    }
                ]
            }
        ]
        
        response = requests.post(
            'https://apps.abacus.ai/v1/chat/completions',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {ABACUSAI_API_KEY}'
            },
            json={
                'model': 'gpt-4.1-mini',
                'messages': messages,
                'response_format': {'type': 'json_object'},
                'max_tokens': 1000
            }
        )
        
        response.raise_for_status()
        data = response.json()
        extracted_data = json.loads(data['choices'][0]['message']['content'])
        
        logging.info(f"Extracted invoice data: {extracted_data.get('rechnungsnummer', 'Unknown')}")
        return extracted_data
        
    except Exception as e:
        logging.error(f"Error extracting invoice data: {e}")
        return None

def save_invoice_to_database(invoice_data, pdf_filename):
    """Save invoice to database using import script."""
    try:
        # Prepare data for database
        import sys
        sys.path.insert(0, '/home/ubuntu/rechnungsverwaltung_app/scripts')
        
        from import_invoice_to_db import save_invoice_to_db
        
        # Call the import function
        result = save_invoice_to_db(invoice_data, pdf_filename)
        
        if result:
            logging.info(f"Successfully saved invoice {invoice_data.get('rechnungsnummer')} to database")
            return True
        else:
            logging.error(f"Failed to save invoice to database")
            return False
            
    except Exception as e:
        logging.error(f"Error saving to database: {e}")
        return False

def process_invoice_email(token, message_id):
    """Process a single email with invoice attachments."""
    try:
        logging.info(f"Processing email: {message_id}")
        
        # Get email details
        email_data = get_email_details(token, message_id)
        if not email_data:
            return False
        
        # Extract PDF attachments
        attachments = extract_pdf_attachments(email_data)
        if not attachments:
            logging.info(f"No PDF attachments found in email {message_id}")
            return False
        
        logging.info(f"Found {len(attachments)} PDF attachment(s)")
        
        success_count = 0
        for attachment in attachments:
            # Download attachment
            pdf_path = download_attachment(
                token, 
                message_id, 
                attachment['attachment_id'], 
                attachment['filename']
            )
            
            if not pdf_path:
                continue
            
            # Extract invoice data
            invoice_data = extract_invoice_data_from_pdf(pdf_path)
            if not invoice_data:
                continue
            
            # Save to database
            if save_invoice_to_database(invoice_data, attachment['filename']):
                success_count += 1
        
        if success_count > 0:
            save_processed_email(message_id)
            return True
        
        return False
        
    except Exception as e:
        logging.error(f"Error processing email: {e}")
        return False

def main():
    """Main execution function."""
    logging.info("=" * 60)
    logging.info("Starting Email Monitor for Invoice Import")
    logging.info("=" * 60)
    
    # Load Gmail token
    token = load_gmail_token()
    if not token:
        logging.error("Failed to load Gmail token. Exiting.")
        return
    
    # Load processed emails
    processed_emails = load_processed_emails()
    logging.info(f"Already processed {len(processed_emails)} emails")
    
    # Search for new invoice emails (last 24 hours)
    messages = search_invoice_emails(token, hours_back=24)
    
    if not messages:
        logging.info("No new invoice emails found")
        return
    
    # Process each email
    new_invoices = 0
    for message in messages:
        message_id = message['id']
        
        # Skip if already processed
        if message_id in processed_emails:
            continue
        
        # Process email
        if process_invoice_email(token, message_id):
            new_invoices += 1
    
    logging.info("=" * 60)
    logging.info(f"Email Monitor Completed - Processed {new_invoices} new invoice(s)")
    logging.info("=" * 60)

if __name__ == "__main__":
    main()
