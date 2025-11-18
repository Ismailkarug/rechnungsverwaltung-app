
import { PrismaClient, Platform } from '@prisma/client';

const prisma = new PrismaClient();

export interface PlatformBucket {
  invoiceCount: number;
  grossTotal: number;
  netTotal: number;
  vatTotal: number;
}

export interface PlatformSummary {
  platform: Platform;
  from: Date;
  to: Date;
  invoiceCount: number;
  grossTotal: number;
  netTotal: number;
  vatTotal: number;
  outgoing: PlatformBucket;
  incoming: PlatformBucket;
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
  });

  const baseBucket: PlatformBucket = {
    invoiceCount: 0,
    grossTotal: 0,
    netTotal: 0,
    vatTotal: 0,
  };

  const result: PlatformSummary = {
    platform,
    from,
    to,
    invoiceCount: invoices.length,
    grossTotal: 0,
    netTotal: 0,
    vatTotal: 0,
    outgoing: { ...baseBucket },
    incoming: { ...baseBucket },
  };

  for (const inv of invoices) {
    const gross = Number(inv.betragBrutto);
    const net = Number(inv.betragNetto);
    const vat = Number(inv.mwstBetrag || 0);

    result.grossTotal += gross;
    result.netTotal += net;
    result.vatTotal += vat;

    const bucket = inv.typ === 'Ausgang' ? result.outgoing : result.incoming;
    bucket.invoiceCount += 1;
    bucket.grossTotal += gross;
    bucket.netTotal += net;
    bucket.vatTotal += vat;
  }

  return result;
}
