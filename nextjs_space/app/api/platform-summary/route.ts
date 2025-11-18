
import { NextRequest, NextResponse } from 'next/server';
import { Platform } from '@prisma/client';
import { getPlatformSummary } from '@/src/services/reports_platformSummary';

function getDefaultRange() {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 12);
  return { from, to };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');
    const platformParam = searchParams.get('platform');

    const { from: defFrom, to: defTo } = getDefaultRange();
    const from = fromParam ? new Date(fromParam) : defFrom;
    const to = toParam ? new Date(toParam) : defTo;

    // If a specific platform is requested, return only that platform's data
    if (platformParam) {
      const platform = platformParam.toUpperCase() as Platform;
      const summary = await getPlatformSummary(platform, from, to);
      
      return NextResponse.json({
        platform: summary.platform,
        dateRange: {
          from: summary.from.toISOString(),
          to: summary.to.toISOString(),
        },
        summary: summary.summary,
        breakdown: summary.breakdown,
        monthlyData: summary.monthlyData,
      });
    }

    // Otherwise, return all platforms
    const platforms: Platform[] = ['EBAY', 'AMAZON', 'SHOPIFY'];

    const summaries = await Promise.all(
      platforms.map((platform) => getPlatformSummary(platform, from, to))
    );

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      summaries: summaries.map((s) => ({
        ...s,
        from: s.from.toISOString(),
        to: s.to.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error in /api/platform-summary', error);
    return NextResponse.json(
      { error: 'Failed to load platform summaries' },
      { status: 500 }
    );
  }
}
