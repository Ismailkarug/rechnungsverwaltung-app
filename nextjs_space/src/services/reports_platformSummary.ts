
import { PrismaClient, Platform } from '@prisma/client';

const prisma = new PrismaClient();

export interface PlatformBucket {
  count: number;
  grossTotal: number;
  netTotal: number;
  vatTotal: number;
}

export interface FeeSummary {
  platformFees: number;
  paymentFees: number;
  adCosts: number;
  shippingCosts: number;
  total: number;
}

export interface MonthlyData {
  month: string;
  grossTotal: number;
  netTotal: number;
  fees: number;
  orderCount: number;
}

export interface PlatformSummary {
  platform: Platform;
  from: Date;
  to: Date;
  summary: {
    orderCount: number;
    grossTotal: number;
    netTotal: number;
    vatTotal: number;
    averageOrderValue: number;
    fees: FeeSummary;
    netProfit: number;
    profitMargin: number;
    refunds: {
      count: number;
      amount: number;
    };
  };
  breakdown: {
    outgoing: PlatformBucket;
    incoming: PlatformBucket;
  };
  monthlyData: MonthlyData[];
}

export async function getPlatformSummary(
  platform: Platform,
  from: Date,
  to: Date
): Promise<PlatformSummary> {
  const invoices = await prisma.rechnung.findMany({
    where: {
      plattform: platform,
      datum: { gte: from, lte: to },
    },
    include: {
      gebuehren: true,
    },
  });

  // Fetch ad costs separately (not linked to invoices)
  const adCosts = await prisma.adCost.findMany({
    where: {
      plattform: platform,
      datum: { gte: from, lte: to },
    },
  });

  // Initialize buckets
  const outgoing: PlatformBucket = { count: 0, grossTotal: 0, netTotal: 0, vatTotal: 0 };
  const incoming: PlatformBucket = { count: 0, grossTotal: 0, netTotal: 0, vatTotal: 0 };
  
  let totalGross = 0;
  let totalNet = 0;
  let totalVat = 0;
  let totalFees = 0;

  // Calculate total ad costs
  let totalAdCosts = 0;
  for (const ad of adCosts) {
    totalAdCosts += Number(ad.betrag || 0);
  }

  // Monthly aggregation
  const monthlyMap = new Map<string, MonthlyData>();

  for (const inv of invoices) {
    const gross = Number(inv.betragBrutto || 0);
    const net = Number(inv.betragNetto || 0);
    const vat = Number(inv.mwstBetrag || 0);

    totalGross += gross;
    totalNet += net;
    totalVat += vat;

    // Aggregate fees from gebuehren relation
    if (inv.gebuehren && inv.gebuehren.length > 0) {
      for (const fee of inv.gebuehren) {
        totalFees += Number(fee.betrag || 0);
      }
    }

    // Breakdown by type
    const bucket = inv.typ === 'Ausgang' ? outgoing : incoming;
    bucket.count += 1;
    bucket.grossTotal += gross;
    bucket.netTotal += net;
    bucket.vatTotal += vat;

    // Monthly data
    const monthKey = inv.datum.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: monthKey,
        grossTotal: 0,
        netTotal: 0,
        fees: 0,
        orderCount: 0,
      });
    }
    const monthData = monthlyMap.get(monthKey)!;
    monthData.grossTotal += gross;
    monthData.netTotal += net;
    monthData.orderCount += 1;
    
    // Add fees to monthly data
    if (inv.gebuehren) {
      for (const fee of inv.gebuehren) {
        monthData.fees += Number(fee.betrag || 0);
      }
    }
  }

  const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => 
    a.month.localeCompare(b.month)
  );

  const orderCount = invoices.length;
  const averageOrderValue = orderCount > 0 ? totalGross / orderCount : 0;
  
  // Calculate fees breakdown (simplified - you may want to enhance this)
  const fees: FeeSummary = {
    platformFees: totalFees * 0.4, // Assume 40% are platform fees
    paymentFees: totalFees * 0.3, // Assume 30% are payment fees
    adCosts: totalAdCosts,
    shippingCosts: totalFees * 0.3, // Assume 30% are shipping costs
    total: totalFees + totalAdCosts,
  };

  const netProfit = totalNet - fees.total;
  const profitMargin = totalNet > 0 ? (netProfit / totalNet) * 100 : 0;

  return {
    platform,
    from,
    to,
    summary: {
      orderCount,
      grossTotal: totalGross,
      netTotal: totalNet,
      vatTotal: totalVat,
      averageOrderValue,
      fees,
      netProfit,
      profitMargin,
      refunds: {
        count: 0, // TODO: Implement refund tracking
        amount: 0,
      },
    },
    breakdown: {
      outgoing,
      incoming,
    },
    monthlyData,
  };
}
