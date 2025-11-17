require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function exportCSV() {
  try {
    const allInvoices = await prisma.rechnung.findMany({
      orderBy: { datum: 'asc' }
    });

    const incoming = allInvoices.filter(inv => inv.typ === 'Eingang');
    const outgoing = allInvoices.filter(inv => inv.typ === 'Ausgang');

    // Export Incoming Invoices
    const incomingCSV = [
      'Invoice ID,Date,Supplier,Net Amount,VAT Rate,VAT Amount,Gross Amount,Status'
    ];
    
    incoming.forEach(inv => {
      incomingCSV.push([
        inv.rechnungsnummer || 'N/A',
        inv.datum.toISOString().substring(0, 10),
        (inv.lieferant || 'Unknown').replace(/,/g, ';'),
        Number(inv.betragNetto).toFixed(2),
        inv.mwstSatz || 0,
        (Number(inv.mwstBetrag) || 0).toFixed(2),
        Number(inv.betragBrutto).toFixed(2),
        inv.status || 'N/A'
      ].join(','));
    });

    fs.writeFileSync('/home/ubuntu/INCOMING_INVOICES.csv', incomingCSV.join('\n'));
    console.log('✅ Exported Incoming Invoices to: /home/ubuntu/INCOMING_INVOICES.csv');

    // Export Outgoing Invoices
    const outgoingCSV = [
      'Invoice ID,Date,Customer,Net Amount,VAT Rate,VAT Amount,Gross Amount,Status'
    ];
    
    outgoing.forEach(inv => {
      outgoingCSV.push([
        inv.rechnungsnummer || 'N/A',
        inv.datum.toISOString().substring(0, 10),
        (inv.lieferant || 'Unknown').replace(/,/g, ';'),
        Number(inv.betragNetto).toFixed(2),
        inv.mwstSatz || 0,
        (Number(inv.mwstBetrag) || 0).toFixed(2),
        Number(inv.betragBrutto).toFixed(2),
        inv.status || 'N/A'
      ].join(','));
    });

    fs.writeFileSync('/home/ubuntu/OUTGOING_INVOICES.csv', outgoingCSV.join('\n'));
    console.log('✅ Exported Outgoing Invoices to: /home/ubuntu/OUTGOING_INVOICES.csv');

    // Monthly Summary
    const monthlySummaryCSV = [
      'Month,Incoming Count,Incoming Gross,Outgoing Count,Outgoing Gross,Net Flow'
    ];

    function getMonthlyStats(invoices) {
      const monthly = {};
      invoices.forEach(inv => {
        const monthKey = inv.datum.toISOString().substring(0, 7);
        if (!monthly[monthKey]) {
          monthly[monthKey] = { count: 0, totalGross: 0 };
        }
        monthly[monthKey].count++;
        monthly[monthKey].totalGross += Number(inv.betragBrutto);
      });
      return monthly;
    }

    const incomingMonthly = getMonthlyStats(incoming);
    const outgoingMonthly = getMonthlyStats(outgoing);

    const allMonths = new Set([...Object.keys(incomingMonthly), ...Object.keys(outgoingMonthly)]);
    const sortedMonths = Array.from(allMonths).sort();

    sortedMonths.forEach(month => {
      const inc = incomingMonthly[month] || { count: 0, totalGross: 0 };
      const out = outgoingMonthly[month] || { count: 0, totalGross: 0 };
      const netFlow = out.totalGross - inc.totalGross;
      
      monthlySummaryCSV.push([
        month,
        inc.count,
        inc.totalGross.toFixed(2),
        out.count,
        out.totalGross.toFixed(2),
        netFlow.toFixed(2)
      ].join(','));
    });

    fs.writeFileSync('/home/ubuntu/MONTHLY_SUMMARY.csv', monthlySummaryCSV.join('\n'));
    console.log('✅ Exported Monthly Summary to: /home/ubuntu/MONTHLY_SUMMARY.csv');

    console.log('\n📊 Export Complete!');
    console.log('Files created:');
    console.log('  1. /home/ubuntu/INCOMING_INVOICES.csv (' + incoming.length + ' records)');
    console.log('  2. /home/ubuntu/OUTGOING_INVOICES.csv (' + outgoing.length + ' records)');
    console.log('  3. /home/ubuntu/MONTHLY_SUMMARY.csv (' + sortedMonths.length + ' months)');
    console.log('  4. /home/ubuntu/INVOICE_ANALYSIS_REPORT.md (Full report)');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exportCSV();
