
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

// Extract invoice data using AI directly
async function extractInvoiceData(pdfBuffer: Buffer, fileName: string, cloudPath: string) {
  try {
    const base64String = pdfBuffer.toString('base64');
    
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "file",
            file: {
              filename: fileName,
              file_data: `data:application/pdf;base64,${base64String}`
            }
          },
          {
            type: "text",
            text: `Bitte extrahiere die folgenden Informationen aus dieser Rechnung und gib sie als JSON zurück:

{
  "rechnungsnummer": "Rechnungsnummer (String)",
  "datum": "Rechnungsdatum im Format YYYY-MM-DD",
  "lieferant": "Name des Lieferanten/Ausstellers",
  "betragNetto": "Nettobetrag als Dezimalzahl mit Punkt als Dezimaltrennzeichen (z.B. 157.83)",
  "mwstSatz": "MwSt-Satz in Prozent (z.B. '19' oder '7' oder '0')",
  "mwstBetrag": "MwSt-Betrag als Dezimalzahl mit Punkt als Dezimaltrennzeichen (z.B. 29.99)",
  "betragBrutto": "Bruttobetrag/Gesamtbetrag als Dezimalzahl mit Punkt als Dezimaltrennzeichen (z.B. 187.82)",
  "leistungszeitraum": "Leistungszeitraum falls vorhanden, sonst null"
}

WICHTIG für Beträge:
- Verwende IMMER Punkt (.) als Dezimaltrennzeichen, NIEMALS Komma
- Entferne alle Tausendertrennzeichen (Punkte, Kommas, Leerzeichen)
- Beispiele: 
  - €157.83 → 157.83
  - 1.234,56 € → 1234.56
  - 15.000,00 → 15000.00
- Gib Beträge immer als reine Dezimalzahl ohne Währungssymbol an
- Bei 0% MwSt: mwstSatz="0", mwstBetrag=0

Falls eine Information nicht vorhanden ist, verwende null. Antworte nur mit dem JSON-Objekt, ohne Code-Blöcke oder Markdown.`
          }
        ]
      }
    ];

    console.log(`[ZIP Import] AI extraction for: ${fileName}`);
    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: messages,
        response_format: { type: "json_object" },
        max_tokens: 1000
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[ZIP Import] LLM API error for ${fileName}:`, llmResponse.status, errorText);
      throw new Error(`LLM API Fehler: ${llmResponse.status} - ${errorText}`);
    }

    const llmData = await llmResponse.json();
    
    if (!llmData.choices || !llmData.choices[0] || !llmData.choices[0].message) {
      throw new Error('Ungültige LLM-Antwort');
    }
    
    const extractedData = JSON.parse(llmData.choices[0].message.content);
    console.log(`[ZIP Import] Extracted data for ${fileName}:`, extractedData);

    // Return in the format expected by processBatch
    return {
      rechnungsnummer: extractedData.rechnungsnummer || '',
      datum: extractedData.datum || new Date().toISOString().split('T')[0],
      lieferant: extractedData.lieferant || '',
      nettobetrag: extractedData.betragNetto || 0,
      mwst: extractedData.mwstBetrag || 0,
      bruttobetrag: extractedData.betragBrutto || 0,
      mwstSatz: extractedData.mwstSatz || '19%',
      zahlungsstatus: 'offen',
      leistungszeitraum: extractedData.leistungszeitraum || null
    };
  } catch (error: any) {
    console.error(`[ZIP Import] Error in AI extraction for ${fileName}:`, error);
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
  if (!progress) return;

  for (const pdf of pdfs) {
    try {
      // Upload to S3
      const timestamp = Date.now();
      const s3Key = `invoices/${timestamp}-${pdf.fileName}`;
      const cloudPath = await uploadFile(pdf.buffer, s3Key);

      // Extract data using AI
      const extractedData = await extractInvoiceData(pdf.buffer, pdf.fileName, cloudPath);

      if (!extractedData || !extractedData.rechnungsnummer) {
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
        if (skipDuplicates) {
          progress.skipped++;
          progress.processed++;
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
        }
      } else {
        // Create new
        const nettoValue = extractedData.nettobetrag ? parseFloat(extractedData.nettobetrag) : 0;
        const mwstValue = extractedData.mwst ? parseFloat(extractedData.mwst) : 0;
        const bruttoValue = extractedData.bruttobetrag ? parseFloat(extractedData.bruttobetrag) : nettoValue + mwstValue;
        
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
      }

      progress.processed++;
    } catch (error: any) {
      progress.failed++;
      progress.errors.push(`${pdf.fileName}: ${error.message}`);
      progress.processed++;
    }
  }
}

// POST handler - Start async import
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const skipDuplicates = formData.get('skipDuplicates') === 'true';
    const invoiceType = formData.get('invoiceType') as string || 'Eingang'; // Default to 'Eingang'

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen' }, { status: 400 });
    }

    // Validate ZIP file
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Nur ZIP-Dateien werden unterstützt' }, { status: 400 });
    }

    // Generate import ID
    const importId = generateImportId();

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

    if (pdfs.length === 0) {
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

    // Start async processing (don't await)
    processImportAsync(pdfs, importId, skipDuplicates, invoiceType);

    return NextResponse.json({
      success: true,
      importId,
      totalFiles: pdfs.length,
      message: 'Import gestartet. Sie können weiterarbeiten.'
    });

  } catch (error: any) {
    console.error('Error starting import:', error);
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
  if (!progress) return;

  try {
    // Process in batches of 50
    const batchSize = 50;
    for (let i = 0; i < pdfs.length; i += batchSize) {
      const batch = pdfs.slice(i, i + batchSize);
      await processBatch(batch, importId, skipDuplicates, invoiceType);
      
      // Small delay between batches to prevent overload
      if (i + batchSize < pdfs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    progress.status = 'completed';
  } catch (error: any) {
    console.error('Error in async processing:', error);
    progress.status = 'failed';
    progress.errors.push(`Allgemeiner Fehler: ${error.message}`);
  }

  // Clean up after 1 hour
  setTimeout(() => {
    importProgress.delete(importId);
  }, 3600000);
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
