
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/s3';
import { prisma } from '@/lib/db';
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

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to S3
    const cloudStoragePath = await uploadFile(buffer, file.name);

    // Extract invoice data from form or use defaults
    const rechnungsnummer = formData.get('rechnungsnummer') as string;
    const datum = formData.get('datum') as string;
    const lieferant = formData.get('lieferant') as string;
    const betragNetto = parseFloat(formData.get('betragNetto') as string);
    const mwstSatz = formData.get('mwstSatz') as string || '19';
    const mwstBetrag = parseFloat(formData.get('mwstBetrag') as string);
    const betragBrutto = parseFloat(formData.get('betragBrutto') as string);
    const leistungszeitraum = formData.get('leistungszeitraum') as string || null;
    const status = formData.get('status') as string || 'Unbezahlt';

    // Save to database
    const rechnung = await prisma.rechnung.create({
      data: {
        rechnungsnummer,
        datum: new Date(datum),
        lieferant,
        betragNetto,
        mwstSatz,
        mwstBetrag,
        betragBrutto,
        leistungszeitraum,
        dateipfad: cloudStoragePath,
        status,
        verarbeitungsdatum: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      rechnung: {
        ...rechnung,
        betragNetto: Number(rechnung.betragNetto),
        betragBrutto: Number(rechnung.betragBrutto),
        mwstBetrag: Number(rechnung.mwstBetrag)
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen der Rechnung' },
      { status: 500 }
    );
  }
}
