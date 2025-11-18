
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parse } from 'csv-parse/sync';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  // Authentifizierung prüfen
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Nur CSV-Dateien sind erlaubt' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV
    let records;
    try {
      records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        trim: true
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Fehler beim Parsen der CSV-Datei. Bitte überprüfen Sie das Format.' },
        { status: 400 }
      );
    }

    const savedInvoices = [];
    const errors = [];

    for (const record of records) {
      try {
        // Validate required fields
        if (!record.rechnungsnummer || !record.datum || !record.lieferant) {
          errors.push({
            rechnungsnummer: record.rechnungsnummer || 'Unbekannt',
            error: 'Pflichtfelder fehlen (rechnungsnummer, datum, lieferant)'
          });
          continue;
        }

        // Parse and validate date
        let datum;
        try {
          datum = new Date(record.datum);
          if (isNaN(datum.getTime())) {
            throw new Error('Ungültiges Datum');
          }
        } catch (error) {
          errors.push({
            rechnungsnummer: record.rechnungsnummer,
            error: 'Ungültiges Datumsformat (verwenden Sie YYYY-MM-DD)'
          });
          continue;
        }

        // Parse numeric fields
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
            verarbeitungsdatum: new Date()
          }
        });

        savedInvoices.push({
          ...rechnung,
          betragNetto: Number(rechnung.betragNetto),
          betragBrutto: Number(rechnung.betragBrutto),
          mwstBetrag: Number(rechnung.mwstBetrag)
        });
      } catch (error: any) {
        console.error(`Error saving invoice ${record.rechnungsnummer}:`, error);
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

    return NextResponse.json({
      success: true,
      savedInvoices,
      errors,
      summary: {
        total: records.length,
        success: savedInvoices.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Importieren der CSV-Datei' },
      { status: 500 }
    );
  }
}
