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

  // Amazon detection - ENHANCED ✨
  if (
    // Company names
    lowerContent.includes('amazon eu s.à r.l') ||
    lowerContent.includes('amazon.de') ||
    lowerContent.includes('amazon services') ||
    lowerContent.includes('amazon europe') ||
    lowerContent.includes('amazon media eu') ||
    lowerContent.includes('amazon seller central') ||
    // Document types
    lowerContent.includes('zahlungsaufstellung') ||
    lowerContent.includes('payment summary') ||
    lowerContent.includes('settlement report') ||
    lowerContent.includes('transaction report') ||
    // CSV headers (specific Amazon columns)
    lowerContent.includes('artikelpreise gesamt') ||
    lowerContent.includes('amazon-gebühren') ||
    lowerContent.includes('fba-gebühren') ||
    lowerContent.includes('transaktionstyp') ||
    lowerContent.includes('transaktionsnummer') ||
    // File names
    lowerFileName.includes('amazon') ||
    lowerFileName.includes('inv-de-') ||
    lowerFileName.includes('de-aeu-') ||
    lowerFileName.includes('de-cn-aeu-') ||
    lowerFileName.includes('settlement') ||
    lowerFileName.includes('transaction') ||
    // Invoice patterns
    /inv-de-\d+/.test(lowerFileName) ||
    /de-aeu-\d+/.test(lowerFileName) ||
    /de-cn-aeu-\d+/.test(lowerFileName)
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

  // Clean the string
  const cleaned = dateStr.trim();

  // Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
  if (cleaned.includes('-') && cleaned.length >= 10) {
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  // ENHANCED: Try DD.MM.YYYY format (common in EU) ✨
  const ddmmyyyyMatch = cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  // ENHANCED: Try DD/MM/YYYY format (Amazon often uses this) ✨
  const ddmmyyyySlashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyySlashMatch) {
    const [, day, month, year] = ddmmyyyySlashMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  // ENHANCED: Try MM/DD/YYYY format (US format, sometimes used) ✨
  const mmddyyyySlashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (mmddyyyySlashMatch) {
    const [, first, second, year] = mmddyyyySlashMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    // Assume DD/MM if day > 12, otherwise try MM/DD
    if (parseInt(first) > 12) {
      return new Date(`${fullYear}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`);
    }
    return new Date(`${fullYear}-${first.padStart(2, '0')}-${second.padStart(2, '0')}`);
  }

  // ENHANCED: Try DD-MM-YYYY format ✨
  const ddmmyyyyDashMatch = cleaned.match(/(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (ddmmyyyyDashMatch) {
    const [, day, month, year] = ddmmyyyyDashMatch;
    return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  // ENHANCED: Try YYYYMMDD format (compact format) ✨
  const yyyymmddMatch = cleaned.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch;
    return new Date(`${year}-${month}-${day}`);
  }

  // Fallback to current date
  console.warn(`[parseDate] Could not parse date: "${dateStr}", using current date`);
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
    // Auto-detect delimiter (comma or semicolon)
    const firstLine = content.split('\n')[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    console.log(`[CSV Parser] Auto-detected delimiter: '${delimiter}'`);

    // Parse CSV with flexible options
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
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
  /**
   * ENHANCED Amazon Transaction CSV Format Support ✨
   * 
   * Supported Columns (German/English):
   * - Datum/Date
   * - Transaktionstyp/Typ/Type
   * - Transaktionsnummer/Bestellnummer/Order ID
   * - Produktdetails/Beschreibung/Description
   * - Artikelpreise gesamt/Produkt-Umsätze/Product Sales
   * - Gesamtsumme der Aktionsrabatte/Versand-Gutschriften/Shipping Credits
   * - Amazon-Gebühren/Gebühren/Fees
   * - FBA-Gebühren/FBA Fees
   * - Summe (EUR)/Gesamt/Total
   * - Werbekosten/Advertising Costs
   * - Lagergebühren/Storage Fees
   * 
   * Transaction Types:
   * - Bezahlung der Bestellung/Payment = Sale
   * - Erstattung/Refund = Refund
   * - Service-Gebühren/Service Fees = Platform fees
   * - Bei Amazon gekaufte Versandetiketten/Shipping labels
   * - Werbekampagne/Advertising Campaign
   * - Lagergebühren/Storage Fees
   * - FBA-Lagergebühren/FBA Storage Fees
   */

  try {
    // Extract fields - ENHANCED with more variations ✨
    const datum = row['Datum'] || row['datum'] || row['Date'] || row['date'] || 
                  row['Transaktionsdatum'] || row['transaktionsdatum'] || '';
    
    const typ = row['Transaktionstyp'] || row['transaktionstyp'] || 
                row['Typ'] || row['typ'] || row['Type'] || row['type'] || 
                row['Transaction Type'] || row['transaction type'] || '';
    
    const bestellnummer = row['Transaktionsnummer'] || row['transaktionsnummer'] || 
                         row['Bestellnummer'] || row['bestellnummer'] || 
                         row['Order ID'] || row['order-id'] || row['order id'] ||
                         row['Settlement ID'] || row['settlement id'] || '';
    
    const beschreibung = row['Produktdetails'] || row['produktdetails'] || 
                        row['Beschreibung'] || row['beschreibung'] || 
                        row['Description'] || row['description'] ||
                        row['Produktname'] || row['produktname'] || '';
    
    // Amounts - ENHANCED with more column variations ✨
    const produktUmsaetze = parseEUNumber(
      row['Artikelpreise gesamt'] || row['artikelpreise gesamt'] || 
      row['Produkt-Umsätze'] || row['produkt-umsätze'] ||
      row['Product Sales'] || row['product sales'] ||
      row['Principal'] || row['principal'] || '0'
    );
    
    const versandGutschriften = parseEUNumber(
      row['Gesamtsumme der Aktionsrabatte'] || row['gesamtsumme der aktionsrabatte'] ||
      row['Versand-Gutschriften'] || row['versand-gutschriften'] ||
      row['Shipping Credits'] || row['shipping credits'] ||
      row['Promotional Rebates'] || row['promotional rebates'] || '0'
    );
    
    const gebuehren = parseEUNumber(
      row['Amazon-Gebühren'] || row['amazon-gebühren'] ||
      row['Gebühren'] || row['gebühren'] || 
      row['Fees'] || row['fees'] ||
      row['Commission'] || row['commission'] || '0'
    );
    
    const fbaGebuehren = parseEUNumber(
      row['FBA-Gebühren'] || row['fba-gebühren'] ||
      row['FBA Fees'] || row['fba fees'] ||
      row['Fulfillment Fees'] || row['fulfillment fees'] || '0'
    );
    
    const gesamt = parseEUNumber(
      row['Summe (EUR)'] || row['summe (eur)'] ||
      row['Gesamt'] || row['gesamt'] || 
      row['Total'] || row['total'] ||
      row['Net Proceeds'] || row['net proceeds'] || '0'
    );
    
    const werbekosten = parseEUNumber(
      row['Werbekosten'] || row['werbekosten'] ||
      row['Advertising Costs'] || row['advertising costs'] ||
      row['Sponsored Products'] || row['sponsored products'] || '0'
    );
    
    const lagergebuehren = parseEUNumber(
      row['Lagergebühren'] || row['lagergebühren'] ||
      row['Storage Fees'] || row['storage fees'] ||
      row['FBA Storage Fees'] || row['fba storage fees'] || '0'
    );
    
    const andere = parseEUNumber(
      row['Andere'] || row['andere'] || 
      row['Other'] || row['other'] || '0'
    );

    if (!datum || !typ) {
      // Skip rows without essential data
      return;
    }

    const transactionDate = parseDate(datum);
    const orderNumber = bestellnummer || `AMAZON-${lineNumber}`;
    const description = beschreibung || typ;

    // Calculate amounts
    const grossAmount = produktUmsaetze + versandGutschriften; // Total revenue
    const totalFees = Math.abs(gebuehren) + Math.abs(fbaGebuehren);
    const netAmount = grossAmount - totalFees; // Net after fees
    
    // Estimate VAT (19% is typical in Germany)
    const vatAmount = grossAmount > 0 ? grossAmount - (grossAmount / 1.19) : 0;
    const netBeforeVat = grossAmount - vatAmount;

    // Process based on transaction type
    if (typ.includes('Bezahlung') || typ.includes('Payment')) {
      // Sale transaction
      if (grossAmount > 0) {
        invoices.push({
          invoiceNumber: orderNumber,
          orderNumber,
          platformOrderId: orderNumber,
          transactionDate,
          customerName: 'Amazon Kunde',
          netAmount: netBeforeVat,
          vatAmount,
          grossAmount,
          currency: 'EUR',
          platform: 'AMAZON',
          type: 'AUSGANG',
          paymentMethod: 'Amazon Payments',
          referenceRaw: bestellnummer,
          description,
        });

        // Add fees as separate records
        if (totalFees > 0) {
          fees.push({
            invoiceNumber: orderNumber,
            feeType: 'PLATFORM_FEE',
            amount: totalFees,
            currency: 'EUR',
            description: `Amazon Gebühren (Verkauf + FBA)`,
            transactionDate,
            platform: 'AMAZON',
          });
        }
      }
    } else if (typ.includes('Erstattung') || typ.includes('Refund')) {
      // Refund transaction
      const refundGross = Math.abs(produktUmsaetze + versandGutschriften);
      const refundVat = refundGross > 0 ? refundGross - (refundGross / 1.19) : 0;
      const refundNet = refundGross - refundVat;

      invoices.push({
        invoiceNumber: `REFUND-${orderNumber}`,
        orderNumber,
        platformOrderId: orderNumber,
        transactionDate,
        customerName: 'Amazon Kunde',
        netAmount: -refundNet,
        vatAmount: -refundVat,
        grossAmount: -refundGross,
        currency: 'EUR',
        platform: 'AMAZON',
        type: 'AUSGANG',
        paymentMethod: 'Amazon Payments',
        referenceRaw: bestellnummer,
        description: `Erstattung: ${description}`,
      });

      // Refund fees (if any)
      if (totalFees > 0) {
        fees.push({
          invoiceNumber: `REFUND-${orderNumber}`,
          feeType: 'PLATFORM_FEE',
          amount: -totalFees,
          currency: 'EUR',
          description: `Amazon Gebühren (Erstattung)`,
          transactionDate,
          platform: 'AMAZON',
        });
      }
    } else if (typ.includes('Service-Gebühren') || typ.includes('Service Fees')) {
      // Service fees (subscription, etc.)
      if (totalFees > 0 || Math.abs(gesamt) > 0) {
        fees.push({
          invoiceNumber: `FEE-${datum.replace(/\./g, '-')}`,
          feeType: 'PLATFORM_FEE',
          amount: Math.abs(totalFees || gesamt),
          currency: 'EUR',
          description: description || 'Amazon Service-Gebühren',
          transactionDate,
          platform: 'AMAZON',
        });
      }
    } else if (typ.includes('Versandetiketten') || typ.includes('Shipping')) {
      // Shipping labels
      if (Math.abs(gesamt) > 0) {
        fees.push({
          invoiceNumber: `SHIPPING-${orderNumber}`,
          feeType: 'SHIPPING_COST',
          amount: Math.abs(gesamt),
          currency: 'EUR',
          description: 'Amazon Versandetikett',
          transactionDate,
          platform: 'AMAZON',
        });
      }
    } else if (typ.includes('Werbekampagne') || typ.includes('Advertising') || typ.includes('Sponsored')) {
      // ENHANCED: Advertising costs ✨
      if (Math.abs(werbekosten) > 0 || Math.abs(gesamt) > 0) {
        fees.push({
          invoiceNumber: `AD-${orderNumber || datum.replace(/\./g, '-')}`,
          feeType: 'OTHER',
          amount: Math.abs(werbekosten || gesamt),
          currency: 'EUR',
          description: `Amazon Werbekosten: ${description || 'Sponsored Products'}`,
          transactionDate,
          platform: 'AMAZON',
        });
      }
    } else if (typ.includes('Lagergebühren') || typ.includes('Storage Fees') || typ.includes('FBA Storage')) {
      // ENHANCED: Storage fees ✨
      if (Math.abs(lagergebuehren) > 0 || Math.abs(gesamt) > 0) {
        fees.push({
          invoiceNumber: `STORAGE-${datum.replace(/\./g, '-')}`,
          feeType: 'OTHER',
          amount: Math.abs(lagergebuehren || gesamt),
          currency: 'EUR',
          description: `Amazon Lagergebühren: ${description || 'FBA Storage'}`,
          transactionDate,
          platform: 'AMAZON',
        });
      }
    }

    // ENHANCED: Process advertising costs if present ✨
    if (werbekosten > 0 && !typ.includes('Werbekampagne') && !typ.includes('Advertising')) {
      fees.push({
        invoiceNumber: orderNumber,
        feeType: 'OTHER',
        amount: werbekosten,
        currency: 'EUR',
        description: 'Amazon Werbekosten (Sponsored Products)',
        transactionDate,
        platform: 'AMAZON',
      });
    }

    // ENHANCED: Process storage fees if present ✨
    if (lagergebuehren > 0 && !typ.includes('Lagergebühren') && !typ.includes('Storage')) {
      fees.push({
        invoiceNumber: orderNumber,
        feeType: 'OTHER',
        amount: lagergebuehren,
        currency: 'EUR',
        description: 'Amazon Lagergebühren',
        transactionDate,
        platform: 'AMAZON',
      });
    }
  } catch (error) {
    errors.push({
      fileName: 'Amazon CSV',
      lineNumber,
      error: 'Amazon row parsing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
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
    /**
     * Amazon PDF can be:
     * 1. Zahlungsaufstellung (Payment Summary) - Monthly statement
     * 2. Rechnung (Invoice) - Individual invoice (INV-DE-...)
     * 3. Gutschrift (Credit Note) - Credit note (DE-CN-AEU-...)
     */

    // Check if this is a Zahlungsaufstellung (Payment Summary)
    if (text.includes('Zahlungsaufstellung') || text.includes('Payment Summary')) {
      parseAmazonZahlungsaufstellung(text, fileName, invoices, fees, errors);
    } else {
      // Individual invoice or credit note
      parseAmazonInvoice(text, fileName, invoices, fees, errors);
    }
  } catch (error) {
    errors.push({
      fileName,
      error: 'Amazon PDF parsing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseAmazonZahlungsaufstellung(
  text: string,
  fileName: string,
  invoices: ImportedInvoice[],
  fees: ImportedFee[],
  errors: ImportError[]
): void {
  /**
   * Amazon Zahlungsaufstellung Format:
   * - Abrechnungszeitraum: 18.10.2025 – 1.11.2025
   * - Verkäufe: 1.135,72 €
   * - Erstattungen: -527,24 €
   * - Ausgaben (Amazon-Gebühren): -187,24 €
   * - Nettoerträge: 421,24 €
   */

  try {
    // Extract period
    const periodMatch = text.match(/Abrechnungszeitraum[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})\s*[–-]\s*(\d{1,2}\.\d{1,2}\.\d{4})/i);
    const startDate = periodMatch ? parseDate(periodMatch[1]) : new Date();
    const endDate = periodMatch ? parseDate(periodMatch[2]) : new Date();

    // Use end date as transaction date
    const transactionDate = endDate;

    // Extract amounts (EU format: 1.135,72 €)
    const verkaufeMatch = text.match(/Verkäufe[:\s]*([-\d.,]+)\s*€/i);
    const erstattungenMatch = text.match(/Erstattungen[:\s]*([-\d.,]+)\s*€/i);
    const ausgabenMatch = text.match(/Ausgaben[:\s]*([-\d.,]+)\s*€/i) ||
                          text.match(/Amazon-Gebühren[:\s]*([-\d.,]+)\s*€/i);
    const nettoertraegeMatch = text.match(/Nettoerträge[:\s]*([-\d.,]+)\s*€/i);

    const verkaufe = verkaufeMatch ? parseEUNumber(verkaufeMatch[1]) : 0;
    const erstattungen = erstattungenMatch ? parseEUNumber(erstattungenMatch[1]) : 0;
    const ausgaben = ausgabenMatch ? Math.abs(parseEUNumber(ausgabenMatch[1])) : 0;
    const nettoertrage = nettoertraegeMatch ? parseEUNumber(nettoertraegeMatch[1]) : 0;

    // Create invoice for sales
    if (verkaufe > 0) {
      const vatAmount = verkaufe - (verkaufe / 1.19); // 19% VAT
      const netAmount = verkaufe - vatAmount;

      const invoiceNumber = `AMAZON-SALES-${startDate.toISOString().slice(0, 10)}-${endDate.toISOString().slice(0, 10)}`;

      invoices.push({
        invoiceNumber,
        transactionDate,
        customerName: 'Amazon Kunden (Sammelrechnung)',
        netAmount,
        vatAmount,
        grossAmount: verkaufe,
        currency: 'EUR',
        platform: 'AMAZON',
        type: 'AUSGANG',
        paymentMethod: 'Amazon Payments',
        description: `Amazon Verkäufe ${periodMatch ? periodMatch[0] : ''}`,
      });
    }

    // Create invoice for refunds (negative)
    if (erstattungen < 0) {
      const refundGross = Math.abs(erstattungen);
      const refundVat = refundGross - (refundGross / 1.19);
      const refundNet = refundGross - refundVat;

      const invoiceNumber = `AMAZON-REFUNDS-${startDate.toISOString().slice(0, 10)}-${endDate.toISOString().slice(0, 10)}`;

      invoices.push({
        invoiceNumber,
        transactionDate,
        customerName: 'Amazon Kunden (Erstattungen)',
        netAmount: -refundNet,
        vatAmount: -refundVat,
        grossAmount: erstattungen,
        currency: 'EUR',
        platform: 'AMAZON',
        type: 'AUSGANG',
        paymentMethod: 'Amazon Payments',
        description: `Amazon Erstattungen ${periodMatch ? periodMatch[0] : ''}`,
      });
    }

    // Create fee record for Amazon fees
    if (ausgaben > 0) {
      const feeInvoiceNumber = `AMAZON-FEES-${startDate.toISOString().slice(0, 10)}-${endDate.toISOString().slice(0, 10)}`;

      fees.push({
        invoiceNumber: feeInvoiceNumber,
        feeType: 'PLATFORM_FEE',
        amount: ausgaben,
        currency: 'EUR',
        description: `Amazon Gebühren ${periodMatch ? periodMatch[0] : ''}`,
        transactionDate,
        platform: 'AMAZON',
      });
    }
  } catch (error) {
    errors.push({
      fileName,
      error: 'Amazon Zahlungsaufstellung parsing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

function parseAmazonInvoice(
  text: string,
  fileName: string,
  invoices: ImportedInvoice[],
  fees: ImportedFee[],
  errors: ImportError[]
): void {
  /**
   * Amazon Individual Invoice Format:
   * - Rechnungsnummer: INV-DE-340820-2025-123234
   * - Rechnungsdatum: 30/09/2025
   * - Nettobetrag: EUR 10.61
   * - USt: EUR 2.02
   * - Bruttobetrag: EUR 12.63
   */

  try {
    // Extract invoice number
    const invNumberMatch = text.match(/Rechnungsnummer[:\s]*(INV-[A-Z0-9-]+)/i) ||
                          text.match(/Invoice Number[:\s]*(INV-[A-Z0-9-]+)/i) ||
                          text.match(/(DE-[A-Z]+-\d+-\d+)/i);
    const invoiceNumber = invNumberMatch ? invNumberMatch[1] : fileName.replace('.pdf', '');

    // Extract date
    const dateMatch = text.match(/Rechnungsdatum[:\s]*(\d{2}\/\d{2}\/\d{4})/i) ||
                     text.match(/Invoice Date[:\s]*(\d{2}\/\d{2}\/\d{4})/i) ||
                     text.match(/(\d{2}\.\d{2}\.\d{4})/i);
    const transactionDate = dateMatch ? parseDate(dateMatch[1]) : new Date();

    // Extract customer/supplier name
    const customerMatch = text.match(/Leistungsempfänger[:\s]*([^\n]+)/i) ||
                         text.match(/Recipient[:\s]*([^\n]+)/i);
    const customerName = customerMatch ? customerMatch[1].trim() : 'Amazon EU S.à r.l.';

    // Extract totals
    const nettoMatch = text.match(/Nettobetrag[:\s]*EUR\s*([\d.,]+)/i);
    const ustMatch = text.match(/USt[:\s]*EUR\s*([\d.,]+)/i);
    const bruttoMatch = text.match(/Bruttobetrag[:\s]*EUR\s*([\d.,]+)/i);

    const netAmount = nettoMatch ? parseEUNumber(nettoMatch[1]) : 0;
    const vatAmount = ustMatch ? parseEUNumber(ustMatch[1]) : 0;
    const grossAmount = bruttoMatch ? parseEUNumber(bruttoMatch[1]) : netAmount + vatAmount;

    // Determine if this is a credit note
    const isCreditNote = text.toLowerCase().includes('gutschrift') || 
                        text.toLowerCase().includes('credit note') ||
                        fileName.toLowerCase().includes('cn-') ||
                        invoiceNumber.includes('CN');

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
      error: 'Amazon invoice parsing failed',
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
    // Map NONE to OTHER for counting
    const platform = inv.platform === 'NONE' ? 'OTHER' : inv.platform;
    if (platform in platformCounts) {
      platformCounts[platform as keyof typeof platformCounts]++;
    }
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
