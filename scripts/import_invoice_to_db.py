#!/usr/bin/env python3
"""
Import invoice data into the database
"""

import sys
import json
import os
import psycopg2
from datetime import datetime
from pathlib import Path
import uuid

def get_database_url():
    """Get database URL from environment or .env file."""
    # Try environment variable first
    db_url = os.environ.get('DATABASE_URL')
    if db_url:
        return db_url
    
    # Try reading from .env file
    env_path = Path(__file__).parent.parent / "nextjs_space" / ".env"
    if env_path.exists():
        with open(env_path, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    return line.split('=', 1)[1].strip().strip('"')
    
    return None

def import_invoice(invoice_data: dict, pdf_filename: str) -> bool:
    """Import invoice into the database using direct PostgreSQL connection."""
    
    conn = None
    try:
        # Validate required fields
        if not invoice_data.get("rechnungsnummer"):
            print("Error: Missing invoice number", file=sys.stderr)
            return False
        
        if not invoice_data.get("lieferant"):
            print("Error: Missing supplier name", file=sys.stderr)
            return False
        
        # Get database URL
        db_url = get_database_url()
        if not db_url:
            print("Error: DATABASE_URL not found", file=sys.stderr)
            return False
        
        # Connect to database
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Check if invoice already exists
        cur.execute(
            'SELECT id FROM "rechnungen" WHERE "rechnungsnummer" = %s',
            (invoice_data["rechnungsnummer"],)
        )
        existing = cur.fetchone()
        
        # Parse date
        datum = datetime.fromisoformat(invoice_data["datum"]) if invoice_data.get("datum") else datetime.now()
        
        if existing:
            print(f"Invoice {invoice_data['rechnungsnummer']} already exists. Updating...", file=sys.stderr)
            
            # Update existing invoice
            cur.execute('''
                UPDATE "rechnungen" SET
                    "datum" = %s,
                    "lieferant" = %s,
                    "betragNetto" = %s,
                    "mwstSatz" = %s,
                    "mwstBetrag" = %s,
                    "betragBrutto" = %s,
                    "leistungszeitraum" = %s,
                    "dateipfad" = %s,
                    "status" = %s,
                    "verarbeitungsdatum" = %s
                WHERE "id" = %s
            ''', (
                datum,
                invoice_data["lieferant"],
                invoice_data.get("betragNetto", 0),
                invoice_data.get("mwstSatz", "19%"),
                invoice_data.get("mwstBetrag"),
                invoice_data.get("betragBrutto", 0),
                invoice_data.get("leistungszeitraum"),
                pdf_filename,
                invoice_data.get("status", "Neu"),
                datetime.now(),
                existing[0]
            ))
            print(f"Successfully updated invoice: {invoice_data['rechnungsnummer']}")
        else:
            # Create new invoice
            invoice_id = str(uuid.uuid4())
            now = datetime.now()
            cur.execute('''
                INSERT INTO "rechnungen" (
                    "id", "rechnungsnummer", "datum", "lieferant",
                    "betragNetto", "mwstSatz", "mwstBetrag", "betragBrutto",
                    "leistungszeitraum", "dateipfad", "status", "verarbeitungsdatum",
                    "createdAt", "updatedAt"
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                invoice_id,
                invoice_data["rechnungsnummer"],
                datum,
                invoice_data["lieferant"],
                invoice_data.get("betragNetto", 0),
                invoice_data.get("mwstSatz", "19%"),
                invoice_data.get("mwstBetrag"),
                invoice_data.get("betragBrutto", 0),
                invoice_data.get("leistungszeitraum"),
                pdf_filename,
                invoice_data.get("status", "Neu"),
                now,
                now,
                now
            ))
            print(f"Successfully imported invoice: {invoice_data['rechnungsnummer']}")
        
        conn.commit()
        return True
            
    except Exception as e:
        print(f"Error importing invoice: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            try:
                conn.close()
            except:
                pass

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python import_invoice_to_db.py <invoice_json> <pdf_filename>", file=sys.stderr)
        sys.exit(1)
    
    invoice_json = sys.argv[1]
    pdf_filename = sys.argv[2]
    
    try:
        invoice_data = json.loads(invoice_json)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {str(e)}", file=sys.stderr)
        sys.exit(1)
    
    success = import_invoice(invoice_data, pdf_filename)
    sys.exit(0 if success else 1)
