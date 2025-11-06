
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoices } = body;

    if (!invoices || !Array.isArray(invoices)) {
      return NextResponse.json(
        { error: 'Ungültige Daten' },
        { status: 400 }
      );
    }

    const savedInvoices = [];
    const errors = [];

    for (const invoice of invoices) {
      try {
        const rechnung = await prisma.rechnung.create({
          data: {
            rechnungsnummer: invoice.rechnungsnummer,
            datum: new Date(invoice.datum),
            lieferant: invoice.lieferant,
            betragNetto: invoice.betragNetto,
            mwstSatz: invoice.mwstSatz,
            mwstBetrag: invoice.mwstBetrag,
            betragBrutto: invoice.betragBrutto,
            leistungszeitraum: invoice.leistungszeitraum,
            dateipfad: invoice.cloudStoragePath,
            status: invoice.status || 'Unbezahlt',
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
        console.error(`Error saving invoice ${invoice.rechnungsnummer}:`, error);
        errors.push({
          rechnungsnummer: invoice.rechnungsnummer,
          error: error.message || 'Fehler beim Speichern'
        });
      }
    }

    return NextResponse.json({
      success: true,
      savedInvoices,
      errors
    });

  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern der Rechnungen' },
      { status: 500 }
    );
  }
}
