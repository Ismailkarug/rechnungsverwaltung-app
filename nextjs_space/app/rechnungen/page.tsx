
import { prisma } from '@/lib/db';
import { RechnungenClient } from './_components/rechnungen-client';

export const dynamic = "force-dynamic";

async function getAllRechnungen() {
  const rechnungen = await prisma.rechnung.findMany({
    orderBy: {
      datum: 'desc'
    }
  });
  
  return rechnungen.map(r => ({
    ...r,
    betragNetto: Number(r.betragNetto),
    betragBrutto: Number(r.betragBrutto),
    mwstBetrag: Number(r.mwstBetrag) || null,
    datum: r.datum.toISOString(),
    verarbeitungsdatum: r.verarbeitungsdatum?.toISOString() || null
  }));
}

async function getFilters() {
  const lieferanten = await prisma.rechnung.findMany({
    select: { lieferant: true },
    distinct: ['lieferant'],
    orderBy: { lieferant: 'asc' }
  });

  const statusValues = await prisma.rechnung.findMany({
    select: { status: true },
    distinct: ['status'],
    where: { status: { not: null } }
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
