
import { PrismaClient, Platform } from '@prisma/client';
import type { PlatformSummary } from './reports_platformSummary';

const prisma = new PrismaClient();

export interface FeeSummary {
  platformFees: number;
  paymentFees: number;
  adFees: number;
  shippingCosts: number;
  otherFees: number;
  totalFees: number;
  adCostsTotal: number;
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  outgoingGross: number;
  incomingGross: number;
  feeTotal: number;
  adCostTotal: number;
}

export interface PlatformDetails {
  platform: Platform;
  from: Date;
  to: Date;
  summary: PlatformSummary;
  feeSummary: FeeSummary;
  monthly: MonthlyPoint[];
}

function ymKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${m.toString().padStart(2, '0')}`;
}

export async function getPlatformDetails(
  platform: Platform,
  from: Date,
  to: Date,
  summary: PlatformSummary
): Promise<PlatformDetails> {
  // load invoices with fees
  const invoices = await prisma.rechnung.findMany({
    where: {
      plattform: platform,
      datum: { gte: from, lte: to },
    },
    include: {
      gebuehren: true,
    },
  });

  // load ad costs
  const adCosts = await prisma.adCost.findMany({
    where: {
      plattform: platform,
      datum: { gte: from, lte: to },
    },
  });

  const feeSummary: FeeSummary = {
    platformFees: 0,
    paymentFees: 0,
    adFees: 0,
    shippingCosts: 0,
    otherFees: 0,
    totalFees: 0,
    adCostsTotal: 0,
  };

  const monthlyMap = new Map<string, MonthlyPoint>();

  function getMonthlyPoint(key: string): MonthlyPoint {
    let mp = monthlyMap.get(key);
    if (!mp) {
      mp = {
        month: key,
        outgoingGross: 0,
        incomingGross: 0,
        feeTotal: 0,
        adCostTotal: 0,
      };
      monthlyMap.set(key, mp);
    }
    return mp;
  }

  for (const inv of invoices) {
    const date = new Date(inv.datum);
    const key = ymKey(date);
    const mp = getMonthlyPoint(key);
    const gross = Number(inv.betragBrutto);

    if (inv.typ === 'Ausgang') {
      mp.outgoingGross += gross;
    } else {
      mp.incomingGross += gross;
    }

    for (const fee of inv.gebuehren) {
      const amount = Number(fee.betrag);
      switch (fee.typ) {
        case 'PLATFORM_FEE':
          feeSummary.platformFees += amount;
          break;
        case 'PAYMENT_FEE':
          feeSummary.paymentFees += amount;
          break;
        case 'AD_FEE':
          feeSummary.adFees += amount;
          break;
        case 'SHIPPING_COST':
          feeSummary.shippingCosts += amount;
          break;
        default:
          feeSummary.otherFees += amount;
      }
      feeSummary.totalFees += amount;
      mp.feeTotal += amount;
    }
  }

  for (const ad of adCosts) {
    const amount = Number(ad.betrag);
    feeSummary.adCostsTotal += amount;

    const key = ymKey(new Date(ad.datum));
    const mp = getMonthlyPoint(key);
    mp.adCostTotal += amount;
  }

  const monthly = Array.from(monthlyMap.values()).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return {
    platform,
    from,
    to,
    summary,
    feeSummary,
    monthly,
  };
}
