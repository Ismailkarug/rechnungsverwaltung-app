/**
 * Unified Platform Import API
 * Handles CSV, PDF, and ZIP imports for eBay, Amazon, and Shopify
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/s3';
import AdmZip from 'adm-zip';
import { requireAuth } from '@/lib/api-auth';
import { Platform } from '@prisma/client';
import {
  parseCSV,
  parsePDF,
  detectPlatform,
  calculateSummary,
  ImportResult,
  ImportedInvoice,
  ImportedFee,
  ImportError,
} from '@/src/lib/platform-import-utils';

export const maxDuration = 300; // 5 minutes for large imports
export const dynamic = 'force-dynamic';

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const manualPlatform = (formData.get('platform') as string) || 'NONE';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Keine Dateien hochgeladen' },
        { status: 400 }
      );
    }

    console.log(`[Unified Import] Starting import of ${files.length} files`);
    console.log(`[Unified Import] Manual platform: ${manualPlatform}`);

    const result: ImportResult = {
      success: true,
      totalFiles: files.length,
      processedFiles: 0,
      skippedFiles: 0,
      failedFiles: 0,
      invoices: [],
      fees: [],
      errors: [],
      summary: {
        platformCounts: { EBAY: 0, AMAZON: 0, SHOPIFY: 0, OTHER: 0 },
        totals: { netAmount: 0, vatAmount: 0, grossAmount: 0, totalFees: 0 },
        counts: { successfulInvoices: 0, successfulFees: 0, skippedRows: 0, failedRows: 0 },
      },
    };

    // Process each file
    for (const file of files) {
      try {
        const fileName = file.name;
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const fileExtension = fileName.split('.').pop()?.toLowerCase();

        console.log(`[Unified Import] Processing: ${fileName} (${fileExtension})`);

        if (fileExtension === 'zip') {
          // Handle ZIP file
          await processZipFile(fileBuffer, fileName, manualPlatform as Platform, result);
        } else if (fileExtension === 'csv') {
          // Handle CSV file
          await processCSVFile(fileBuffer, fileName, manualPlatform as Platform, result);
        } else if (fileExtension === 'pdf') {
          // Handle PDF file
          await processPDFFile(fileBuffer, fileName, manualPlatform as Platform, result);
        } else {
          result.skippedFiles++;
          result.errors.push({
            fileName,
            error: 'Unsupported file type',
            details: `File extension .${fileExtension} is not supported`,
          });
        }

        result.processedFiles++;
      } catch (error) {
        result.failedFiles++;
        result.errors.push({
          fileName: file.name,
          error: 'File processing failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Calculate summary
    result.summary = calculateSummary(result.invoices, result.fees);

    // Save to database
    await saveToDatabase(result, user.id);

    console.log(`[Unified Import] Completed. Summary:`, result.summary);

    return NextResponse.json({
      success: true,
      message: `${result.summary.counts.successfulInvoices} Rechnungen erfolgreich importiert`,
      result,
    });
  } catch (error) {
    console.error('[Unified Import] Error:', error);
    return NextResponse.json(
      {
        error: 'Import fehlgeschlagen',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// FILE PROCESSORS
// ============================================================================

async function processZipFile(
  buffer: Buffer,
  fileName: string,
  manualPlatform: Platform,
  result: ImportResult
): Promise<void> {
  console.log(`[ZIP Processor] Extracting: ${fileName}`);

  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    console.log(`[ZIP Processor] Found ${zipEntries.length} files in ZIP`);

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const entryName = entry.entryName;
      const entryExtension = entryName.split('.').pop()?.toLowerCase();
      const entryBuffer = entry.getData();

      console.log(`[ZIP Processor] Processing entry: ${entryName}`);

      if (entryExtension === 'csv') {
        await processCSVFile(entryBuffer, entryName, manualPlatform, result);
      } else if (entryExtension === 'pdf') {
        await processPDFFile(entryBuffer, entryName, manualPlatform, result);
      } else {
        result.skippedFiles++;
        console.log(`[ZIP Processor] Skipped unsupported file: ${entryName}`);
      }
    }
  } catch (error) {
    result.errors.push({
      fileName,
      error: 'ZIP extraction failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function processCSVFile(
  buffer: Buffer,
  fileName: string,
  manualPlatform: Platform,
  result: ImportResult
): Promise<void> {
  console.log(`[CSV Processor] Processing: ${fileName}`);

  try {
    const content = buffer.toString('utf-8');
    
    // Detect platform
    const platform = manualPlatform !== 'NONE' 
      ? manualPlatform 
      : detectPlatform(content, fileName, undefined);

    console.log(`[CSV Processor] Detected platform: ${platform}`);

    // Parse CSV
    const parsed = parseCSV(content, platform);

    // Add to result
    result.invoices.push(...parsed.invoices);
    result.fees.push(...parsed.fees);
    result.errors.push(...parsed.errors);

    console.log(`[CSV Processor] Extracted ${parsed.invoices.length} invoices, ${parsed.fees.length} fees`);
  } catch (error) {
    result.errors.push({
      fileName,
      error: 'CSV processing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function processPDFFile(
  buffer: Buffer,
  fileName: string,
  manualPlatform: Platform,
  result: ImportResult
): Promise<void> {
  console.log(`[PDF Processor] Processing: ${fileName}`);

  try {
    // Parse PDF
    const parsed = await parsePDF(buffer, fileName, manualPlatform);

    // If parsing failed or no data extracted, try AI extraction
    if (parsed.invoices.length === 0 && parsed.errors.length > 0) {
      console.log(`[PDF Processor] Standard parsing failed, trying AI extraction`);
      const aiResult = await extractWithAI(buffer, fileName, manualPlatform);
      if (aiResult) {
        result.invoices.push(aiResult);
      }
    } else {
      // Add parsed results
      result.invoices.push(...parsed.invoices);
      result.fees.push(...parsed.fees);
      result.errors.push(...parsed.errors);
    }

    console.log(`[PDF Processor] Extracted ${parsed.invoices.length} invoices, ${parsed.fees.length} fees`);
  } catch (error) {
    result.errors.push({
      fileName,
      error: 'PDF processing failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// AI EXTRACTION (FALLBACK)
// ============================================================================

async function extractWithAI(
  buffer: Buffer,
  fileName: string,
  platform: Platform
): Promise<ImportedInvoice | null> {
  try {
    console.log(`[AI Extract] Processing: ${fileName}`);

    // Upload to S3
    const cloudStoragePath = await uploadFile(buffer, fileName);

    // Convert to base64
    const base64String = buffer.toString('base64');

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'file',
            file: {
              filename: fileName,
              file_data: `data:application/pdf;base64,${base64String}`,
            },
          },
          {
            type: 'text',
            text: `Extract invoice data from this PDF and return as JSON:
{
  "invoiceNumber": "Invoice number",
  "date": "Date in YYYY-MM-DD format",
  "supplier": "Supplier/issuer name",
  "netAmount": "Net amount as decimal (e.g. 157.83)",
  "vatAmount": "VAT amount as decimal (e.g. 29.99)",
  "grossAmount": "Gross/total amount as decimal (e.g. 187.82)",
  "currency": "Currency code (e.g. EUR)",
  "description": "Brief description"
}

IMPORTANT:
- Use dot (.) as decimal separator
- Remove all thousand separators
- Return ONLY the raw JSON object
- Do NOT wrap in markdown code blocks
- Do NOT add any explanation or text
- Just the JSON object starting with { and ending with }`,
          },
        ],
      },
    ];

    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 1000,
      }),
    });

    if (!llmResponse.ok) {
      console.error(`[AI Extract] LLM API error:`, llmResponse.status);
      return null;
    }

    const llmData = await llmResponse.json();
    
    // Clean LLM response (remove markdown code blocks)
    let rawContent = llmData.choices[0].message.content;
    console.log(`[AI Extract] Raw LLM response:`, rawContent);
    
    // Remove markdown code blocks
    rawContent = rawContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Extract JSON object if wrapped in text
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawContent = jsonMatch[0];
    }
    
    rawContent = rawContent.trim();
    
    let extractedData;
    try {
      extractedData = JSON.parse(rawContent);
      console.log(`[AI Extract] Extracted:`, extractedData);
    } catch (parseError) {
      console.error(`[AI Extract] JSON parsing failed:`, parseError);
      console.error(`[AI Extract] Cleaned content:`, rawContent);
      return null;
    }

    return {
      invoiceNumber: extractedData.invoiceNumber || fileName.replace('.pdf', ''),
      transactionDate: new Date(extractedData.date || new Date()),
      customerName: extractedData.supplier || '',
      netAmount: parseFloat(extractedData.netAmount) || 0,
      vatAmount: parseFloat(extractedData.vatAmount) || 0,
      grossAmount: parseFloat(extractedData.grossAmount) || 0,
      currency: extractedData.currency || 'EUR',
      platform: platform !== 'NONE' ? platform : 'OTHER',
      type: 'EINGANG',
      description: extractedData.description || '',
    };
  } catch (error) {
    console.error(`[AI Extract] Error:`, error);
    return null;
  }
}

// ============================================================================
// DATABASE SAVE
// ============================================================================

async function saveToDatabase(result: ImportResult, userId: string): Promise<void> {
  console.log(`[DB Save] Saving ${result.invoices.length} invoices and ${result.fees.length} fees`);

  try {
    // Save invoices
    for (const invoice of result.invoices) {
      try {
        // Check if invoice already exists
        const existing = await prisma.rechnung.findFirst({
          where: {
            rechnungsnummer: invoice.invoiceNumber,
            typ: invoice.type,
          },
        });

        if (existing) {
          console.log(`[DB Save] Invoice ${invoice.invoiceNumber} already exists, skipping`);
          continue;
        }

        // Create invoice
        await prisma.rechnung.create({
          data: {
            rechnungsnummer: invoice.invoiceNumber,
            datum: invoice.transactionDate,
            lieferant: invoice.customerName || 'Unbekannt',
            betragNetto: invoice.netAmount,
            mwstSatz: invoice.vatAmount > 0 ? '19' : '0',
            mwstBetrag: invoice.vatAmount,
            betragBrutto: invoice.grossAmount,
            typ: invoice.type,
            plattform: invoice.platform,
            platformOrderId: invoice.platformOrderId,
            paymentMethod: invoice.paymentMethod,
            referenceRaw: invoice.referenceRaw,
            beschreibung: invoice.description,
            userId,
          },
        });

        console.log(`[DB Save] Saved invoice: ${invoice.invoiceNumber}`);
      } catch (error) {
        console.error(`[DB Save] Error saving invoice ${invoice.invoiceNumber}:`, error);
        result.errors.push({
          fileName: invoice.invoiceNumber,
          error: 'Database save failed',
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Save fees
    for (const fee of result.fees) {
      try {
        // Find related invoice
        const relatedInvoice = await prisma.rechnung.findFirst({
          where: {
            rechnungsnummer: fee.invoiceNumber,
          },
        });

        if (!relatedInvoice) {
          console.log(`[DB Save] No related invoice found for fee: ${fee.invoiceNumber}`);
          continue;
        }

        // Create fee
        await prisma.platformFee.create({
          data: {
            rechnungId: relatedInvoice.id,
            plattform: fee.platform,
            typ: fee.feeType,
            beschreibung: fee.description,
            betrag: fee.amount,
          },
        });

        console.log(`[DB Save] Saved fee for invoice: ${fee.invoiceNumber}`);
      } catch (error) {
        console.error(`[DB Save] Error saving fee:`, error);
      }
    }

    console.log(`[DB Save] Completed`);
  } catch (error) {
    console.error(`[DB Save] Error:`, error);
    throw error;
  }
}
