
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

  const netProfit =
    details.summary.outgoing.netTotal -
    details.summary.outgoing.vatTotal -
    details.summary.incoming.netTotal -
    details.feeSummary.totalFees -
    details.feeSummary.adCostsTotal;

  const margin =
    details.summary.outgoing.netTotal > 0
      ? (netProfit / details.summary.outgoing.netTotal) * 100
      : 0;

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
              {formatCurrency(details.summary.grossTotal)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Nettobetrag gesamt</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatCurrency(details.summary.netTotal)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">MwSt gesamt</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatCurrency(details.summary.vatTotal)}
            </p>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <p className="text-xs text-gray-500">Rechnungen</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatNumber(details.summary.invoiceCount)}
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
                  {formatCurrency(details.feeSummary.platformFees)}
                </span>
              </li>
              <li>
                Zahlungsgebühren:{' '}
                <span className="font-medium">
                  {formatCurrency(details.feeSummary.paymentFees)}
                </span>
              </li>
              <li>
                Werbegebühren (pro Bestellung):{' '}
                <span className="font-medium">
                  {formatCurrency(details.feeSummary.adFees)}
                </span>
              </li>
              <li>
                Versandkosten:{' '}
                <span className="font-medium">
                  {formatCurrency(details.feeSummary.shippingCosts)}
                </span>
              </li>
              <li>
                Sonstige Gebühren:{' '}
                <span className="font-medium">
                  {formatCurrency(details.feeSummary.otherFees)}
                </span>
              </li>
              <li className="mt-1 pt-1 border-t">
                Gebühren gesamt:{' '}
                <span className="font-semibold">
                  {formatCurrency(details.feeSummary.totalFees)}
                </span>
              </li>
              <li>
                Werbekosten (Kampagnen):{' '}
                <span className="font-semibold">
                  {formatCurrency(details.feeSummary.adCostsTotal)}
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
