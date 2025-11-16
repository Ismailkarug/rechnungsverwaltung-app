require('dotenv').config();
const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient();

async function checkCounts() {
  try {
    const total = await prisma.rechnung.count();
    const validBrutto = await prisma.rechnung.count({ where: { betragBrutto: { gt: 0 } } });
    const eingang = await prisma.rechnung.count({ where: { typ: 'Eingang' } });
    const ausgangCount = await prisma.rechnung.count({ where: { typ: 'Ausgang' } });
    const eingangValid = await prisma.rechnung.count({ where: { typ: 'Eingang', betragBrutto: { gt: 0 } } });
    const ausgangValid = await prisma.rechnung.count({ where: { typ: 'Ausgang', betragBrutto: { gt: 0 } } });
    
    console.log('\n=== Rechnungszahlen ===');
    console.log(`Gesamt: ${total}`);
    console.log(`Mit gültigem Bruttobetrag (> 0): ${validBrutto}`);
    console.log(`Mit ungültigem Bruttobetrag (= 0): ${total - validBrutto}`);
    console.log(`\nEingangsrechnungen: ${eingang} (davon ${eingangValid} gültig)`);
    console.log(`Ausgangsrechnungen: ${ausgangCount} (davon ${ausgangValid} gültig)`);
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCounts();
