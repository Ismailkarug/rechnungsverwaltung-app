import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const templatePath = path.join(process.cwd(), '..', 'data', 'invoice_template.csv');
    
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      );
    }

    const fileContent = fs.readFileSync(templatePath, 'utf-8');

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="rechnungen_vorlage.csv"',
      },
    });
  } catch (error) {
    console.error('Error downloading template:', error);
    return NextResponse.json(
      { error: 'Fehler beim Herunterladen der Vorlage' },
      { status: 500 }
    );
  }
}
