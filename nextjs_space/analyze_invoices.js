require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeInvoices() {
  try {
    const allInvoices = await prisma.rechnung.findMany({
      orderBy: { datum: 'asc' }
    });

    console.log('='.repeat(80));
    console.log('COMPLETE INVOICE DATASET ANALYSIS');
    console.log('='.repeat(80));
    console.log();

    const incoming = allInvoices.filter(inv => inv.typ === 'Eingang');
    const outgoing = allInvoices.filter(inv => inv.typ === 'Ausgang');

    console.log('1. INVOICE COUNT');
    console.log('-'.repeat(80));
    console.log(`Total Invoices: ${allInvoices.length}`);
    console.log(`  • Incoming Invoices (Expenses): ${incoming.length}`);
    console.log(`  • Outgoing Invoices (Sales Revenue): ${outgoing.length}`);
    console.log();

    function calculateFinancials(invoices, category) {
      console.log();
      console.log('='.repeat(80));
      console.log(`2. FINANCIAL AGGREGATION - ${category.toUpperCase()}`);
      console.log('='.repeat(80));
      
      const totalGross = invoices.reduce((sum, inv) => sum + Number(inv.betragBrutto), 0);
      const totalNet = invoices.reduce((sum, inv) => sum + Number(inv.betragNetto), 0);
      const totalVAT = invoices.reduce((sum, inv) => sum + (Number(inv.mwstBetrag) || 0), 0);
      
      console.log(`Total Gross Amount: ${totalGross.toFixed(2)} €`);
      console.log(`Total Net Amount: ${totalNet.toFixed(2)} €`);
      console.log(`Total VAT Amount: ${totalVAT.toFixed(2)} €`);
      console.log();

      console.log('VAT DISTRIBUTION BY VAT RATE:');
      console.log('-'.repeat(80));
      
      const vatGroups = {};
      invoices.forEach(inv => {
        const rate = inv.mwstSatz || 0;
        if (!vatGroups[rate]) {
          vatGroups[rate] = { count: 0, totalVAT: 0, totalNet: 0, totalGross: 0 };
        }
        vatGroups[rate].count++;
        vatGroups[rate].totalVAT += Number(inv.mwstBetrag) || 0;
        vatGroups[rate].totalNet += Number(inv.betragNetto);
        vatGroups[rate].totalGross += Number(inv.betragBrutto);
      });

      Object.keys(vatGroups).sort((a, b) => Number(b) - Number(a)).forEach(rate => {
        const group = vatGroups[rate];
        console.log(`\nVAT Rate: ${rate}%`);
        console.log(`  Number of Invoices: ${group.count}`);
        console.log(`  Total VAT ${category === 'Incoming' ? 'Paid' : 'Collected'}: ${group.totalVAT.toFixed(2)} €`);
        console.log(`  Total Net Amount: ${group.totalNet.toFixed(2)} €`);
        console.log(`  Total Gross Amount: ${group.totalGross.toFixed(2)} €`);
      });

      return { totalGross, totalNet, totalVAT, vatGroups };
    }

    const incomingStats = calculateFinancials(incoming, 'Incoming');
    const outgoingStats = calculateFinancials(outgoing, 'Outgoing');

    function showDetailedListing(invoices, category) {
      console.log();
      console.log('='.repeat(80));
      console.log(`3. DETAILED LISTING - ${category.toUpperCase()}`);
      console.log('='.repeat(80));
      console.log();

      const header = category === 'Incoming' ? 'Supplier' : 'Customer';
      console.log(`${'ID'.padEnd(15)} ${'Date'.padEnd(12)} ${header.padEnd(30)} ${'Net €'.padEnd(12)} ${'VAT%'.padEnd(6)} ${'VAT €'.padEnd(12)} ${'Gross €'.padEnd(12)}`);
      console.log('-'.repeat(120));

      invoices.slice(0, 50).forEach(inv => {
        const id = (inv.rechnungsnummer || 'N/A').toString().substring(0, 14).padEnd(15);
        const date = inv.datum.toISOString().substring(0, 10).padEnd(12);
        const partner = (inv.lieferant || 'Unknown').substring(0, 29).padEnd(30);
        const net = Number(inv.betragNetto).toFixed(2).padStart(10).padEnd(12);
        const vatRate = (inv.mwstSatz || 0).toString().padStart(4).padEnd(6);
        const vat = (Number(inv.mwstBetrag) || 0).toFixed(2).padStart(10).padEnd(12);
        const gross = Number(inv.betragBrutto).toFixed(2).padStart(10).padEnd(12);
        
        console.log(`${id} ${date} ${partner} ${net} ${vatRate} ${vat} ${gross}`);
      });

      if (invoices.length > 50) {
        console.log(`\n... and ${invoices.length - 50} more invoices`);
      }
    }

    showDetailedListing(incoming, 'Incoming');
    showDetailedListing(outgoing, 'Outgoing');

    console.log();
    console.log('='.repeat(80));
    console.log('4. MONTHLY TOTALS SUMMARY');
    console.log('='.repeat(80));
    console.log();

    function getMonthlyStats(invoices) {
      const monthly = {};
      invoices.forEach(inv => {
        const monthKey = inv.datum.toISOString().substring(0, 7);
        if (!monthly[monthKey]) {
          monthly[monthKey] = { count: 0, totalGross: 0, totalNet: 0, totalVAT: 0 };
        }
        monthly[monthKey].count++;
        monthly[monthKey].totalGross += Number(inv.betragBrutto);
        monthly[monthKey].totalNet += Number(inv.betragNetto);
        monthly[monthKey].totalVAT += Number(inv.mwstBetrag) || 0;
      });
      return monthly;
    }

    const incomingMonthly = getMonthlyStats(incoming);
    const outgoingMonthly = getMonthlyStats(outgoing);

    const allMonths = new Set([...Object.keys(incomingMonthly), ...Object.keys(outgoingMonthly)]);
    const sortedMonths = Array.from(allMonths).sort();

    console.log(`${'Month'.padEnd(12)} ${'Inc.Count'.padEnd(12)} ${'Inc.Gross €'.padEnd(15)} ${'Out.Count'.padEnd(12)} ${'Out.Gross €'.padEnd(15)} ${'Net Flow €'.padEnd(15)}`);
    console.log('-'.repeat(90));

    sortedMonths.forEach(month => {
      const inc = incomingMonthly[month] || { count: 0, totalGross: 0 };
      const out = outgoingMonthly[month] || { count: 0, totalGross: 0 };
      const netFlow = out.totalGross - inc.totalGross;
      
      console.log(
        `${month.padEnd(12)} ` +
        `${inc.count.toString().padStart(10).padEnd(12)} ` +
        `${inc.totalGross.toFixed(2).padStart(13).padEnd(15)} ` +
        `${out.count.toString().padStart(10).padEnd(12)} ` +
        `${out.totalGross.toFixed(2).padStart(13).padEnd(15)} ` +
        `${netFlow.toFixed(2).padStart(13).padEnd(15)}`
      );
    });

    console.log();
    console.log('='.repeat(80));
    console.log('5. KEY INSIGHTS');
    console.log('='.repeat(80));
    console.log();

    console.log('TOP 10 COST DRIVERS (Suppliers):');
    console.log('-'.repeat(80));
    const supplierTotals = {};
    incoming.forEach(inv => {
      const supplier = inv.lieferant || 'Unknown';
      if (!supplierTotals[supplier]) {
        supplierTotals[supplier] = { count: 0, total: 0 };
      }
      supplierTotals[supplier].count++;
      supplierTotals[supplier].total += Number(inv.betragBrutto);
    });

    const topSuppliers = Object.entries(supplierTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    topSuppliers.forEach(([supplier, data], idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${supplier.padEnd(40)} ${data.count.toString().padStart(4)} invoices  ${data.total.toFixed(2).padStart(12)} €`);
    });

    console.log();
    console.log('TOP 10 REVENUE CONTRIBUTORS (Customers):');
    console.log('-'.repeat(80));
    const customerTotals = {};
    outgoing.forEach(inv => {
      const customer = inv.lieferant || 'Unknown';
      if (!customerTotals[customer]) {
        customerTotals[customer] = { count: 0, total: 0 };
      }
      customerTotals[customer].count++;
      customerTotals[customer].total += Number(inv.betragBrutto);
    });

    const topCustomers = Object.entries(customerTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    topCustomers.forEach(([customer, data], idx) => {
      console.log(`${(idx + 1).toString().padStart(2)}. ${customer.padEnd(40)} ${data.count.toString().padStart(4)} invoices  ${data.total.toFixed(2).padStart(12)} €`);
    });

    console.log();
    console.log('VOLUME TRENDS:');
    console.log('-'.repeat(80));
    
    const highestIncMonth = sortedMonths.reduce((max, month) => {
      const current = incomingMonthly[month]?.totalGross || 0;
      const maxValue = incomingMonthly[max]?.totalGross || 0;
      return current > maxValue ? month : max;
    }, sortedMonths[0]);

    const highestOutMonth = sortedMonths.reduce((max, month) => {
      const current = outgoingMonthly[month]?.totalGross || 0;
      const maxValue = outgoingMonthly[max]?.totalGross || 0;
      return current > maxValue ? month : max;
    }, sortedMonths[0]);

    console.log(`Highest Incoming Volume Month: ${highestIncMonth} (${(incomingMonthly[highestIncMonth]?.totalGross || 0).toFixed(2)} €)`);
    console.log(`Highest Outgoing Volume Month: ${highestOutMonth} (${(outgoingMonthly[highestOutMonth]?.totalGross || 0).toFixed(2)} €)`);
    console.log();
    console.log(`Average Monthly Incoming: ${(incomingStats.totalGross / sortedMonths.length).toFixed(2)} €`);
    console.log(`Average Monthly Outgoing: ${(outgoingStats.totalGross / sortedMonths.length).toFixed(2)} €`);

    console.log();
    console.log('VAT IMPLICATIONS FOR ACCOUNTING:');
    console.log('-'.repeat(80));
    console.log(`Total VAT Paid (Incoming): ${incomingStats.totalVAT.toFixed(2)} €`);
    console.log(`Total VAT Collected (Outgoing): ${outgoingStats.totalVAT.toFixed(2)} €`);
    console.log(`Net VAT Position: ${(outgoingStats.totalVAT - incomingStats.totalVAT).toFixed(2)} € ${outgoingStats.totalVAT > incomingStats.totalVAT ? '(to pay)' : '(refund)'}`);

    console.log();
    console.log('='.repeat(80));
    console.log('END OF ANALYSIS');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeInvoices();
