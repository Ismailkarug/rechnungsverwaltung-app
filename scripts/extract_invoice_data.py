#!/usr/bin/env python3
"""
Extract invoice data from PDF files
"""

import PyPDF2
import re
import sys
import json
from datetime import datetime
from typing import Dict, Optional

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            full_text = ""
            for page in pdf_reader.pages:
                full_text += page.extract_text() + "\n"
            return full_text
    except Exception as e:
        print(f"Error reading PDF: {str(e)}", file=sys.stderr)
        return ""

def parse_german_number(text: str) -> Optional[float]:
    """Parse German number format (1.234,56) to float."""
    if not text:
        return None
    # Remove spaces and convert German format to standard
    text = text.strip().replace('.', '').replace(',', '.')
    try:
        return float(re.sub(r'[^\d.]', '', text))
    except (ValueError, AttributeError):
        return None

def parse_date(text: str) -> Optional[str]:
    """Parse various date formats to ISO format."""
    if not text:
        return None
    
    # Try DD.MM.YYYY format
    match = re.search(r'(\d{2})\.(\d{2})\.(\d{4})', text)
    if match:
        day, month, year = match.groups()
        try:
            date_obj = datetime(int(year), int(month), int(day))
            return date_obj.strftime('%Y-%m-%d')
        except ValueError:
            pass
    
    return None

def extract_invoice_data(pdf_path: str) -> Dict:
    """Extract structured invoice data from PDF."""
    text = extract_text_from_pdf(pdf_path)
    
    if not text:
        return {"error": "Could not extract text from PDF"}
    
    data = {
        "rechnungsnummer": None,
        "datum": None,
        "lieferant": None,
        "betragNetto": None,
        "mwstSatz": None,
        "mwstBetrag": None,
        "betragBrutto": None,
        "leistungszeitraum": None,
        "status": "Neu",
        "extracted_text": text[:500]  # First 500 chars for debugging
    }
    
    # Extract invoice number
    patterns_rechnungsnummer = [
        r'Rechnungsnummer[:\s]+(\d+)',
        r'Rechnung[s]?[-\s]?Nr\.?[:\s]+(\d+)',
        r'Invoice[:\s]+(\d+)',
        r'RE[-\s]?(\d+)'
    ]
    for pattern in patterns_rechnungsnummer:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["rechnungsnummer"] = match.group(1)
            break
    
    # Extract date
    patterns_datum = [
        r'Rechnungsdatum[:\s]+(\d{2}\.\d{2}\.\d{4})',
        r'Datum[:\s]+(\d{2}\.\d{2}\.\d{4})',
        r'Date[:\s]+(\d{2}\.\d{2}\.\d{4})'
    ]
    for pattern in patterns_datum:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["datum"] = parse_date(match.group(1))
            break
    
    # If no date found, use today
    if not data["datum"]:
        data["datum"] = datetime.now().strftime('%Y-%m-%d')
    
    # Extract supplier/vendor
    # Look for common patterns at the top of invoice
    lines = text.split('\n')[:20]
    for line in lines:
        # Common German suppliers or company patterns
        if any(keyword in line.upper() for keyword in ['GMBH', 'AG', 'KG', 'E.V.', 'UG']):
            # Clean up the line
            line = line.strip()
            if len(line) > 3 and len(line) < 100:
                data["lieferant"] = line
                break
    
    # If still no supplier, try to extract from specific patterns
    if not data["lieferant"]:
        match = re.search(r'^([A-Z][A-Za-z\s&.-]+(?:GmbH|AG|KG|e\.V\.|UG))', text, re.MULTILINE | re.IGNORECASE)
        if match:
            data["lieferant"] = match.group(1).strip()
    
    # Extract amounts - try multiple patterns
    # Net amount (Netto)
    patterns_netto = [
        r'(?:Netto|Summe netto|Gesamt netto|ohne\s+(?:Umsatz)?steuer)[:\s]+(?:EUR\s+)?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})',
        r'Rechnungsbetrag\s+\(ohne\s+Umsatzsteuer\)[:\s]+([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})',
    ]
    for pattern in patterns_netto:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["betragNetto"] = parse_german_number(match.group(1))
            break
    
    # VAT rate and amount
    patterns_mwst = [
        r'(?:MwSt|Umsatzsteuer|USt\.?)\s+\(?([0-9]{1,2})%\)?[:\s]+(?:von\s+[0-9,.]+\s+EUR\s+)?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})',
        r'([0-9]{1,2})\s*%\s+(?:MwSt|USt)[:\s]+([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})',
    ]
    for pattern in patterns_mwst:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["mwstSatz"] = match.group(1) + "%"
            data["mwstBetrag"] = parse_german_number(match.group(2))
            break
    
    # Gross amount (Brutto)
    patterns_brutto = [
        r'(?:Brutto|Gesamt brutto|Summe brutto|Endbetrag|Gesamtbetrag|inklusive\s+(?:Umsatz)?steuer)[:\s]+(?:EUR\s+)?([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})',
        r'Rechnungsbetrag\s+\(inklusive\s+Umsatzsteuer\)[:\s]+([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2})',
    ]
    for pattern in patterns_brutto:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["betragBrutto"] = parse_german_number(match.group(1))
            break
    
    # Extract service period (Leistungszeitraum)
    patterns_leistung = [
        r'Leistungszeitraum[:\s]+(\d{2}\.\d{4}|\d{2}\.\d{2}\.\d{4})',
        r'Leistungszeitraum[:\s]+([0-9/.-]+)',
    ]
    for pattern in patterns_leistung:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data["leistungszeitraum"] = match.group(1)
            break
    
    # Validation: if we have netto and mwst but not brutto, calculate it
    if data["betragNetto"] and data["mwstBetrag"] and not data["betragBrutto"]:
        data["betragBrutto"] = round(data["betragNetto"] + data["mwstBetrag"], 2)
    
    # Validation: if we have brutto and mwst but not netto, calculate it
    if data["betragBrutto"] and data["mwstBetrag"] and not data["betragNetto"]:
        data["betragNetto"] = round(data["betragBrutto"] - data["mwstBetrag"], 2)
    
    return data

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_invoice_data.py <pdf_path>", file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = extract_invoice_data(pdf_path)
    
    print(json.dumps(result, indent=2, ensure_ascii=False))
