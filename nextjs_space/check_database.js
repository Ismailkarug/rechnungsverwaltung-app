const { PrismaClient } = require('@/lib/db');

async function checkDatabase() {
  const { prisma } = require('/home/ubuntu/rechnungsverwaltung_app/nextjs_space/lib/db');
  
  try {
    // Count all invoices
    const total = await prisma.rechnung.count();
    const eingang = await prisma.rechnung.count({ where: { typ: 'Eingang' } });
    const ausgang = await prisma.rechnung.count({ where: { typ: 'Ausgang' } });
    
    console.log('\n=== Datenbank Status ===');
    console.log(`Gesamt Rechnungen: ${total}`);
    console.log(`Eingangsrechnungen (typ: 'Eingang'): ${eingang}`);
    console.log(`Ausgangsrechnungen (typ: 'Ausgang'): ${ausgang}`);
    
    // Get some sample invoices
    const samples = await prisma.rechnung.findMany({
      take: 5,
      select: {
        rechnungsnummer: true,
        lieferant: true,
        typ: true,
        datum: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('\n=== Letzte 5 Rechnungen ===');
    samples.forEach(inv => {
      console.log(`- ${inv.rechnungsnummer} | ${inv.lieferant} | typ: ${inv.typ} | ${inv.datum.toLocaleDateString()}`);
    });
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
