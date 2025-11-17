
import { Suspense } from 'react';
import ShopifyFinanceClient from './_components/shopify-finance-client';

export const metadata = {
  title: 'Shopify Finance (ismailkar.de) | Rechnungsverwaltung',
  description: 'Shopify Finanzübersicht - Umsatz, Gebühren & Nettogewinn',
};

export default async function ShopifyFinancePage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <Suspense fallback={<div>Laden...</div>}>
        <ShopifyFinanceClient />
      </Suspense>
    </div>
  );
}
