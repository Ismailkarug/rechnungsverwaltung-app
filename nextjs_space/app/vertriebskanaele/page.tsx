
import { Platform } from '@prisma/client';
import Link from 'next/link';
import { Sidebar } from '@/components/sidebar';
import { getPlatformSummary, PlatformSummary } from '@/src/services/reports_platformSummary';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

  // Use the new summary structure with safe fallbacks
  const netProfit = summary.summary?.netProfit ?? 0;
  const margin = summary.summary?.profitMargin ?? 0;
  const orderCount = summary.summary?.orderCount ?? 0;
  const grossTotal = summary.summary?.grossTotal ?? 0;
  const netTotal = summary.summary?.netTotal ?? 0;
  const vatTotal = summary.summary?.vatTotal ?? 0;

  return (
    <Link
      href={`/vertriebskanaele/${summary.platform.toLowerCase()}`}
      className="rounded-2xl border p-6 shadow-sm bg-white dark:bg-gray-800 flex flex-col gap-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{label} Finanzen</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {summary.from.toLocaleDateString('de-DE')} –{' '}
          {summary.to.toLocaleDateString('de-DE')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Rechnungen gesamt</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {formatNumber(orderCount)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Bruttobetrag gesamt</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {formatCurrency(grossTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Nettobetrag gesamt</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {formatCurrency(netTotal)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">MwSt gesamt</p>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {formatCurrency(vatTotal)}
          </p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-4 border-t pt-4 dark:border-gray-700">
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Verkäufe (Ausgang)</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Anzahl: {formatNumber(summary.breakdown?.outgoing?.count ?? 0)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Netto: {formatCurrency(summary.breakdown?.outgoing?.netTotal ?? 0)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Brutto: {formatCurrency(summary.breakdown?.outgoing?.grossTotal ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Ausgaben (Eingang)</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Anzahl: {formatNumber(summary.breakdown?.incoming?.count ?? 0)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Netto: {formatCurrency(summary.breakdown?.incoming?.netTotal ?? 0)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Brutto: {formatCurrency(summary.breakdown?.incoming?.grossTotal ?? 0)}
          </p>
        </div>
      </div>

      <div className="mt-2 border-t pt-4 flex items-center justify-between dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Nettogewinn</p>
          <p className={`text-lg font-semibold ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(netProfit)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Marge</p>
          <p className={`text-lg font-semibold ${margin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {margin.toFixed(1)}%
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border p-12 shadow-sm bg-white dark:bg-gray-800 text-center">
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Keine Plattformdaten verfügbar
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Es wurden noch keine Rechnungen mit Plattform-Zuordnung gefunden.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Laden Sie Rechnungen hoch und weisen Sie ihnen eine Plattform (eBay, Amazon, Shopify) zu,
          um hier detaillierte Finanzauswertungen zu sehen.
        </p>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="rounded-2xl border border-red-200 p-12 shadow-sm bg-red-50 dark:bg-red-900/20 text-center">
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Fehler beim Laden der Daten
        </h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">
          {error}
        </p>
        <p className="text-xs text-red-500 dark:text-red-400">
          Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.
        </p>
      </div>
    </div>
  );
}

export default async function VertriebskanaelePage() {
  try {
    // Default date range: last 12 months
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 12);

    // Fetch summaries for all platforms
    const platforms: Platform[] = ['EBAY', 'AMAZON', 'SHOPIFY'];
    const summaries = await Promise.all(
      platforms.map(async (platform) => {
        try {
          return await getPlatformSummary(platform, from, to);
        } catch (error) {
          console.error(`Error fetching summary for ${platform}:`, error);
          return null;
        }
      })
    );

    const relevant = summaries.filter((s): s is PlatformSummary => s !== null);

    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 bg-slate-50 dark:bg-gray-900">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
              Vertriebskanäle Finanzübersicht
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Detaillierte Finanzauswertung für eBay, Amazon und Shopify inkl. Gebühren und Werbekosten
            </p>

            {relevant.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {relevant.map((summary) => (
                  <PlatformCard key={summary.platform} summary={summary} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('Error in VertriebskanaelePage:', error);
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 bg-slate-50 dark:bg-gray-900">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
              Vertriebskanäle Finanzübersicht
            </h1>
            <ErrorState error="Fehler beim Laden der Plattformdaten. Bitte versuchen Sie es erneut." />
          </div>
        </main>
      </div>
    );
  }
}
