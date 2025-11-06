
import { prisma } from '@/lib/db';
import { StatistikenClient } from './_components/statistiken-client';

export const dynamic = "force-dynamic";

async function getStatisticData() {
  const rechnungen = await prisma.rechnung.findMany({
    select: {
      datum: true,
      betragBrutto: true,
      betragNetto: true,
      mwstBetrag: true,
      lieferant: true,
      mwstSatz: true
    },
    orderBy: {
      datum: 'asc'
    }
  });

  // Verarbeite Daten für verschiedene Statistiken
  const processedData = rechnungen.map(r => ({
    datum: r.datum,
    betragBrutto: Number(r.betragBrutto),
    betragNetto: Number(r.betragNetto),
    mwstBetrag: Number(r.mwstBetrag) || 0,
    lieferant: r.lieferant,
    mwstSatz: r.mwstSatz,
    monat: r.datum.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
    monatKurz: r.datum.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
    quartal: `Q${Math.ceil((r.datum.getMonth() + 1) / 3)} ${r.datum.getFullYear()}`,
    jahr: r.datum.getFullYear().toString()
  }));

  return processedData;
}

export default async function StatistikenPage() {
  const statisticData = await getStatisticData();

  return (
    <StatistikenClient data={statisticData} />
  );
}
