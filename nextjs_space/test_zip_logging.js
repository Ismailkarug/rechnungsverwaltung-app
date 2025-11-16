const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

async function testZIPImport() {
  console.log('🧪 ZIP Import Loglama Testi Başlıyor...\n');
  
  // Test ZIP dosyası oluştur (zaten var olan invoices/ klasöründen)
  const zipPath = '/tmp/test_invoices.zip';
  
  if (!fs.existsSync(zipPath)) {
    console.error('❌ Test ZIP dosyası bulunamadı:', zipPath);
    return;
  }
  
  const formData = new FormData();
  formData.append('file', fs.createReadStream(zipPath), 'test_invoices.zip');
  formData.append('skipDuplicates', 'true');
  formData.append('invoiceType', 'Eingang');
  
  try {
    console.log('📤 ZIP dosyası yükleniyor...');
    const response = await fetch('http://localhost:3000/api/async-zip-import', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('📥 API Yanıtı:', JSON.stringify(result, null, 2));
    
    if (result.importId) {
      console.log('\n⏳ Import durumu kontrol ediliyor...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const progressResponse = await fetch(`http://localhost:3000/api/async-zip-import?importId=${result.importId}`);
      const progressResult = await progressResponse.json();
      console.log('📊 Progress:', JSON.stringify(progressResult, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Hata:', error);
  }
}

testZIPImport();
