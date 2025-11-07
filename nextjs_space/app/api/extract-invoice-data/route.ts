
import { NextRequest, NextResponse } from 'next/server';
import { uploadFile } from '@/lib/s3';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Keine Dateien hochgeladen' },
        { status: 400 }
      );
    }

    const results = [];

    for (const file of files) {
      try {
        // Validate file type
        if (file.type !== 'application/pdf') {
          results.push({
            fileName: file.name,
            success: false,
            error: 'Nur PDF-Dateien sind erlaubt'
          });
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          results.push({
            fileName: file.name,
            success: false,
            error: 'Datei ist zu groß (max 10MB)'
          });
          continue;
        }

        // Convert file to buffer and upload to S3
        const buffer = Buffer.from(await file.arrayBuffer());
        const cloudStoragePath = await uploadFile(buffer, file.name);

        // Convert to base64 for LLM API
        const base64String = buffer.toString('base64');

        // Call LLM API to extract invoice data
        const messages = [
          {
            role: "user",
            content: [
              {
                type: "file",
                file: {
                  filename: file.name,
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

        results.push({
          fileName: file.name,
          success: true,
          cloudStoragePath,
          extractedData: {
            rechnungsnummer: extractedData.rechnungsnummer || '',
            datum: extractedData.datum || new Date().toISOString().split('T')[0],
            lieferant: extractedData.lieferant || '',
            betragNetto: extractedData.betragNetto || 0,
            mwstSatz: extractedData.mwstSatz || '19',
            mwstBetrag: extractedData.mwstBetrag || 0,
            betragBrutto: extractedData.betragBrutto || 0,
            leistungszeitraum: extractedData.leistungszeitraum || null,
            status: 'Unbezahlt'
          }
        });

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        results.push({
          fileName: file.name,
          success: false,
          error: 'Fehler beim Verarbeiten der Datei'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Extract error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Extrahieren der Rechnungsdaten' },
      { status: 500 }
    );
  }
}
