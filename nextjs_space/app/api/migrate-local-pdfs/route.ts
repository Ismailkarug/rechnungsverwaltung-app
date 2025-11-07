
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { uploadFile } from '@/lib/s3';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    // Verzeichnis mit lokalen PDFs
    const invoicesDir = '/home/ubuntu/rechnungsverwaltung_app/invoices';
    
    // Alle Rechnungen mit lokalen Dateipfaden abrufen (ohne "/" im Pfad)
    const rechnungen = await prisma.rechnung.findMany({
      where: {
        AND: [
          {
            dateipfad: {
              not: null
            }
          },
          {
            // Lokale Dateien haben keinen "/" im Pfad
            dateipfad: {
              not: {
                contains: '/'
              }
            }
          }
        ]
      }
    });

    console.log(`Found ${rechnungen.length} invoices with local file paths`);

    const results = [];

    for (const rechnung of rechnungen) {
      try {
        if (!rechnung.dateipfad) continue;

        const localFilePath = path.join(invoicesDir, rechnung.dateipfad);
        
        // Prüfen ob Datei existiert
        try {
          await fs.access(localFilePath);
        } catch {
          console.log(`File not found: ${localFilePath}`);
          results.push({
            rechnungsnummer: rechnung.rechnungsnummer,
            success: false,
            error: 'Datei nicht gefunden'
          });
          continue;
        }

        // Datei lesen
        const buffer = await fs.readFile(localFilePath);
        
        // Zu S3 hochladen
        const cloudStoragePath = await uploadFile(buffer, rechnung.dateipfad);
        
        // Datenbank aktualisieren
        await prisma.rechnung.update({
          where: { id: rechnung.id },
          data: { dateipfad: cloudStoragePath }
        });

        console.log(`Migrated: ${rechnung.dateipfad} -> ${cloudStoragePath}`);
        
        results.push({
          rechnungsnummer: rechnung.rechnungsnummer,
          success: true,
          oldPath: rechnung.dateipfad,
          newPath: cloudStoragePath
        });

      } catch (error) {
        console.error(`Error migrating ${rechnung.dateipfad}:`, error);
        results.push({
          rechnungsnummer: rechnung.rechnungsnummer,
          success: false,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      message: `Migration abgeschlossen: ${successCount}/${results.length} Dateien erfolgreich migriert`,
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Fehler bei der Migration' },
      { status: 500 }
    );
  }
}
