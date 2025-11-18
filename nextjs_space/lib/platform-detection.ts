
import { Platform } from '@prisma/client';

interface InvoiceData {
  zahlungsmethode?: string | null;
  bestellnummer?: string | null;
  referenz?: string | null;
  lieferant?: string;
}

/**
 * Detects the platform/marketplace based on invoice data
 * Uses heuristics from payment method, order number, reference, and supplier name
 */
export function detectPlatform(data: InvoiceData): Platform {
  const paymentMethod = (data.zahlungsmethode || '').toLowerCase();
  const orderNumber = (data.bestellnummer || '').toLowerCase();
  const reference = (data.referenz || '').toLowerCase();
  const supplier = (data.lieferant || '').toLowerCase();

  // eBay detection
  if (
    paymentMethod.includes('ebay') ||
    supplier.includes('ebay') ||
    orderNumber.includes('ebay')
  ) {
    return 'EBAY';
  }

  // Amazon detection
  if (
    paymentMethod.includes('amazon') ||
    supplier.includes('amazon') ||
    orderNumber.includes('amazon') ||
    orderNumber.startsWith('amz') ||
    orderNumber.startsWith('az')
  ) {
    return 'AMAZON';
  }

  // Shopify detection
  // PayPal with hash-style reference often indicates Shopify store
  if (
    paymentMethod.includes('shopify') ||
    supplier.includes('shopify') ||
    supplier.includes('ismailkar') ||
    (paymentMethod.includes('paypal') && reference.startsWith('#'))
  ) {
    return 'SHOPIFY';
  }

  // Default to OTHER if no clear platform detected
  return 'OTHER';
}

/**
 * Calculates platform fees based on platform and invoice amount
 * These are estimates - actual fees may vary
 */
export function calculatePlatformFees(platform: Platform, grossAmount: number): {
  platformFee: number;
  paymentFee: number;
  estimatedTotal: number;
} {
  let platformFee = 0;
  let paymentFee = 0;

  switch (platform) {
    case 'EBAY':
      // eBay: ~11% selling fee + 2.5% payment processing
      platformFee = grossAmount * 0.11;
      paymentFee = grossAmount * 0.025;
      break;

    case 'AMAZON':
      // Amazon: ~12% referral fee + FBA fees (estimated 15% total)
      platformFee = grossAmount * 0.15;
      paymentFee = 0; // Included in platform fee
      break;

    case 'SHOPIFY':
      // Shopify: 2.9% + €0.30 per transaction
      platformFee = 0; // Subscription based, not per transaction
      paymentFee = grossAmount * 0.029 + 0.30;
      break;

    default:
      // No fees for OTHER/NONE
      platformFee = 0;
      paymentFee = 0;
  }

  return {
    platformFee: Math.round(platformFee * 100) / 100,
    paymentFee: Math.round(paymentFee * 100) / 100,
    estimatedTotal: Math.round((platformFee + paymentFee) * 100) / 100,
  };
}
