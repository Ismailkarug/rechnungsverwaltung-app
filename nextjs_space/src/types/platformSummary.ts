
import type { Platform } from '@prisma/client';

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
  from: string;
  to: string;
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
  monthly: MonthlyData[];
}

// Export MonthlyPoint as alias for backwards compatibility
export type MonthlyPoint = MonthlyData;
