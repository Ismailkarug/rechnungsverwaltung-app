
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentImports() {
  try {
    // Son 24 saat içinde eklenen faturaları kontrol et
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentInvoices = await prisma.rechnung.findMany({
      where: {
        createdAt: {
          gte: oneDayAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        rechnungsnummer: true,
        lieferant: true,
        typ: true,
        createdAt: true
      }
    });
    
    console.log(`\n=== Son 24 saatte eklenen faturalar: ${recentInvoices.length} ===\n`);
    
    const eingangCount = recentInvoices.filter(r => r.typ === 'Eingang').length;
    const ausgangCount = recentInvoices.filter(r => r.typ === 'Ausgang').length;
    
    console.log(`Eingang: ${eingangCount}`);
    console.log(`Ausgang: ${ausgangCount}\n`);
    
    if (recentInvoices.length > 0) {
      console.log('İlk 20 fatura:');
      recentInvoices.slice(0, 20).forEach(r => {
        console.log(`  ${r.rechnungsnummer} - ${r.lieferant} - Tip: ${r.typ}`);
      });
    }
    
  } catch (error) {
    console.error('Hata:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentImports();
