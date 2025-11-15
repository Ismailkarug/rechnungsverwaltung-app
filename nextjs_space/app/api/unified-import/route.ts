
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parse } from 'csv-parse/sync';
import { uploadFile } from '@/lib/s3';
import AdmZip from 'adm-zip';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

async function extractInvoiceWithAI(file: Buffer, fileName: string): Promise<any> {
  try {
    // Upload to S3 first
    const cloudStoragePath = await uploadFile(file, fileName);
    
    // Convert to base64 for LLM API
    const base64String = file.toString('base64');

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
  - €1,234.56 → 1234.56
- Gib Beträge immer als reine Dezimalzahl ohne Währungssymbol an
- Bei 0% MwSt: mwstSatz="0", mwstBetrag=0

Falls eine Information nicht vorhanden ist, verwende null. Antworte nur mit dem JSON-Objekt, ohne Code-Blöcke oder Markdown.`
          }
        ]
      }
    ];

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
      throw new Error('LLM API Fehler');
    }

    const llmData = await llmResponse.json();
    const extractedData = JSON.parse(llmData.choices[0].message.content);

    return {
      success: true,
      cloudStoragePath,
      extractedData: {
        rechnungsnummer: extractedData.rechnungsnummer || '',
        datum: extractedData.datum || new Date().toISOString().split('T')[0],
        lieferant: extractedData.lieferant || '',
        betragNetto: parseFloat(extractedData.betragNetto) || 0,
        mwstSatz: extractedData.mwstSatz || '19',
        mwstBetrag: parseFloat(extractedData.mwstBetrag) || 0,
        betragBrutto: parseFloat(extractedData.betragBrutto) || 0,
        leistungszeitraum: extractedData.leistungszeitraum || null,
        status: 'Unbezahlt'
      }
    };
  } catch (error) {
    console.error(`Error extracting ${fileName}:`, error);
    return {
      success: false,
      error: 'Fehler beim Extrahieren der Rechnungsdaten'
    };
  }
}

async function processCSV(fileContent: string, typ: string = 'Eingang') {
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ',',
    trim: true
  });

  const savedInvoices = [];
  const errors = [];

  for (const record of records) {
    try {
      if (!record.rechnungsnummer || !record.datum || !record.lieferant) {
        errors.push({
          rechnungsnummer: record.rechnungsnummer || 'Unbekannt',
          error: 'Pflichtfelder fehlen'
        });
        continue;
      }

      const datum = new Date(record.datum);
      if (isNaN(datum.getTime())) {
        errors.push({
          rechnungsnummer: record.rechnungsnummer,
          error: 'Ungültiges Datum'
        });
        continue;
      }

      const betragNetto = parseFloat(record.betragNetto || '0');
      const mwstBetrag = parseFloat(record.mwstBetrag || '0');
      const betragBrutto = parseFloat(record.betragBrutto || '0');

      if (isNaN(betragNetto) || isNaN(mwstBetrag) || isNaN(betragBrutto)) {
        errors.push({
          rechnungsnummer: record.rechnungsnummer,
          error: 'Ungültige Beträge'
        });
        continue;
      }

      const rechnung = await prisma.rechnung.create({
        data: {
          rechnungsnummer: record.rechnungsnummer,
          datum: datum,
          lieferant: record.lieferant,
          betragNetto: betragNetto,
          mwstSatz: record.mwstSatz || '19',
          mwstBetrag: mwstBetrag,
          betragBrutto: betragBrutto,
          leistungszeitraum: record.leistungszeitraum || null,
          dateipfad: null,
          status: record.status || 'Unbezahlt',
          verarbeitungsdatum: new Date(),
          typ: typ
        }
      });

      savedInvoices.push({
        ...rechnung,
        betragNetto: Number(rechnung.betragNetto),
        betragBrutto: Number(rechnung.betragBrutto),
        mwstBetrag: Number(rechnung.mwstBetrag)
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        errors.push({
          rechnungsnummer: record.rechnungsnummer,
          error: 'Rechnungsnummer existiert bereits'
        });
      } else {
        errors.push({
          rechnungsnummer: record.rechnungsnummer,
          error: error.message || 'Fehler beim Speichern'
        });
      }
    }
  }

  return { savedInvoices, errors };
}

async function processPDF(file: Buffer, fileName: string, typ: string = 'Eingang') {
  const extractionResult = await extractInvoiceWithAI(file, fileName);
  
  if (!extractionResult.success) {
    return {
      savedInvoices: [],
      errors: [{
        rechnungsnummer: fileName,
        error: extractionResult.error
      }]
    };
  }

  try {
    const data = extractionResult.extractedData;
    
    // Validate required fields
    if (!data.rechnungsnummer || !data.lieferant) {
      return {
        savedInvoices: [],
        errors: [{
          rechnungsnummer: fileName,
          error: 'Pflichtfelder konnten nicht extrahiert werden'
        }]
      };
    }

    const rechnung = await prisma.rechnung.create({
      data: {
        rechnungsnummer: data.rechnungsnummer,
        datum: new Date(data.datum),
        lieferant: data.lieferant,
        betragNetto: data.betragNetto,
        mwstSatz: data.mwstSatz,
        mwstBetrag: data.mwstBetrag,
        betragBrutto: data.betragBrutto,
        leistungszeitraum: data.leistungszeitraum,
        dateipfad: extractionResult.cloudStoragePath,
        status: data.status,
        verarbeitungsdatum: new Date(),
        typ: typ
      }
    });

    return {
      savedInvoices: [{
        ...rechnung,
        betragNetto: Number(rechnung.betragNetto),
        betragBrutto: Number(rechnung.betragBrutto),
        mwstBetrag: Number(rechnung.mwstBetrag)
      }],
      errors: []
    };
  } catch (error: any) {
    return {
      savedInvoices: [],
      errors: [{
        rechnungsnummer: extractionResult.extractedData.rechnungsnummer || fileName,
        error: error.code === 'P2002' ? 'Rechnungsnummer existiert bereits' : error.message || 'Fehler beim Speichern'
      }]
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const typ = (formData.get('typ') as string) || 'Eingang'; // Default to 'Eingang' if not specified
    
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    let allSavedInvoices: any[] = [];
    let allErrors: any[] = [];

    // Handle CSV files
    if (fileName.endsWith('.csv')) {
      const fileContent = await file.text();
      const result = await processCSV(fileContent, typ);
      allSavedInvoices = result.savedInvoices;
      allErrors = result.errors;
    }
    // Handle PDF files
    else if (fileName.endsWith('.pdf')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await processPDF(buffer, file.name, typ);
      allSavedInvoices = result.savedInvoices;
      allErrors = result.errors;
    }
    // Handle ZIP files
    else if (fileName.endsWith('.zip')) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      for (const entry of zipEntries) {
        if (entry.isDirectory) continue;
        
        const entryName = entry.entryName.toLowerCase();
        
        // Process PDFs in ZIP
        if (entryName.endsWith('.pdf')) {
          const pdfBuffer = entry.getData();
          const result = await processPDF(pdfBuffer, entry.name, typ);
          allSavedInvoices.push(...result.savedInvoices);
          allErrors.push(...result.errors);
        }
        // Process CSVs in ZIP
        else if (entryName.endsWith('.csv')) {
          const csvContent = entry.getData().toString('utf-8');
          const result = await processCSV(csvContent, typ);
          allSavedInvoices.push(...result.savedInvoices);
          allErrors.push(...result.errors);
        }
      }
    }
    else {
      return NextResponse.json(
        { error: 'Nur CSV, PDF oder ZIP-Dateien sind erlaubt' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      savedInvoices: allSavedInvoices,
      errors: allErrors,
      summary: {
        total: allSavedInvoices.length + allErrors.length,
        success: allSavedInvoices.length,
        failed: allErrors.length
      }
    });

  } catch (error: any) {
    console.error('Unified import error:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Importieren der Datei' },
      { status: 500 }
    );
  }
}
