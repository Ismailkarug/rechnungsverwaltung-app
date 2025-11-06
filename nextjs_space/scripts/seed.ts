
import { PrismaClient, Rechnung } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RechnungData {
  'Rechnungsnummer': string;
  'Datum': string;
  'Lieferant': string;
  'Betrag netto': string;
  'MwSt-Satz': string;
  'MwSt-Betrag': string;
  'Betrag brutto': string;
  'Leistungszeitraum': string;
  'Dateipfad': string;
  'Status': string;
  'Verarbeitungsdatum': string;
}

function cleanNumericValue(value: string): number {
  // Bereinige numerische Werte - entferne ungültige Zeichen
  const cleanValue = value?.toString().replace(/[^\d.,]/g, '').replace(',', '.');
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Handle verschiedene Datumsformate
  const trimmed = dateStr.trim();
  
  // YYYY-MM-DD format
  if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return new Date(trimmed);
  }
  
  // YYYY-MM-DD HH:MM:SS format
  if (trimmed.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    return new Date(trimmed);
  }
  
  return null;
}

function cleanUrl(url: string): string | null {
  if (!url || url.trim() === '') return null;
  const trimmed = url.trim();
  
  // Prüfe ob es ein gültiger Google Drive Link ist
  if (trimmed.startsWith('https://drive.google.com/file/')) {
    return trimmed;
  }
  
  // Wenn es kein gültiger Link ist, return null
  return null;
}

async function main() {
  console.log('🌱 Datenbank wird bereinigt...');
  
  // Lösche alle existierenden Rechnungen
  await prisma.rechnung.deleteMany({});
  
  console.log('📖 Lese Rechnungsdaten...');
  
  // Lade die JSON-Daten
  const dataPath = path.join(__dirname, '../data/rechnungen_daten.json');
  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const rechnungsdaten: RechnungData[] = JSON.parse(rawData);
  
  console.log(`📊 Gefunden: ${rechnungsdaten.length} Rechnungseinträge`);
  
  let importedCount = 0;
  let skippedCount = 0;
  
  for (const [index, data] of rechnungsdaten.entries()) {
    try {
      console.log(`⚙️  Verarbeite Eintrag ${index + 1}: ${data['Rechnungsnummer']}`);
      
      // Bereinige und validiere Daten
      const rechnungsnummer = data['Rechnungsnummer']?.toString().trim();
      const datum = parseDate(data['Datum']);
      const lieferant = data['Lieferant']?.toString().trim();
      
      // Überprüfe kritische Felder
      if (!rechnungsnummer || !datum || !lieferant) {
        console.log(`⚠️  Überspringe Eintrag ${index + 1}: Fehlende kritische Daten`);
        skippedCount++;
        continue;
      }
      
      // Bereinige Beträge
      const betragNetto = cleanNumericValue(data['Betrag netto']);
      const mwstBetrag = data['MwSt-Betrag'] ? cleanNumericValue(data['MwSt-Betrag']) : null;
      const betragBrutto = cleanNumericValue(data['Betrag brutto']);
      
      // Bereinige MwSt-Satz
      let mwstSatz = data['MwSt-Satz']?.toString().trim() || '19%';
      // Korrigiere offensichtlich falsche Werte wie "1900%" zu "19%"
      if (mwstSatz === '1900%') {
        mwstSatz = '19%';
      }
      
      // Verarbeite optionale Felder
      const leistungszeitraum = data['Leistungszeitraum']?.toString().trim() || null;
      const dateipfad = cleanUrl(data['Dateipfad']);
      const status = data['Status']?.toString().trim() || null;
      const verarbeitungsdatum = parseDate(data['Verarbeitungsdatum']);
      
      // Erstelle Rechnung
      const rechnung = await prisma.rechnung.create({
        data: {
          rechnungsnummer,
          datum,
          lieferant,
          betragNetto,
          mwstSatz,
          mwstBetrag,
          betragBrutto,
          leistungszeitraum,
          dateipfad,
          status,
          verarbeitungsdatum,
        },
      });
      
      console.log(`✅ Erfolgreich importiert: ${rechnung.rechnungsnummer}`);
      importedCount++;
      
    } catch (error) {
      console.error(`❌ Fehler bei Eintrag ${index + 1}:`, error);
      skippedCount++;
    }
  }
  
  console.log('\n📈 Import-Zusammenfassung:');
  console.log(`✅ Erfolgreich importiert: ${importedCount}`);
  console.log(`⚠️  Übersprungen: ${skippedCount}`);
  console.log(`📊 Gesamt verarbeitet: ${importedCount + skippedCount}`);
  
  // Zeige finale Statistiken
  const totalRechnungen = await prisma.rechnung.count();
  const lieferantenCount = await prisma.rechnung.findMany({
    select: { lieferant: true },
    distinct: ['lieferant'],
  });
  
  const gesamtsummeBrutto = await prisma.rechnung.aggregate({
    _sum: { betragBrutto: true },
  });
  
  console.log('\n📋 Datenbank-Statistiken:');
  console.log(`📄 Rechnungen gesamt: ${totalRechnungen}`);
  console.log(`🏢 Anzahl Lieferanten: ${lieferantenCount.length}`);
  console.log(`💰 Gesamtsumme brutto: €${gesamtsummeBrutto._sum.betragBrutto || 0}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed-Script fehlgeschlagen:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
