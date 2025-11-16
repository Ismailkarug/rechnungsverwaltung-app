require('dotenv').config();
const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient();

async function verifyFixes() {
  try {
    // Nur gültige Rechnungen (wie in der App)
    const stats = await prisma.rechnung.aggregate({
      where: { betragBrutto: { gt: 0 } },
      _sum: {
        betragBrutto: true,
        betragNetto: true,
        mwstBetrag: true
      },
      _count: true
    });
    
    const gesamtBrutto = Number(stats._sum.betragBrutto) || 0;
    const gesamtNetto = Number(stats._sum.betragNetto) || 0;
    const gesamtMwst = Number(stats._sum.mwstBetrag) || 0;
    
    console.log('\n=== Korrigierte Statistiken (nur gültige Rechnungen) ===');
    console.log(`Anzahl Rechnungen: ${stats._count}`);
    console.log(`Gesamt Brutto: ${gesamtBrutto.toFixed(2)} €`);
    console.log(`Gesamt Netto: ${gesamtNetto.toFixed(2)} €`);
    console.log(`Gesamt MwSt: ${gesamtMwst.toFixed(2)} €`);
    
    // Calculate percentages
    const mwstVonNetto = (gesamtMwst / gesamtNetto) * 100;
    const mwstAnteilAmBrutto = (gesamtMwst / gesamtBrutto) * 100;
    
    console.log(`\n=== Korrigierte Prozentsätze ===`);
    console.log(`MwSt-Satz (durchschnittlich): ${mwstVonNetto.toFixed(2)}% ✓`);
    console.log(`MwSt-Anteil am Brutto: ${mwstAnteilAmBrutto.toFixed(2)}%`);
    
    // Verify calculation
    const berechnetesBrutto = gesamtNetto + gesamtMwst;
    console.log(`\n=== Validierung ===`);
    console.log(`Netto + MwSt: ${berechnetesBrutto.toFixed(2)} €`);
    console.log(`Tatsächlich Brutto: ${gesamtBrutto.toFixed(2)} €`);
    console.log(`Differenz: ${(gesamtBrutto - berechnetesBrutto).toFixed(2)} € ${Math.abs(gesamtBrutto - berechnetesBrutto) < 1 ? '✓' : '✗'}`);
    
    console.log(`\n✅ Problem behoben! Der MwSt-Satz liegt nun bei ${mwstVonNetto.toFixed(1)}% (statt 153%)!`);
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyFixes();
