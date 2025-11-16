require('dotenv').config();
const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient();

async function checkMwStCalculation() {
  try {
    // Get aggregate values
    const stats = await prisma.rechnung.aggregate({
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
    
    console.log('\n=== MwSt-Berechnung Analyse ===');
    console.log(`Anzahl Rechnungen: ${stats._count}`);
    console.log(`Gesamt Brutto: ${gesamtBrutto.toFixed(2)} €`);
    console.log(`Gesamt Netto: ${gesamtNetto.toFixed(2)} €`);
    console.log(`Gesamt MwSt: ${gesamtMwst.toFixed(2)} €`);
    console.log(`\nNetto + MwSt: ${(gesamtNetto + gesamtMwst).toFixed(2)} €`);
    console.log(`Differenz zu Brutto: ${(gesamtBrutto - (gesamtNetto + gesamtMwst)).toFixed(2)} €`);
    
    // Calculate percentages
    const mwstVonBrutto = (gesamtMwst / gesamtBrutto) * 100;
    const mwstVonNetto = (gesamtMwst / gesamtNetto) * 100;
    
    console.log(`\n=== Prozentsätze ===`);
    console.log(`MwSt / Brutto: ${mwstVonBrutto.toFixed(2)}% (sollte ca. 15-16% sein)`);
    console.log(`MwSt / Netto: ${mwstVonNetto.toFixed(2)}% (sollte ca. 19% sein)`);
    
    // Check for problematic entries
    const problematicInvoices = await prisma.rechnung.findMany({
      where: {
        OR: [
          { mwstBetrag: { gt: prisma.rechnung.fields.betragBrutto } },
          { betragNetto: { gt: prisma.rechnung.fields.betragBrutto } }
        ]
      },
      select: {
        rechnungsnummer: true,
        betragNetto: true,
        betragBrutto: true,
        mwstBetrag: true
      },
      take: 10
    });
    
    console.log(`\n=== Problematische Rechnungen (erste 10) ===`);
    if (problematicInvoices.length > 0) {
      problematicInvoices.forEach(inv => {
        console.log(`Rechnung ${inv.rechnungsnummer}:`);
        console.log(`  Netto: ${Number(inv.betragNetto).toFixed(2)} €`);
        console.log(`  Brutto: ${Number(inv.betragBrutto).toFixed(2)} €`);
        console.log(`  MwSt: ${Number(inv.mwstBetrag || 0).toFixed(2)} €`);
        console.log(`  Problem: ${Number(inv.mwstBetrag || 0) > Number(inv.betragBrutto) ? 'MwSt > Brutto' : 'Netto > Brutto'}`);
      });
    } else {
      console.log('Keine problematischen Rechnungen gefunden.');
    }
    
    // Sample some recent invoices
    const recentInvoices = await prisma.rechnung.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        rechnungsnummer: true,
        betragNetto: true,
        betragBrutto: true,
        mwstBetrag: true,
        mwstSatz: true
      }
    });
    
    console.log(`\n=== Letzte 5 Rechnungen ===`);
    recentInvoices.forEach(inv => {
      const netto = Number(inv.betragNetto);
      const brutto = Number(inv.betragBrutto);
      const mwst = Number(inv.mwstBetrag || 0);
      const calculatedMwst = brutto - netto;
      
      console.log(`\nRechnung ${inv.rechnungsnummer} (${inv.mwstSatz}):`);
      console.log(`  Netto: ${netto.toFixed(2)} €`);
      console.log(`  MwSt: ${mwst.toFixed(2)} € (berechnet: ${calculatedMwst.toFixed(2)} €)`);
      console.log(`  Brutto: ${brutto.toFixed(2)} €`);
      console.log(`  Check: ${(netto + mwst).toFixed(2)} € = ${brutto.toFixed(2)} € ? ${Math.abs((netto + mwst) - brutto) < 0.02 ? '✓' : '✗'}`);
    });
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMwStCalculation();
