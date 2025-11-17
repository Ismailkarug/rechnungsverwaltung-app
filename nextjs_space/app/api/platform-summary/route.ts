
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') as Platform;
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    if (!platform || !fromDate || !toDate) {
      return NextResponse.json(
        { error: 'Missing required parameters: platform, from, to' },
        { status: 400 }
      );
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    // Fetch all invoices for the platform and date range
    const invoices = await prisma.rechnung.findMany({
      where: {
        plattform: platform,
        datum: {
          gte: from,
          lte: to,
        },
      },
      include: {
        gebuehren: true,
      },
      orderBy: {
        datum: 'desc',
      },
    });

    // Calculate aggregates
    let totalGross = 0;
    let totalNet = 0;
    let totalVAT = 0;
    let totalPlatformFees = 0;
    let totalPaymentFees = 0;
    let totalAdCosts = 0;
    let totalShippingCosts = 0;
    let orderCount = 0;
    let refundCount = 0;
    let refundAmount = 0;

    const outgoing = {
      count: 0,
      grossTotal: 0,
      netTotal: 0,
      vatTotal: 0,
    };

    const incoming = {
      count: 0,
      grossTotal: 0,
      netTotal: 0,
      vatTotal: 0,
    };

    const monthlyData: Record<string, any> = {};

    for (const inv of invoices) {
      const gross = Number(inv.betragBrutto);
      const net = Number(inv.betragNetto);
      const vat = Number(inv.mwstBetrag || 0);

      totalGross += gross;
      totalNet += net;
      totalVAT += vat;
      orderCount++;

      // Platform fees
      totalPlatformFees += Number(inv.plattformgebuehr || 0);
      totalPaymentFees += Number(inv.zahlungsgebuehr || 0);
      totalAdCosts += Number(inv.werbekosten || 0);
      totalShippingCosts += Number(inv.versandkosten || 0);

      // Refunds
      if (inv.istRueckerstattung) {
        refundCount++;
        refundAmount += gross;
      }

      // Split by type
      if (inv.typ === 'Ausgang') {
        outgoing.count++;
        outgoing.grossTotal += gross;
        outgoing.netTotal += net;
        outgoing.vatTotal += vat;
      } else {
        incoming.count++;
        incoming.grossTotal += gross;
        incoming.netTotal += net;
        incoming.vatTotal += vat;
      }

      // Monthly aggregation
      const monthKey = inv.datum.toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          grossTotal: 0,
          netTotal: 0,
          fees: 0,
          orderCount: 0,
        };
      }
      monthlyData[monthKey].grossTotal += gross;
      monthlyData[monthKey].netTotal += net;
      monthlyData[monthKey].fees +=
        Number(inv.plattformgebuehr || 0) +
        Number(inv.zahlungsgebuehr || 0) +
        Number(inv.werbekosten || 0);
      monthlyData[monthKey].orderCount++;
    }

    // Fetch ad costs
    const adCosts = await prisma.adCost.findMany({
      where: {
        plattform: platform,
        datum: {
          gte: from,
          lte: to,
        },
      },
    });

    const totalAdCostsFromDB = adCosts.reduce(
      (sum, ad) => sum + Number(ad.betrag),
      0
    );
    totalAdCosts += totalAdCostsFromDB;

    // Calculate net profit
    const totalFees =
      totalPlatformFees + totalPaymentFees + totalAdCosts + totalShippingCosts;
    const netProfit = totalGross - totalFees;
    const profitMargin = totalGross > 0 ? (netProfit / totalGross) * 100 : 0;

    return NextResponse.json({
      platform,
      dateRange: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        orderCount,
        grossTotal: totalGross,
        netTotal: totalNet,
        vatTotal: totalVAT,
        averageOrderValue: orderCount > 0 ? totalGross / orderCount : 0,
        fees: {
          platformFees: totalPlatformFees,
          paymentFees: totalPaymentFees,
          adCosts: totalAdCosts,
          shippingCosts: totalShippingCosts,
          total: totalFees,
        },
        netProfit,
        profitMargin,
        refunds: {
          count: refundCount,
          amount: refundAmount,
        },
      },
      breakdown: {
        outgoing,
        incoming,
      },
      monthlyData: Object.values(monthlyData).sort((a, b) =>
        a.month.localeCompare(b.month)
      ),
      recentInvoices: invoices.slice(0, 10).map((inv) => ({
        id: inv.id,
        rechnungsnummer: inv.rechnungsnummer,
        datum: inv.datum,
        lieferant: inv.lieferant,
        betragBrutto: Number(inv.betragBrutto),
        status: inv.status,
        bestellnummer: inv.bestellnummer,
      })),
    });
  } catch (error: any) {
    console.error('Platform summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform summary', details: error.message },
      { status: 500 }
    );
  }
}
