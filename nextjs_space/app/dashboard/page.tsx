
import { prisma } from '@/lib/db';
import { DashboardClient } from './_components/dashboard-client';

export const dynamic = "force-dynamic";

async function getKPIData() {
  const whereClause = { betragBrutto: { gt: 0 } };
  
  // Eingangsrechnungen (Ausgaben)
  const eingangWhereClause = { ...whereClause, typ: 'Eingang' };
  const eingangTotal = await prisma.rechnung.count({ where: eingangWhereClause });
  const eingangSumme = await prisma.rechnung.aggregate({
    where: eingangWhereClause,
    _sum: { betragBrutto: true, betragNetto: true, mwstBetrag: true }
  });
  const eingangDurchschnitt = await prisma.rechnung.aggregate({
    where: eingangWhereClause,
    _avg: { betragBrutto: true }
  });
  
  // Ausgangsrechnungen (Umsätze)
  const ausgangWhereClause = { ...whereClause, typ: 'Ausgang' };
  const ausgangTotal = await prisma.rechnung.count({ where: ausgangWhereClause });
  const ausgangSumme = await prisma.rechnung.aggregate({
    where: ausgangWhereClause,
    _sum: { betragBrutto: true, betragNetto: true, mwstBetrag: true }
  });
  const ausgangDurchschnitt = await prisma.rechnung.aggregate({
    where: ausgangWhereClause,
    _avg: { betragBrutto: true }
  });
  
  // Lieferanten (nur Eingang)
  const lieferanten = await prisma.rechnung.findMany({
    where: eingangWhereClause,
    select: { lieferant: true },
    distinct: ['lieferant']
  });
  
  // Kunden (nur Ausgang)
  const kunden = await prisma.rechnung.findMany({
    where: ausgangWhereClause,
    select: { lieferant: true },
    distinct: ['lieferant']
  });
  
  return {
    eingang: {
      totalRechnungen: eingangTotal,
      gesamtsummeBrutto: Number(eingangSumme._sum.betragBrutto) || 0,
      gesamtsummeNetto: Number(eingangSumme._sum.betragNetto) || 0,
      gesamtsummeMwst: Number(eingangSumme._sum.mwstBetrag) || 0,
      durchschnitt: Number(eingangDurchschnitt._avg.betragBrutto) || 0,
      lieferantenCount: lieferanten.length
    },
    ausgang: {
      totalRechnungen: ausgangTotal,
      gesamtsummeBrutto: Number(ausgangSumme._sum.betragBrutto) || 0,
      gesamtsummeNetto: Number(ausgangSumme._sum.betragNetto) || 0,
      gesamtsummeMwst: Number(ausgangSumme._sum.mwstBetrag) || 0,
      durchschnitt: Number(ausgangDurchschnitt._avg.betragBrutto) || 0,
      kundenCount: kunden.length
    }
  };
}

async function getChartData() {
  const rechnungen = await prisma.rechnung.findMany({
    where: {
      betragBrutto: { gt: 0 }
    },
    select: {
      datum: true,
      betragBrutto: true,
      betragNetto: true,
      lieferant: true,
      mwstBetrag: true,
      typ: true
    },
    orderBy: {
      datum: 'asc'
    }
  });
  
  return rechnungen.map(r => ({
    datum: r.datum.toISOString(),
    betragBrutto: Number(r.betragBrutto),
    betragNetto: Number(r.betragNetto),
    lieferant: r.lieferant,
    mwstBetrag: Number(r.mwstBetrag) || 0,
    typ: r.typ || 'Eingang'
  }));
}

async function getLetzteRechnungen() {
  const rechnungen = await prisma.rechnung.findMany({
    where: {
      betragBrutto: { gt: 0 }
    },
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
    plattformgebuehr: r.plattformgebuehr ? Number(r.plattformgebuehr) : null,
    zahlungsgebuehr: r.zahlungsgebuehr ? Number(r.zahlungsgebuehr) : null,
    werbekosten: r.werbekosten ? Number(r.werbekosten) : null,
    versandkosten: r.versandkosten ? Number(r.versandkosten) : null,
    datum: r.datum.toISOString(),
    verarbeitungsdatum: r.verarbeitungsdatum?.toISOString() || null,
    typ: r.typ || 'Eingang'
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
