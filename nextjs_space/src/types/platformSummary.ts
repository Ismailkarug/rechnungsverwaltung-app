
import type { Platform } from '@prisma/client';

export interface PlatformBucket {
  invoiceCount: number;
  grossTotal: number;
  netTotal: number;
  vatTotal: number;
}

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
  month: string; // 'YYYY-MM'
  outgoingGross: number;
  incomingGross: number;
  feeTotal: number;
  adCostTotal: number;
}

export interface PlatformSummary {
  platform: Platform;
  from: string;
  to: string;
  invoiceCount: number;
  grossTotal: number;
  netTotal: number;
  vatTotal: number;
  outgoing: PlatformBucket;
  incoming: PlatformBucket;
}

export interface PlatformSummaryResponse {
  from: string;
  to: string;
  summaries: PlatformSummary[];
}

export interface PlatformDetails {
  platform: Platform;
  from: string;
  to: string;
  summary: PlatformSummary;
  feeSummary: FeeSummary;
  monthly: MonthlyPoint[];
}
