
import { prisma } from '@/lib/db';
import { DashboardClient } from './_components/dashboard-client';

export const dynamic = "force-dynamic";

async function getKPIData() {
  const totalRechnungen = await prisma.rechnung.count();
  
  const gesamtsumme = await prisma.rechnung.aggregate({
    _sum: {
      betragBrutto: true
    }
  });
  
  const durchschnitt = await prisma.rechnung.aggregate({
    _avg: {
      betragBrutto: true
    }
  });
  
  const lieferanten = await prisma.rechnung.findMany({
    select: { lieferant: true },
    distinct: ['lieferant']
  });
  
  return {
    totalRechnungen,
    gesamtsumme: Number(gesamtsumme._sum.betragBrutto) || 0,
    durchschnitt: Number(durchschnitt._avg.betragBrutto) || 0,
    lieferantenCount: lieferanten.length
  };
}

async function getChartData() {
  const rechnungen = await prisma.rechnung.findMany({
    select: {
      datum: true,
      betragBrutto: true,
      lieferant: true,
      mwstBetrag: true
    },
    orderBy: {
      datum: 'asc'
    }
  });
  
  return rechnungen.map(r => ({
    datum: r.datum.toISOString(),
    betragBrutto: Number(r.betragBrutto),
    lieferant: r.lieferant,
    mwstBetrag: Number(r.mwstBetrag) || 0
  }));
}

async function getLetzteRechnungen() {
  const rechnungen = await prisma.rechnung.findMany({
    take: 5,
    orderBy: {
      datum: 'desc'
    }
  });
  
  return rechnungen.map(r => ({
    ...r,
    betragNetto: Number(r.betragNetto),
    betragBrutto: Number(r.betragBrutto),
    mwstBetrag: Number(r.mwstBetrag),
    datum: r.datum.toISOString(),
    verarbeitungsdatum: r.verarbeitungsdatum?.toISOString() || null
  }));
}

export default async function DashboardPage() {
  const [kpiData, chartData, letzteRechnungen] = await Promise.all([
    getKPIData(),
    getChartData(),
    getLetzteRechnungen()
  ]);

  return (
    <DashboardClient 
      kpiData={kpiData}
      chartData={chartData}
      letzteRechnungen={letzteRechnungen}
    />
  );
}
