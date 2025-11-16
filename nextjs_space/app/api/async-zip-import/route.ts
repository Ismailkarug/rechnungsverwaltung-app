
import { NextRequest, NextResponse } from 'next/server';
import AdmZip from 'adm-zip';
import { uploadFile } from '@/lib/s3';
import { prisma } from '@/lib/db';

// In-memory storage for import progress (in production, use Redis or DB)
const importProgress = new Map<string, {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: string[];
  status: 'processing' | 'completed' | 'failed';
  startTime: number;
}>();

// Generate unique import ID
function generateImportId(): string {
  return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Extract invoice data using AI
async function extractInvoiceData(pdfBuffer: Buffer, fileName: string, cloudPath: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    console.log(`[ZIP-IMPORT] Calling AI extraction for ${fileName} using base URL: ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/api/extract-invoice-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        fileBuffer: pdfBuffer.toString('base64'),
        cloudPath
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ZIP-IMPORT] AI extraction failed for ${fileName}:`, response.status, errorText);
      throw new Error(`AI extraction failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ZIP-IMPORT] AI extraction successful for ${fileName}:`, data);
    return data;
  } catch (error: any) {
    console.error(`[ZIP-IMPORT] Error in AI extraction for ${fileName}:`, error);
    throw error;
  }
}

// Process a batch of PDFs
async function processBatch(
  pdfs: { buffer: Buffer; fileName: string }[],
  importId: string,
  skipDuplicates: boolean,
  invoiceType: string
) {
  const progress = importProgress.get(importId);
  if (!progress) {
    console.error(`[ZIP-IMPORT] Progress not found for importId: ${importId}`);
    return;
  }

  console.log(`[ZIP-IMPORT] Processing batch of ${pdfs.length} PDFs for importId: ${importId}`);

  for (const pdf of pdfs) {
    try {
      console.log(`[ZIP-IMPORT] Processing ${pdf.fileName}...`);
      
      // Upload to S3
      const timestamp = Date.now();
      const s3Key = `invoices/${timestamp}-${pdf.fileName}`;
      console.log(`[ZIP-IMPORT] Uploading ${pdf.fileName} to S3 with key: ${s3Key}`);
      const cloudPath = await uploadFile(pdf.buffer, s3Key);
      console.log(`[ZIP-IMPORT] Upload successful. Cloud path: ${cloudPath}`);

      // Extract data using AI
      const extractedData = await extractInvoiceData(pdf.buffer, pdf.fileName, cloudPath);

      if (!extractedData || !extractedData.rechnungsnummer) {
        console.warn(`[ZIP-IMPORT] No invoice number found for ${pdf.fileName}`);
        progress.failed++;
        progress.errors.push(`${pdf.fileName}: Keine Rechnungsnummer gefunden`);
        progress.processed++;
        continue;
      }

      // Check for duplicates
      const existing = await prisma.rechnung.findUnique({
        where: { rechnungsnummer: extractedData.rechnungsnummer }
      });

      if (existing) {
        console.log(`[ZIP-IMPORT] Duplicate found for ${pdf.fileName} (${extractedData.rechnungsnummer})`);
        if (skipDuplicates) {
          progress.skipped++;
          progress.processed++;
          console.log(`[ZIP-IMPORT] Skipped duplicate: ${pdf.fileName}`);
          continue;
        } else {
          // Update existing
          await prisma.rechnung.update({
            where: { rechnungsnummer: extractedData.rechnungsnummer },
            data: {
              datum: extractedData.datum ? new Date(extractedData.datum) : undefined,
              lieferant: extractedData.lieferant || '',
              betragNetto: extractedData.nettobetrag ? parseFloat(extractedData.nettobetrag) : undefined,
              mwstBetrag: extractedData.mwst ? parseFloat(extractedData.mwst) : undefined,
              betragBrutto: extractedData.bruttobetrag ? parseFloat(extractedData.bruttobetrag) : undefined,
              mwstSatz: extractedData.mwstSatz || undefined,
              status: extractedData.zahlungsstatus || undefined,
              dateipfad: cloudPath,
              typ: invoiceType,
            }
          });
          progress.successful++;
          console.log(`[ZIP-IMPORT] Updated existing invoice: ${pdf.fileName}`);
        }
      } else {
        // Create new
        const nettoValue = extractedData.nettobetrag ? parseFloat(extractedData.nettobetrag) : 0;
        const mwstValue = extractedData.mwst ? parseFloat(extractedData.mwst) : 0;
        const bruttoValue = extractedData.bruttobetrag ? parseFloat(extractedData.bruttobetrag) : nettoValue + mwstValue;
        
        console.log(`[ZIP-IMPORT] Creating new invoice for ${pdf.fileName}:`, {
          rechnungsnummer: extractedData.rechnungsnummer,
          lieferant: extractedData.lieferant,
          betragNetto: nettoValue,
          mwstBetrag: mwstValue,
          betragBrutto: bruttoValue,
          typ: invoiceType
        });
        
        await prisma.rechnung.create({
          data: {
            rechnungsnummer: extractedData.rechnungsnummer,
            datum: extractedData.datum ? new Date(extractedData.datum) : new Date(),
            lieferant: extractedData.lieferant || 'Unbekannt',
            betragNetto: nettoValue,
            mwstBetrag: mwstValue,
            betragBrutto: bruttoValue,
            mwstSatz: extractedData.mwstSatz || '19%',
            status: extractedData.zahlungsstatus || 'offen',
            dateipfad: cloudPath,
            typ: invoiceType,
          }
        });
        progress.successful++;
        console.log(`[ZIP-IMPORT] Successfully created invoice: ${pdf.fileName}`);
      }

      progress.processed++;
    } catch (error: any) {
      console.error(`[ZIP-IMPORT] Error processing ${pdf.fileName}:`, error);
      progress.failed++;
      progress.errors.push(`${pdf.fileName}: ${error.message}`);
      progress.processed++;
    }
  }
  
  console.log(`[ZIP-IMPORT] Batch processing complete. Progress:`, {
    processed: progress.processed,
    successful: progress.successful,
    failed: progress.failed,
    skipped: progress.skipped
  });
}

// POST handler - Start async import
export async function POST(request: NextRequest) {
  try {
    console.log('[ZIP-IMPORT] Starting new import request');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const skipDuplicates = formData.get('skipDuplicates') === 'true';
    const invoiceType = formData.get('invoiceType') as string || 'Eingang'; // Default to 'Eingang'

    console.log('[ZIP-IMPORT] Request parameters:', {
      fileName: file?.name,
      skipDuplicates,
      invoiceType
    });

    if (!file) {
      console.error('[ZIP-IMPORT] No file uploaded');
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    // Validate ZIP file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      console.error('[ZIP-IMPORT] Invalid file type:', file.name);
      return NextResponse.json({ error: 'Nur ZIP-Dateien werden unterstützt' }, { status: 400 });
    }

    // Generate import ID
    const importId = generateImportId();
    console.log('[ZIP-IMPORT] Generated import ID:', importId);

    // Extract PDFs from ZIP
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    const pdfs: { buffer: Buffer; fileName: string }[] = [];
    for (const entry of zipEntries) {
      if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.pdf')) {
        pdfs.push({
          buffer: entry.getData(),
          fileName: entry.entryName.split('/').pop() || entry.entryName
        });
      }
    }

    console.log(`[ZIP-IMPORT] Extracted ${pdfs.length} PDFs from ZIP file`);

    if (pdfs.length === 0) {
      console.error('[ZIP-IMPORT] No PDF files found in ZIP');
      return NextResponse.json({ error: 'Keine PDF-Dateien in der ZIP-Datei gefunden' }, { status: 400 });
    }

    // Initialize progress
    importProgress.set(importId, {
      total: pdfs.length,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      status: 'processing',
      startTime: Date.now()
    });

    console.log('[ZIP-IMPORT] Progress initialized for import ID:', importId);

    // Start async processing (don't await)
    processImportAsync(pdfs, importId, skipDuplicates, invoiceType);

    console.log('[ZIP-IMPORT] Async processing started. Returning success response.');

    return NextResponse.json({
      success: true,
      importId,
      totalFiles: pdfs.length,
      message: 'Import gestartet. Sie können weiterarbeiten.'
    });

  } catch (error: any) {
    console.error('[ZIP-IMPORT] Error starting import:', error);
    return NextResponse.json({ error: error.message || 'Import-Fehler' }, { status: 500 });
  }
}

// Async processing function
async function processImportAsync(
  pdfs: { buffer: Buffer; fileName: string }[],
  importId: string,
  skipDuplicates: boolean,
  invoiceType: string
) {
  const progress = importProgress.get(importId);
  if (!progress) {
    console.error(`[ZIP-IMPORT] Cannot start async processing - progress not found for importId: ${importId}`);
    return;
  }

  console.log(`[ZIP-IMPORT] Starting async processing for ${pdfs.length} PDFs (importId: ${importId})`);

  try {
    // Process in batches of 10 (reduced from 50 for better error handling)
    const batchSize = 10;
    for (let i = 0; i < pdfs.length; i += batchSize) {
      const batch = pdfs.slice(i, i + batchSize);
      console.log(`[ZIP-IMPORT] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} files)`);
      
      await processBatch(batch, importId, skipDuplicates, invoiceType);
      
      // Small delay between batches to prevent overload
      if (i + batchSize < pdfs.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased to 2 seconds
      }
    }

    progress.status = 'completed';
    console.log(`[ZIP-IMPORT] Import completed successfully for importId: ${importId}`, {
      total: progress.total,
      successful: progress.successful,
      failed: progress.failed,
      skipped: progress.skipped
    });
  } catch (error: any) {
    console.error(`[ZIP-IMPORT] Error in async processing for importId ${importId}:`, error);
    progress.status = 'failed';
    progress.errors.push(`Allgemeiner Fehler: ${error.message}`);
  }

  // Clean up after 24 hours (increased from 1 hour)
  setTimeout(() => {
    console.log(`[ZIP-IMPORT] Cleaning up progress data for importId: ${importId}`);
    importProgress.delete(importId);
  }, 86400000); // 24 hours
}

// GET handler - Check progress
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const importId = searchParams.get('importId');

  if (!importId) {
    return NextResponse.json({ error: 'Import ID erforderlich' }, { status: 400 });
  }

  const progress = importProgress.get(importId);
  
  if (!progress) {
    console.warn(`[ZIP-IMPORT] Progress not found for importId: ${importId}`);
    return NextResponse.json({ error: 'Import nicht gefunden' }, { status: 404 });
  }

  const elapsedTime = Date.now() - progress.startTime;
  const estimatedTimeRemaining = progress.processed > 0
    ? (elapsedTime / progress.processed) * (progress.total - progress.processed)
    : 0;

  return NextResponse.json({
    ...progress,
    elapsedTime,
    estimatedTimeRemaining,
    progressPercent: Math.round((progress.processed / progress.total) * 100)
  });
}
