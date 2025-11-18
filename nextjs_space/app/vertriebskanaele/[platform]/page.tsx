
import { Platform } from '@prisma/client';
import { PlatformDetails } from '@/src/types/platformSummary';
import { PlatformMonthlyChart } from '@/components/charts/PlatformMonthlyChart';
import Link from 'next/link';

interface PageProps {
  params: { platform: string };
  searchParams: { from?: string; to?: string };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('de-DE').format(value);
}

const PLATFORM_LABEL: Record<Platform, string> = {
  EBAY: 'eBay',
  AMAZON: 'Amazon',
  SHOPIFY: 'Shopify',
  OTHER: 'Sonstige',
  NONE: 'Nicht zugeordnet',
};

async function fetchDetails(
  platform: Platform,
  from?: string,
  to?: string
): Promise<PlatformDetails> {
  const params = new URLSearchParams({ platform });
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/platform-details?${params.toString()}`,
    { cache: 'no-store' }
  );
  if (!res.ok) throw new Error('Failed to fetch platform details');
  return res.json();
}

export default async function PlatformPage({ params, searchParams }: PageProps) {
  const platform = params.platform.toUpperCase() as Platform;
  const details = await fetchDetails(platform, searchParams.from, searchParams.to);
  const label = PLATFORM_LABEL[platform];

  const netProfit = details.summary?.summary?.netProfit || 0;
  const margin = details.summary?.summary?.profitMargin || 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{label} – Detaillierte Finanzauswertung</h1>
          <Link
            href="/vertriebskanaele"
            className="text-sm text-blue-600 hover:underline"
          >
            Zurück zur Übersicht
          </Link>
        </div>

        {/* KPI Row */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Bruttobetrag gesamt</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatCurrency(details.summary?.summary?.grossTotal || 0)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Nettobetrag gesamt</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatCurrency(details.summary?.summary?.netTotal || 0)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">MwSt gesamt</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatCurrency(details.summary?.summary?.vatTotal || 0)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Rechnungen</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatNumber(details.summary?.summary?.orderCount || 0)}
            </p>
          </div>
        </div>

        {/* Profit & Fees */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500 mb-1">Nettogewinn (nach Gebühren & Werbekosten)</p>
            <p className="text-xl font-semibold text-gray-800">{formatCurrency(netProfit)}</p>
            <p className="text-xs text-gray-500 mt-1">
              Marge: {margin.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Gebühren-Aufschlüsselung
            </p>
            <ul className="space-y-1 text-xs text-gray-700">
              <li>
                Plattformgebühren:{' '}
                <span className="font-medium">
                  {formatCurrency(details.feeSummary?.platformFees || 0)}
                </span>
              </li>
              <li>
                Zahlungsgebühren:{' '}
                <span className="font-medium">
                  {formatCurrency(details.feeSummary?.paymentFees || 0)}
                </span>
              </li>
              <li>
                Werbekosten:{' '}
                <span className="font-medium">
                  {formatCurrency(details.feeSummary?.adCosts || 0)}
                </span>
              </li>
              <li>
                Versandkosten:{' '}
                <span className="font-medium">
                  {formatCurrency(details.feeSummary?.shippingCosts || 0)}
                </span>
              </li>
              <li className="mt-1 pt-1 border-t">
                Gebühren gesamt:{' '}
                <span className="font-semibold">
                  {formatCurrency(details.feeSummary?.total || 0)}
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              CSV Export
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <a
                href={`/api/platform-export?platform=${platform}&kind=invoices`}
                className="rounded-md border px-3 py-2 text-center text-gray-700 hover:bg-gray-50"
              >
                Rechnungen als CSV herunterladen
              </a>
              <a
                href={`/api/platform-export?platform=${platform}&kind=fees`}
                className="rounded-md border px-3 py-2 text-center text-gray-700 hover:bg-gray-50"
              >
                Gebühren als CSV herunterladen
              </a>
            </div>
          </div>
        </div>

        {/* Monthly chart */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-800">
              Monatliche Entwicklung
            </p>
            <span className="text-xs text-gray-500">
              {new Date(details.from).toLocaleDateString('de-DE')} –{' '}
              {new Date(details.to).toLocaleDateString('de-DE')}
            </span>
          </div>
          <PlatformMonthlyChart data={details.monthly} />
        </div>
      </div>
    </main>
  );
}
