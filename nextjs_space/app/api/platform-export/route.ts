
import { NextRequest, NextResponse } from 'next/server';
import { Platform } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 12);
  return { from, to };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(';') || str.includes('\n') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const platformParam = searchParams.get('platform') as Platform | null;
  const kind = searchParams.get('kind') || 'invoices'; // 'invoices' | 'fees'
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  if (!platformParam) {
    return new NextResponse('platform query parameter required', { status: 400 });
  }

  const { from: defFrom, to: defTo } = getDefaultRange();
  const from = fromParam ? new Date(fromParam) : defFrom;
  const to = toParam ? new Date(toParam) : defTo;

  if (kind === 'fees') {
    const fees = await prisma.platformFee.findMany({
      where: {
        plattform: platformParam,
        rechnung: {
          datum: { gte: from, lte: to },
        },
      },
      include: { rechnung: true },
    });

    const header = [
      'Rechnungsnummer',
      'Datum',
      'Lieferant',
      'Gebührentyp',
      'Betrag',
    ];

    const rows = fees.map((f) => [
      f.rechnung.rechnungsnummer,
      f.rechnung.datum.toISOString().slice(0, 10),
      f.rechnung.lieferant,
      f.typ,
      Number(f.betrag).toFixed(2),
    ]);

    const csvLines = [header, ...rows].map((r) => r.map(csvEscape).join(';'));
    const body = csvLines.join('\n');

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${platformParam}_fees.csv"`,
      },
    });
  }

  // default: invoices
  const invoices = await prisma.rechnung.findMany({
    where: {
      plattform: platformParam,
      datum: { gte: from, lte: to },
    },
  });

  const header = [
    'Rechnungsnummer',
    'Datum',
    'Lieferant',
    'Typ',
    'Nettobetrag',
    'MwSt-Betrag',
    'Bruttobetrag',
  ];

  const rows = invoices.map((inv) => [
    inv.rechnungsnummer,
    inv.datum.toISOString().slice(0, 10),
    inv.lieferant,
    inv.typ,
    Number(inv.betragNetto).toFixed(2),
    Number(inv.mwstBetrag || 0).toFixed(2),
    Number(inv.betragBrutto).toFixed(2),
  ]);

  const csvLines = [header, ...rows].map((r) => r.map(csvEscape).join(';'));
  const body = csvLines.join('\n');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${platformParam}_invoices.csv"`,
    },
  });
}
