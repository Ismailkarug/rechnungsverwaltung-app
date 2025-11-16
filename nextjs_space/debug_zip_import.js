const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugZipImport() {
  console.log('=== ZIP Import Debug Scripti ===\n');

  try {
    // 1. Toplam fatura sayısını kontrol et
    const totalInvoices = await prisma.rechnung.count();
    console.log(`📊 Toplam fatura sayısı: ${totalInvoices}`);

    // 2. Tip bazında fatura sayıları
    const eingangCount = await prisma.rechnung.count({
      where: { typ: 'Eingang' }
    });
    const ausgangCount = await prisma.rechnung.count({
      where: { typ: 'Ausgang' }
    });
    console.log(`📥 Eingang (Giriş) faturaları: ${eingangCount}`);
    console.log(`📤 Ausgang (Çıkış) faturaları: ${ausgangCount}`);

    // 3. Son 10 faturayı göster
    console.log('\n📋 Son 10 fatura:');
    const recentInvoices = await prisma.rechnung.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rechnungsnummer: true,
        lieferant: true,
        datum: true,
        betragBrutto: true,
        typ: true,
        createdAt: true
      }
    });

    recentInvoices.forEach((inv, idx) => {
      console.log(`${idx + 1}. ${inv.rechnungsnummer} - ${inv.lieferant} - ${inv.betragBrutto}€ - ${inv.typ} - ${inv.createdAt.toISOString()}`);
    });

    // 4. Bugün eklenen faturaları kontrol et
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayInvoices = await prisma.rechnung.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });
    console.log(`\n📅 Bugün eklenen fatura sayısı: ${todayInvoices}`);

    // 5. Veritabanı şemasını kontrol et
    console.log('\n🔍 Veritabanı bağlantısı: ✅ Başarılı');
    console.log('🔍 Prisma Client: ✅ Çalışıyor');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugZipImport();
