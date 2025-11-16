
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInvoices() {
  try {
    const total = await prisma.rechnung.count();
    const eingang = await prisma.rechnung.count({ where: { typ: 'Eingang' } });
    const ausgang = await prisma.rechnung.count({ where: { typ: 'Ausgang' } });
    
    console.log('=== Veritabanı Durum ===');
    console.log('Toplam fatura:', total);
    console.log('Eingang (Gelen):', eingang);
    console.log('Ausgang (Satış):', ausgang);
    
    // Son 10 faturayı göster
    const recent = await prisma.rechnung.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        rechnungsnummer: true,
        lieferant: true,
        typ: true,
        createdAt: true,
        dateipfad: true
      }
    });
    
    console.log('\n=== Son 10 Fatura ===');
    recent.forEach(r => {
      console.log(`${r.rechnungsnummer} - ${r.lieferant} - Tip: ${r.typ} - ${r.createdAt}`);
      console.log(`  Dosya: ${r.dateipfad || 'YOK'}`);
    });
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoices();
