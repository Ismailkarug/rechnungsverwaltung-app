
import { Suspense } from 'react';
import EbayFinanceClient from './_components/ebay-finance-client';

export const metadata = {
  title: 'eBay Finance | Rechnungsverwaltung',
  description: 'eBay Finanzübersicht - Umsatz, Gebühren & Nettogewinn',
};

export default async function EbayFinancePage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <Suspense fallback={<div>Laden...</div>}>
        <EbayFinanceClient />
      </Suspense>
    </div>
  );
}
