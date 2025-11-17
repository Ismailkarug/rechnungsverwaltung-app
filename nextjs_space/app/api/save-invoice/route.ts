
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { detectPlatform, calculatePlatformFees } from '@/lib/platform-detection';

export async function POST(request: NextRequest) {
  // Authentifizierung prüfen
  const { session, error } = await requireAuth();
  if (error) return error;

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
        // Detect platform based on extracted data
        const platform = detectPlatform({
          zahlungsmethode: invoice.zahlungsmethode,
          bestellnummer: invoice.bestellnummer,
          referenz: invoice.referenz,
          lieferant: invoice.lieferant,
        });

        // Calculate estimated fees (only for sales invoices)
        const fees = invoice.typ === 'Ausgang' 
          ? calculatePlatformFees(platform, Number(invoice.betragBrutto || 0))
          : { platformFee: 0, paymentFee: 0, estimatedTotal: 0 };

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
            verarbeitungsdatum: new Date(),
            typ: invoice.typ || 'Eingang',
            
            // Platform fields
            plattform: platform,
            bestellnummer: invoice.bestellnummer,
            zahlungsmethode: invoice.zahlungsmethode,
            referenz: invoice.referenz,
            
            // Fee fields (estimated)
            plattformgebuehr: fees.platformFee,
            zahlungsgebuehr: fees.paymentFee,
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
