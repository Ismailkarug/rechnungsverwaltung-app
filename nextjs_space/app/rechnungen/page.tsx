
import { prisma } from '@/lib/db';
import { RechnungenClient } from './_components/rechnungen-client';
import './fix-colors.css';

export const dynamic = "force-dynamic";

async function getAllRechnungen() {
  const rechnungen = await prisma.rechnung.findMany({
    where: {
      typ: 'Eingang'
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
    verarbeitungsdatum: r.verarbeitungsdatum?.toISOString() || null
  }));
}

async function getFilters() {
  const lieferanten = await prisma.rechnung.findMany({
    where: { typ: 'Eingang' },
    select: { lieferant: true },
    distinct: ['lieferant'],
    orderBy: { lieferant: 'asc' }
  });

  const statusValues = await prisma.rechnung.findMany({
    where: { typ: 'Eingang', status: { not: null } },
    select: { status: true },
    distinct: ['status']
  });

  return {
    lieferanten: lieferanten.map(l => l.lieferant),
    statusValues: statusValues.map(s => s.status).filter(Boolean) as string[]
  };
}

export default async function RechnungenPage() {
  const [rechnungen, filters] = await Promise.all([
    getAllRechnungen(),
    getFilters()
  ]);

  return (
    <RechnungenClient 
      rechnungen={rechnungen}
      filters={filters}
    />
  );
}
