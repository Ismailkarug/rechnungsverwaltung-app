
import { prisma } from '@/lib/db';
import { VerkaufsrechnungenClient } from './_components/verkaufsrechnungen-client';
import '../rechnungen/fix-colors.css';

export const dynamic = "force-dynamic";

async function getVerkaufsrechnungen() {
  const rechnungen = await prisma.rechnung.findMany({
    where: {
      typ: 'Ausgang'
    },
    orderBy: {
      datum: 'desc'
    }
  });
  
  return rechnungen.map(r => ({
    ...r,
    betragNetto: Number(r.betragNetto),
    betragBrutto: Number(r.betragBrutto),
    mwstBetrag: Number(r.mwstBetrag) || null,
    plattformgebuehr: r.plattformgebuehr ? Number(r.plattformgebuehr) : null,
    zahlungsgebuehr: r.zahlungsgebuehr ? Number(r.zahlungsgebuehr) : null,
    werbekosten: r.werbekosten ? Number(r.werbekosten) : null,
    versandkosten: r.versandkosten ? Number(r.versandkosten) : null,
    datum: r.datum.toISOString(),
    verarbeitungsdatum: r.verarbeitungsdatum?.toISOString() || null,
    lastValidated: r.lastValidated?.toISOString() || null
  }));
}

async function getFilters() {
  const kunden = await prisma.rechnung.findMany({
    where: { typ: 'Ausgang' },
    select: { lieferant: true },
    distinct: ['lieferant'],
    orderBy: { lieferant: 'asc' }
  });

  const statusValues = await prisma.rechnung.findMany({
    where: { typ: 'Ausgang', status: { not: null } },
    select: { status: true },
    distinct: ['status']
  });

  return {
    kunden: kunden.map(k => k.lieferant),
    statusValues: statusValues.map(s => s.status).filter(Boolean) as string[]
  };
}

export default async function VerkaufsrechnungenPage() {
  const [rechnungen, filters] = await Promise.all([
    getVerkaufsrechnungen(),
    getFilters()
  ]);

  return (
    <VerkaufsrechnungenClient 
      rechnungen={rechnungen}
      filters={filters}
    />
  );
}
