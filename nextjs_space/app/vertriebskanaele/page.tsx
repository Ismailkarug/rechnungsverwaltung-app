
import { Platform } from '@prisma/client';
import { PlatformSummaryResponse, PlatformSummary } from '@/src/types/platformSummary';
import Link from 'next/link';

async function fetchPlatformSummaries(): Promise<PlatformSummaryResponse> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/platform-summary`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error('Failed to fetch platform summaries');
  return res.json();
}

const PLATFORM_LABEL: Record<Platform, string> = {
  EBAY: 'eBay',
  AMAZON: 'Amazon',
  SHOPIFY: 'Shopify',
  OTHER: 'Sonstige',
  NONE: 'Nicht zugeordnet',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('de-DE').format(value);
}

function PlatformCard({ summary }: { summary: PlatformSummary }) {
  const label = PLATFORM_LABEL[summary.platform];

  // Use the new summary structure
  const netProfit = summary.summary?.netProfit || 0;
  const margin = summary.summary?.profitMargin || 0;

  return (
    <Link
      href={`/vertriebskanaele/${summary.platform.toLowerCase()}`}
      className="rounded-2xl border p-6 shadow-sm bg-white flex flex-col gap-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">{label} Finanzen</h2>
        <span className="text-xs text-gray-500">
          {new Date(summary.from).toLocaleDateString('de-DE')} –{' '}
          {new Date(summary.to).toLocaleDateString('de-DE')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Rechnungen gesamt</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatNumber(summary.summary?.orderCount || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Bruttobetrag gesamt</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatCurrency(summary.summary?.grossTotal || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Nettobetrag gesamt</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatCurrency(summary.summary?.netTotal || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">MwSt gesamt</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatCurrency(summary.summary?.vatTotal || 0)}
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 border-t pt-4">
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1">Verkäufe (Ausgang)</p>
          <p className="text-xs text-gray-600">
            Anzahl: {formatNumber(summary.breakdown?.outgoing?.count || 0)}
          </p>
          <p className="text-xs text-gray-600">
            Netto: {formatCurrency(summary.breakdown?.outgoing?.netTotal || 0)}
          </p>
          <p className="text-xs text-gray-600">
            Brutto: {formatCurrency(summary.breakdown?.outgoing?.grossTotal || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1">Ausgaben (Eingang)</p>
          <p className="text-xs text-gray-600">
            Anzahl: {formatNumber(summary.breakdown?.incoming?.count || 0)}
          </p>
          <p className="text-xs text-gray-600">
            Netto: {formatCurrency(summary.breakdown?.incoming?.netTotal || 0)}
          </p>
          <p className="text-xs text-gray-600">
            Brutto: {formatCurrency(summary.breakdown?.incoming?.grossTotal || 0)}
          </p>
        </div>
      </div>

      <div className="mt-2 border-t pt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Nettogewinn</p>
          <p className="text-lg font-semibold text-gray-800">{formatCurrency(netProfit)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Marge</p>
          <p className="text-lg font-semibold text-gray-800">{margin.toFixed(1)}%</p>
        </div>
      </div>
    </Link>
  );
}

export default async function VertriebskanaelePage() {
  const data = await fetchPlatformSummaries();

  const relevant = data.summaries.filter((s) =>
    ['EBAY', 'AMAZON', 'SHOPIFY'].includes(s.platform)
  ) as PlatformSummary[];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">Vertriebskanäle Finanzübersicht</h1>
        <p className="text-sm text-gray-600 mb-6">
          Detaillierte Finanzauswertung für eBay, Amazon und Shopify inkl. Gebühren und Werbekosten
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {relevant.map((summary) => (
            <PlatformCard key={summary.platform} summary={summary} />
          ))}
        </div>
      </div>
    </main>
  );
}
