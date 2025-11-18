
import { NextRequest, NextResponse } from 'next/server';
import { Platform } from '@prisma/client';
import { getPlatformSummary } from '@/src/services/reports_platformSummary';
import { getPlatformDetails } from '@/src/services/reports_platformDetails';

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 12);
  return { from, to };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const platformParam = searchParams.get('platform') as Platform | null;
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    if (!platformParam) {
      return NextResponse.json(
        { error: 'platform query parameter is required (EBAY|AMAZON|SHOPIFY)' },
        { status: 400 }
      );
    }

    const { from: defFrom, to: defTo } = getDefaultRange();
    const from = fromParam ? new Date(fromParam) : defFrom;
    const to = toParam ? new Date(toParam) : defTo;

    const summary = await getPlatformSummary(platformParam, from, to);
    const details = await getPlatformDetails(platformParam, from, to, summary);

    return NextResponse.json({
      ...details,
      from: details.from.toISOString(),
      to: details.to.toISOString(),
      summary: {
        ...details.summary,
        from: details.summary.from.toISOString(),
        to: details.summary.to.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in /api/platform-details', error);
    return NextResponse.json(
      { error: 'Failed to load platform details' },
      { status: 500 }
    );
  }
}
