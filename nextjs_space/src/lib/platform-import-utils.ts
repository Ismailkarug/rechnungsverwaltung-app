/**
 * Platform Import Utilities
 * Comprehensive CSV, PDF, and ZIP import system for eBay, Amazon, and Shopify
 */

import { parse } from 'csv-parse/sync';
import { Platform } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportResult {
  success: boolean;
  totalFiles: number;
  processedFiles: number;
  skippedFiles: number;
  failedFiles: number;
  invoices: ImportedInvoice[];
  fees: ImportedFee[];
  errors: ImportError[];
  summary: ImportSummary;
}

export interface ImportedInvoice {
  invoiceNumber: string;
  orderNumber?: string;
  platformOrderId?: string;
  transactionDate: Date;
  customerName?: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  currency: string;
  platform: Platform;
  type: 'EINGANG' | 'AUSGANG';
  paymentMethod?: string;
  referenceRaw?: string;
  description?: string;
}

export interface ImportedFee {
  invoiceNumber: string;
  feeType: 'PLATFORM_FEE' | 'PAYMENT_FEE' | 'SHIPPING_COST' | 'OTHER';
  amount: number;
  currency: string;
  description?: string;
  transactionDate: Date;
  platform: Platform;
}

export interface ImportError {
  fileName: string;
  lineNumber?: number;
  error: string;
  details?: string;
}

export interface ImportSummary {
  platformCounts: {
    EBAY: number;
    AMAZON: number;
    SHOPIFY: number;
    OTHER: number;
  };
  totals: {
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
    totalFees: number;
  };
  counts: {
    successfulInvoices: number;
    successfulFees: number;
    skippedRows: number;
    failedRows: number;
  };
}

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

export function detectPlatform(
  content: string,
  fileName: string,
  manualPlatform?: Platform
): Platform {
  // Manual selection takes precedence
  if (manualPlatform && manualPlatform !== 'NONE') {
    return manualPlatform;
  }

  const lowerContent = content.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  // Amazon detection
  if (
    lowerContent.includes('amazon eu s.à r.l') ||
    lowerContent.includes('amazon.de') ||
    lowerContent.includes('amazon services') ||
    lowerFileName.includes('amazon') ||
    lowerFileName.includes('inv-de-') ||
    lowerFileName.includes('aeu-')
  ) {
    return 'AMAZON';
  }

  // eBay detection
  if (
    lowerContent.includes('ebay s.à r.l') ||
    lowerContent.includes('abrechnungsbericht') ||
    lowerContent.includes('ebay-nutzername') ||
    lowerFileName.includes('ebay') ||
    lowerFileName.includes('abrechnungsbericht')
  ) {
    return 'EBAY';
  }

  // Shopify detection
  if (
    lowerContent.includes('shopify') ||
    (lowerContent.includes('paypal') && lowerContent.includes('#')) ||
    lowerFileName.includes('shopify')
  ) {
    return 'SHOPIFY';
  }

  return 'NONE';
}

// ============================================================================
// NUMBER PARSING (EU FORMAT)
// ============================================================================

export function parseEUNumber(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;

  // Remove currency symbols and whitespace
  let cleaned = value
    .replace(/[€$£¥\s]/g, '')
    .trim();

  // Handle negative numbers
  const isNegative = cleaned.startsWith('-') || cleaned.startsWith('(');
  cleaned = cleaned.replace(/[()-]/g, '');

  // EU format: 1.234,56 -> 1234.56
  // Check if comma is decimal separator (EU format)
  if (cleaned.includes(',')) {
    // Remove thousand separators (dots)
    cleaned = cleaned.replace(/\./g, '');
    // Replace comma with dot
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  return isNegative ? -Math.abs(parsed) : parsed;
}

// ============================================================================
// DATE PARSING
// ============================================================================

export function parseDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date();

  // Try ISO format first
  if (dateStr.includes('-') && dateStr.length >= 10) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // Try DD.MM.YYYY format (common in EU)
  const ddmmyyyyMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  // Try DD/MM/YYYY format
  const ddmmyyyySlashMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyySlashMatch) {
    const [, day, month, year] = ddmmyyyySlashMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  // Fallback to current date
  return new Date();
}

// ============================================================================
// CSV PARSER
// ============================================================================

export function parseCSV(content: string, platform: Platform): {
  invoices: ImportedInvoice[];
  fees: ImportedFee[];
  errors: ImportError[];
} {
  const invoices: ImportedInvoice[] = [];
  const fees: ImportedFee[] = [];
  const errors: ImportError[] = [];

  try {
    // Parse CSV with flexible options
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';',
      relax_column_count: true,
      trim: true,
      bom: true,
    });

    console.log(`[CSV Parser] Parsed ${records.length} rows`);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const lineNumber = i + 2; // +2 because of header and 0-index

      try {
        // Skip rows with no meaningful data
        if (!row || Object.keys(row).length === 0) continue;

        // Detect platform from row if not specified
        const detectedPlatform = platform !== 'NONE' 
          ? platform 
          : detectPlatform(JSON.stringify(row), '', undefined);

        // Parse based on detected platform
        if (detectedPlatform === 'EBAY') {
          parseEbayCSVRow(row, lineNumber, invoices, fees, errors);
        } else if (detectedPlatform === 'AMAZON') {
          parseAmazonCSVRow(row, lineNumber, invoices, fees, errors);
        } else if (detectedPlatform === 'SHOPIFY') {
          parseShopifyCSVRow(row, lineNumber, invoices, fees, errors);
        } else {
          parseGenericCSVRow(row, lineNumber, invoices, fees, errors);
        }
      } catch (error) {
        errors.push({
          fileName: 'CSV',
          lineNumber,
          error: 'Row parsing failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    errors.push({
      fileName: 'CSV',
      error: 'CSV parsing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return { invoices, fees, errors };
}

function parseEbayCSVRow(
  row: any,
  lineNumber: number,
  invoices: ImportedInvoice[],
  fees: ImportedFee[],
  errors: ImportError[]
): void {
  const typ = row['Typ'] || '';
  const orderNumber = row['Bestellnummer'] || row['Alte Bestellnummer'] || '';
  const transactionNumber = row['Transaktionsnummer'] || '';
  const dateStr = row['Datum der Transaktionserstellung'] || '';
  const buyerName = row['Name des Käufers'] || row['Nutzername des Käufers'] || '';
  
  // Amounts
  const netAmount = parseEUNumber(row['Betrag abzügl. Kosten']);
  const grossAmount = parseEUNumber(row['Transaktionsbetrag (inkl. Kosten)']);
  const itemSubtotal = parseEUNumber(row['Zwischensumme Artikel']);
  const shippingCost = parseEUNumber(row['Verpackung und Versand']);
  const vatCollected = parseEUNumber(row['Von eBay eingezogene Steuer']);
  
  // Fees
  const fixedFee = parseEUNumber(row['Fixer Anteil der Verkaufsprovision']);
  const variableFee = parseEUNumber(row['Variabler Anteil der Verkaufsprovision']);
  const internationalFee = parseEUNumber(row['Internationale Gebühr']);
  
  const currency = row['Auszahlungswährung'] || row['Transaktionswährung'] || 'EUR';
  const description = row['Beschreibung'] || row['Angebotstitel'] || '';
  const referenceNumber = row['Referenznummer'] || '';

  const transactionDate = parseDate(dateStr);

  // Handle different transaction types
  if (typ === 'Bestellung') {
    // This is a sale (AUSGANG)
    const vatAmount = vatCollected || (grossAmount - itemSubtotal - shippingCost);
    
    invoices.push({
      invoiceNumber: orderNumber || transactionNumber,
      orderNumber,
      platformOrderId: orderNumber,
      transactionDate,
      customerName: buyerName,
      netAmount: Math.abs(netAmount),
      vatAmount: Math.abs(vatAmount),
      grossAmount: Math.abs(grossAmount),
      currency,
      platform: 'EBAY',
      type: 'AUSGANG',
      paymentMethod: 'eBay Managed Payments',
      referenceRaw: referenceNumber,
      description,
    });

    // Add fees
    const totalFees = Math.abs(fixedFee) + Math.abs(variableFee) + Math.abs(internationalFee);
    if (totalFees > 0) {
      fees.push({
        invoiceNumber: orderNumber || transactionNumber,
        feeType: 'PLATFORM_FEE',
        amount: totalFees,
        currency,
        description: `eBay Verkaufsgebühren`,
        transactionDate,
        platform: 'EBAY',
      });
    }
  } else if (typ === 'Rückerstattung') {
    // Refund - create negative invoice
    const vatAmount = vatCollected || (grossAmount - itemSubtotal - shippingCost);
    
    invoices.push({
      invoiceNumber: `REFUND-${orderNumber || transactionNumber}`,
      orderNumber,
      platformOrderId: orderNumber,
      transactionDate,
      customerName: buyerName,
      netAmount: -Math.abs(netAmount),
      vatAmount: -Math.abs(vatAmount),
      grossAmount: -Math.abs(grossAmount),
      currency,
      platform: 'EBAY',
      type: 'AUSGANG',
      paymentMethod: 'eBay Managed Payments',
      referenceRaw: referenceNumber,
      description: `Rückerstattung: ${description}`,
    });
  } else if (typ === 'Andere Gebühr') {
    // Other fees
    fees.push({
      invoiceNumber: orderNumber || transactionNumber || referenceNumber,
      feeType: 'OTHER',
      amount: Math.abs(netAmount),
      currency,
      description: description || 'eBay Gebühr',
      transactionDate,
      platform: 'EBAY',
    });
  }
}

function parseAmazonCSVRow(
  row: any,
  lineNumber: number,
  invoices: ImportedInvoice[],
  fees: ImportedFee[],
  errors: ImportError[]
): void {
  // Amazon CSV format (if they provide one)
  // This is a placeholder - adjust based on actual Amazon CSV format
  parseGenericCSVRow(row, lineNumber, invoices, fees, errors);
}

function parseShopifyCSVRow(
  row: any,
  lineNumber: number,
  invoices: ImportedInvoice[],
  fees: ImportedFee[],
  errors: ImportError[]
): void {
  // Shopify CSV format
  // This is a placeholder - adjust based on actual Shopify CSV format
  parseGenericCSVRow(row, lineNumber, invoices, fees, errors);
}

function parseGenericCSVRow(
  row: any,
  lineNumber: number,
  invoices: ImportedInvoice[],
  fees: ImportedFee[],
  errors: ImportError[]
): void {
  // Generic CSV parser - try to extract common fields
  const keys = Object.keys(row);
  
  // Try to find invoice number
  const invoiceNumberKey = keys.find(k => 
    k.toLowerCase().includes('rechnung') || 
    k.toLowerCase().includes('invoice') ||
    k.toLowerCase().includes('order')
  );
  
  // Try to find date
  const dateKey = keys.find(k => 
    k.toLowerCase().includes('datum') || 
    k.toLowerCase().includes('date')
  );
  
  // Try to find amounts
  const amountKeys = keys.filter(k => 
    k.toLowerCase().includes('betrag') || 
    k.toLowerCase().includes('amount') ||
    k.toLowerCase().includes('total')
  );

  if (!invoiceNumberKey || !dateKey || amountKeys.length === 0) {
    // Not enough data to create an invoice
    return;
  }

  const invoiceNumber = row[invoiceNumberKey];
  const transactionDate = parseDate(row[dateKey]);
  const grossAmount = parseEUNumber(row[amountKeys[0]]);

  invoices.push({
    invoiceNumber,
    transactionDate,
    netAmount: grossAmount / 1.19, // Assume 19% VAT
    vatAmount: grossAmount - (grossAmount / 1.19),
    grossAmount,
    currency: 'EUR',
    platform: 'OTHER',
    type: 'EINGANG',
  });
}

// ============================================================================
// PDF PARSER
// ============================================================================

export async function parsePDF(
  content: Buffer,
  fileName: string,
  platform: Platform
): Promise<{
  invoices: ImportedInvoice[];
  fees: ImportedFee[];
  errors: ImportError[];
}> {
  const invoices: ImportedInvoice[] = [];
  const fees: ImportedFee[] = [];
  const errors: ImportError[] = [];

  try {
    // Extract text from PDF using pdf-parse
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(content);
    const text = pdfData.text;

    console.log(`[PDF Parser] Extracted ${text.length} characters from ${fileName}`);

    // Detect platform from content
    const detectedPlatform = platform !== 'NONE' 
      ? platform 
      : detectPlatform(text, fileName, undefined);

    if (detectedPlatform === 'AMAZON') {
      parseAmazonPDF(text, fileName, invoices, fees, errors);
    } else if (detectedPlatform === 'EBAY') {
      parseEbayPDF(text, fileName, invoices, fees, errors);
    } else {
      // Use AI extraction as fallback
      errors.push({
        fileName,
        error: 'Platform not detected, AI extraction needed',
        details: 'PDF will be processed with AI extraction',
      });
    }
  } catch (error) {
    errors.push({
      fileName,
      error: 'PDF parsing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }

  return { invoices, fees, errors };
}

function parseAmazonPDF(
  text: string,
  fileName: string,
  invoices: ImportedInvoice[],
  fees: ImportedFee[],
  errors: ImportError[]
): void {
  try {
    // Extract invoice number
    const invNumberMatch = text.match(/Rechnungsnummer:\s*(INV-[A-Z0-9-]+)/i) ||
                          text.match(/Invoice Number:\s*(INV-[A-Z0-9-]+)/i);
    const invoiceNumber = invNumberMatch ? invNumberMatch[1] : fileName.replace('.pdf', '');

    // Extract date
    const dateMatch = text.match(/Rechnungsdatum:\s*(\d{2}\/\d{2}\/\d{4})/i) ||
                     text.match(/Invoice Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
    const transactionDate = dateMatch ? parseDate(dateMatch[1]) : new Date();

    // Extract customer/supplier name
    const customerMatch = text.match(/Leistungsempfänger:\s*([^\n]+)/i) ||
                         text.match(/Recipient:\s*([^\n]+)/i);
    const customerName = customerMatch ? customerMatch[1].trim() : '';

    // Extract totals
    const nettoMatch = text.match(/Nettobetrag:\s*EUR\s*([\d.,]+)/i);
    const ustMatch = text.match(/USt:\s*EUR\s*([\d.,]+)/i);
    const bruttoMatch = text.match(/Bruttobetrag:\s*EUR\s*([\d.,]+)/i);

    const netAmount = nettoMatch ? parseEUNumber(nettoMatch[1]) : 0;
    const vatAmount = ustMatch ? parseEUNumber(ustMatch[1]) : 0;
    const grossAmount = bruttoMatch ? parseEUNumber(bruttoMatch[1]) : netAmount + vatAmount;

    // Determine if this is a credit note
    const isCreditNote = text.toLowerCase().includes('gutschrift') || 
                        text.toLowerCase().includes('credit note') ||
                        fileName.toLowerCase().includes('cn-');

    // Amazon invoices are typically expenses (EINGANG)
    const type: 'EINGANG' | 'AUSGANG' = 'EINGANG';

    invoices.push({
      invoiceNumber: isCreditNote ? `CN-${invoiceNumber}` : invoiceNumber,
      transactionDate,
      customerName,
      netAmount: isCreditNote ? -Math.abs(netAmount) : Math.abs(netAmount),
      vatAmount: isCreditNote ? -Math.abs(vatAmount) : Math.abs(vatAmount),
      grossAmount: isCreditNote ? -Math.abs(grossAmount) : Math.abs(grossAmount),
      currency: 'EUR',
      platform: 'AMAZON',
      type,
      description: isCreditNote ? 'Amazon Gutschrift' : 'Amazon Rechnung',
    });

    // Extract service lines for fees
    const serviceMatch = text.match(/Service.*?EUR\s*([\d.,]+)/gi);
    if (serviceMatch) {
      serviceMatch.forEach((service, idx) => {
        const amountMatch = service.match(/EUR\s*([\d.,]+)/);
        if (amountMatch) {
          fees.push({
            invoiceNumber,
            feeType: 'SHIPPING_COST',
            amount: parseEUNumber(amountMatch[1]),
            currency: 'EUR',
            description: 'Amazon Shipping Services',
            transactionDate,
            platform: 'AMAZON',
          });
        }
      });
    }
  } catch (error) {
    errors.push({
      fileName,
      error: 'Amazon PDF parsing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseEbayPDF(
  text: string,
  fileName: string,
  invoices: ImportedInvoice[],
  fees: ImportedFee[],
  errors: ImportError[]
): void {
  try {
    // eBay Abrechnungsbericht (monthly statement)
    
    // Extract period
    const periodMatch = text.match(/Zeitraum:\s*(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/i);
    const startDate = periodMatch ? parseDate(periodMatch[1]) : new Date();
    const endDate = periodMatch ? parseDate(periodMatch[2]) : new Date();

    // Extract report number
    const reportNumberMatch = text.match(/Berichtsnummer\s*([A-Za-z0-9-]+)/i);
    const reportNumber = reportNumberMatch ? reportNumberMatch[1] : fileName.replace('.pdf', '');

    // Extract totals
    const bestellungenMatch = text.match(/Bestellungen.*?€\s*([\d.,]+)/i);
    const rueckerstattungenMatch = text.match(/Rückerstattungen.*?-€\s*([\d.,]+)/i);
    const gebuehrenMatch = text.match(/Sonstige Gebühren.*?-€\s*([\d.,]+)/i);
    const auszahlungenMatch = text.match(/Auszahlungen.*?-€\s*([\d.,]+)/i);
    const schlussbetragMatch = text.match(/Schlussbetrag.*?€\s*([\d.,]+)/i);

    const bestellungen = bestellungenMatch ? parseEUNumber(bestellungenMatch[1]) : 0;
    const rueckerstattungen = rueckerstattungenMatch ? parseEUNumber(rueckerstattungenMatch[1]) : 0;
    const gebuhren = gebuehrenMatch ? parseEUNumber(gebuehrenMatch[1]) : 0;
    const auszahlungen = auszahlungenMatch ? parseEUNumber(auszahlungenMatch[1]) : 0;
    const schlussbetrag = schlussbetragMatch ? parseEUNumber(schlussbetragMatch[1]) : 0;

    // Create invoice for sales
    if (bestellungen > 0) {
      const netAmount = bestellungen / 1.19; // Assume 19% VAT
      const vatAmount = bestellungen - netAmount;

      invoices.push({
        invoiceNumber: `EBAY-${reportNumber}-SALES`,
        transactionDate: endDate,
        netAmount,
        vatAmount,
        grossAmount: bestellungen,
        currency: 'EUR',
        platform: 'EBAY',
        type: 'AUSGANG',
        description: `eBay Verkäufe ${periodMatch ? periodMatch[1] + ' - ' + periodMatch[2] : ''}`,
      });
    }

    // Create invoice for refunds (negative)
    if (rueckerstattungen > 0) {
      const netAmount = rueckerstattungen / 1.19;
      const vatAmount = rueckerstattungen - netAmount;

      invoices.push({
        invoiceNumber: `EBAY-${reportNumber}-REFUNDS`,
        transactionDate: endDate,
        netAmount: -netAmount,
        vatAmount: -vatAmount,
        grossAmount: -rueckerstattungen,
        currency: 'EUR',
        platform: 'EBAY',
        type: 'AUSGANG',
        description: `eBay Rückerstattungen ${periodMatch ? periodMatch[1] + ' - ' + periodMatch[2] : ''}`,
      });
    }

    // Create fee records
    if (gebuhren > 0) {
      fees.push({
        invoiceNumber: `EBAY-${reportNumber}-FEES`,
        feeType: 'PLATFORM_FEE',
        amount: gebuhren,
        currency: 'EUR',
        description: 'eBay Sonstige Gebühren',
        transactionDate: endDate,
        platform: 'EBAY',
      });
    }
  } catch (error) {
    errors.push({
      fileName,
      error: 'eBay PDF parsing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// SUMMARY CALCULATION
// ============================================================================

export function calculateSummary(
  invoices: ImportedInvoice[],
  fees: ImportedFee[]
): ImportSummary {
  const platformCounts = {
    EBAY: 0,
    AMAZON: 0,
    SHOPIFY: 0,
    OTHER: 0,
  };

  let netAmount = 0;
  let vatAmount = 0;
  let grossAmount = 0;
  let totalFees = 0;

  invoices.forEach(inv => {
    platformCounts[inv.platform]++;
    netAmount += inv.netAmount;
    vatAmount += inv.vatAmount;
    grossAmount += inv.grossAmount;
  });

  fees.forEach(fee => {
    totalFees += fee.amount;
  });

  return {
    platformCounts,
    totals: {
      netAmount,
      vatAmount,
      grossAmount,
      totalFees,
    },
    counts: {
      successfulInvoices: invoices.length,
      successfulFees: fees.length,
      skippedRows: 0,
      failedRows: 0,
    },
  };
}
