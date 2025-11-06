
import { NextRequest, NextResponse } from 'next/server';
import { downloadFile } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { error: 'Kein Dateipfad angegeben' },
        { status: 400 }
      );
    }

    const signedUrl = await downloadFile(key);

    return NextResponse.json({ url: signedUrl });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Herunterladen der Rechnung' },
      { status: 500 }
    );
  }
}
