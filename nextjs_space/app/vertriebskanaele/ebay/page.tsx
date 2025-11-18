
import { Suspense } from 'react';
import EbayFinanceClient from './_components/ebay-finance-client';
import { Sidebar } from '@/components/sidebar';

export const metadata = {
  title: 'eBay Finance | Rechnungsverwaltung',
  description: 'eBay Finanzübersicht - Umsatz, Gebühren & Nettogewinn',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EbayFinancePage() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 bg-slate-50 dark:bg-gray-900">
        <div className="space-y-6 p-8 pt-6">
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Lade eBay Finanzdaten...</p>
              </div>
            </div>
          }>
            <EbayFinanceClient />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
