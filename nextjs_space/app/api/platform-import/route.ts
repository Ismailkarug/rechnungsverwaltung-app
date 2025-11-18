
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/s3';
import { getBucketConfig } from '@/lib/aws-config';
import { parse } from 'csv-parse/sync';
import AdmZip from 'adm-zip';

type Platform = 'EBAY' | 'AMAZON' | 'SHOPIFY' | 'NONE' | 'OTHER';

interface ImportResult {
  fileName: string;
  success: boolean;
  error?: string;
  rechnungsnummer?: string;
}

// Helper function to extract data from PDF using AI
async function extractPDFData(pdfBuffer: Buffer, fileName: string): Promise<any> {
  try {
    const { folderPrefix } = getBucketConfig();
    const timestamp = Date.now();
    const s3Key = `${folderPrefix}invoices/${timestamp}-${fileName}`;
    
    // Upload to S3 first
    const cloudStoragePath = await uploadFile(pdfBuffer, s3Key);

    // Convert to base64 for LLM API
    const base64String = pdfBuffer.toString('base64');

    // Call LLM API directly to extract invoice data
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
  "betragNetto": "Nettobetrag als Dezimalzahl",
  "mwstSatz": "MwSt-Satz (z.B. '19%' oder '7%')",
  "mwstBetrag": "MwSt-Betrag als Dezimalzahl",
  "betragBrutto": "Bruttobetrag als Dezimalzahl",
  "leistungszeitraum": "Leistungszeitraum falls vorhanden",
  "zahlungsmethode": "Zahlungsmethode falls sichtbar (z.B. 'eBay', 'Amazon', 'PayPal')",
  "bestellnummer": "Bestellnummer oder Order-ID",
  "referenz": "Referenznummer falls vorhanden"
}

WICHTIG: Verwende Punkt (.) als Dezimaltrennzeichen. Falls eine Information nicht vorhanden ist, verwende null.`
          }
        ]
      }
    ];

    console.log(`[Platform Import] Extracting data from: ${fileName}`);
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
      console.error(`[Platform Import] LLM API error:`, llmResponse.status, errorText);
      throw new Error(`LLM API Fehler: ${llmResponse.status}`);
    }

    const llmData = await llmResponse.json();
    console.log(`[Platform Import] LLM response:`, JSON.stringify(llmData, null, 2));
    
    if (!llmData.choices || !llmData.choices[0] || !llmData.choices[0].message) {
      throw new Error('Ungültige LLM-Antwort');
    }
    
    const extractedData = JSON.parse(llmData.choices[0].message.content);
    console.log(`[Platform Import] Extracted data:`, extractedData);

    return {
      rechnungsnummer: extractedData.rechnungsnummer || '',
      datum: extractedData.datum || new Date().toISOString().split('T')[0],
      lieferant: extractedData.lieferant || '',
      betrag: extractedData.betragBrutto || 0,
      betragBrutto: extractedData.betragBrutto || 0,
      betragNetto: extractedData.betragNetto || 0,
      mwst: extractedData.mwstBetrag || 0,
      mwstBetrag: extractedData.mwstBetrag || 0,
      mwst_satz: extractedData.mwstSatz || '19%',
      mwstSatz: extractedData.mwstSatz || '19%',
      leistungszeitraum: extractedData.leistungszeitraum || null,
      zahlungsmethode: extractedData.zahlungsmethode || null,
      bestellnummer: extractedData.bestellnummer || null,
      referenz: extractedData.referenz || null,
      dateipfad: cloudStoragePath,
      cloud_storage_path: cloudStoragePath,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw error;
  }
}

// Helper function to process CSV
async function processCSV(buffer: Buffer, platform: Platform): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  
  try {
    const csvText = buffer.toString('utf-8');
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    for (const record of records) {
      try {
        // Validate required fields
        if (!record.rechnungsnummer || !record.datum || !record.lieferant) {
          results.push({
            fileName: 'CSV Row',
            success: false,
            error: 'Fehlende Pflichtfelder (rechnungsnummer, datum, lieferant)',
          });
          continue;
        }

        // Check for duplicates
        const existing = await prisma.rechnung.findUnique({
          where: { rechnungsnummer: record.rechnungsnummer },
        });

        if (existing) {
          results.push({
            fileName: record.rechnungsnummer,
            success: false,
            error: 'Rechnung bereits vorhanden',
            rechnungsnummer: record.rechnungsnummer,
          });
          continue;
        }

        // Parse and validate data
        const datum = new Date(record.datum);
        if (isNaN(datum.getTime())) {
          throw new Error('Ungültiges Datum');
        }

        const betragBrutto = parseFloat(record.betrag || record.betragBrutto || '0');
        const mwstBetrag = parseFloat(record.mwst || record.mwstBetrag || '0');
        const mwstSatz = record.mwst_satz || record.mwstSatz || '19%';
        const betragNetto = betragBrutto - mwstBetrag;

        // Create invoice
        await prisma.rechnung.create({
          data: {
            rechnungsnummer: record.rechnungsnummer,
            datum,
            lieferant: record.lieferant,
            betragBrutto,
            mwstBetrag,
            mwstSatz,
            betragNetto,
            typ: record.typ || 'Eingang',
            plattform: platform,
            referenz: record.referenz || null,
            zahlungsmethode: record.zahlungsmethode || null,
            bestellnummer: record.bestellnummer || null,
            dateipfad: record.dateipfad || record.cloud_storage_path || null,
          },
        });

        results.push({
          fileName: record.rechnungsnummer,
          success: true,
          rechnungsnummer: record.rechnungsnummer,
        });
      } catch (error) {
        results.push({
          fileName: record.rechnungsnummer || 'Unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
        });
      }
    }
  } catch (error) {
    console.error('CSV processing error:', error);
    throw error;
  }

  return results;
}

// Helper function to process single PDF
async function processPDF(buffer: Buffer, fileName: string, platform: Platform): Promise<ImportResult> {
  try {
    const extracted = await extractPDFData(buffer, fileName);

    // Check for duplicates
    if (extracted.rechnungsnummer) {
      const existing = await prisma.rechnung.findUnique({
        where: { rechnungsnummer: extracted.rechnungsnummer },
      });

      if (existing) {
        return {
          fileName,
          success: false,
          error: 'Rechnung bereits vorhanden',
          rechnungsnummer: extracted.rechnungsnummer,
        };
      }
    }

    // Validate required fields
    if (!extracted.rechnungsnummer || !extracted.datum || !extracted.lieferant) {
      return {
        fileName,
        success: false,
        error: 'Fehlende Pflichtfelder in PDF',
      };
    }

    // Parse and validate data
    const datum = new Date(extracted.datum);
    if (isNaN(datum.getTime())) {
      return {
        fileName,
        success: false,
        error: 'Ungültiges Datum in PDF',
      };
    }

    const betragBrutto = parseFloat(extracted.betrag || extracted.betragBrutto || '0');
    const mwstBetrag = parseFloat(extracted.mwst || extracted.mwstBetrag || '0');
    const mwstSatz = extracted.mwst_satz || extracted.mwstSatz || '19%';
    const betragNetto = betragBrutto - mwstBetrag;

    // Create invoice
    await prisma.rechnung.create({
      data: {
        rechnungsnummer: extracted.rechnungsnummer,
        datum,
        lieferant: extracted.lieferant,
        betragBrutto,
        mwstBetrag,
        mwstSatz,
        betragNetto,
        typ: 'Eingang',
        plattform: platform,
        referenz: extracted.referenz || null,
        zahlungsmethode: extracted.zahlungsmethode || null,
        bestellnummer: extracted.bestellnummer || null,
        dateipfad: extracted.cloud_storage_path || extracted.dateipfad,
      },
    });

    return {
      fileName,
      success: true,
      rechnungsnummer: extracted.rechnungsnummer,
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    return {
      fileName,
      success: false,
      error: error instanceof Error ? error.message : 'PDF-Verarbeitung fehlgeschlagen',
    };
  }
}

// Helper function to process ZIP
async function processZIP(buffer: Buffer, platform: Platform): Promise<ImportResult[]> {
  const results: ImportResult[] = [];

  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const fileName = entry.entryName;
      const fileExt = fileName.split('.').pop()?.toLowerCase();

      if (fileExt !== 'pdf') {
        results.push({
          fileName,
          success: false,
          error: 'Nur PDF-Dateien werden in ZIP-Archiven unterstützt',
        });
        continue;
      }

      try {
        const fileBuffer = entry.getData();
        const result = await processPDF(fileBuffer, fileName, platform);
        results.push(result);

        // Add small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          fileName,
          success: false,
          error: error instanceof Error ? error.message : 'Verarbeitung fehlgeschlagen',
        });
      }
    }
  } catch (error) {
    console.error('ZIP processing error:', error);
    throw error;
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const platform = formData.get('platform') as Platform;

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    if (!platform || !['EBAY', 'AMAZON', 'SHOPIFY'].includes(platform)) {
      return NextResponse.json(
        { error: 'Ungültige Plattform' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    let results: ImportResult[] = [];

    // Process based on file type
    if (fileExt === 'csv') {
      results = await processCSV(buffer, platform);
    } else if (fileExt === 'pdf') {
      const result = await processPDF(buffer, fileName, platform);
      results = [result];
    } else if (fileExt === 'zip') {
      results = await processZIP(buffer, platform);
    } else {
      return NextResponse.json(
        { error: 'Ungültiger Dateityp. Nur CSV, PDF und ZIP werden unterstützt.' },
        { status: 400 }
      );
    }

    // Calculate summary
    const summary = {
      total: results.length,
      processed: results.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success && r.error !== 'Rechnung bereits vorhanden').length,
      skipped: results.filter(r => r.error === 'Rechnung bereits vorhanden').length,
    };

    return NextResponse.json({
      success: true,
      summary,
      results,
      platform,
    });

  } catch (error) {
    console.error('Platform import error:', error);
    return NextResponse.json(
      { 
        error: 'Fehler beim Import',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    );
  }
}
