
import { Suspense } from 'react';
import AmazonFinanceClient from './_components/amazon-finance-client';

export const metadata = {
  title: 'Amazon Finance | Rechnungsverwaltung',
  description: 'Amazon Finanzübersicht - Umsatz, Gebühren & Nettogewinn',
};

export default async function AmazonFinancePage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <Suspense fallback={<div>Laden...</div>}>
        <AmazonFinanceClient />
      </Suspense>
    </div>
  );
}
