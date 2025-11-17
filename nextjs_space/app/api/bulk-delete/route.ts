import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  // Authentifizierung prüfen
  const { session, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Keine IDs angegeben' },
        { status: 400 }
      );
    }

    // Delete invoices
    const result = await prisma.rechnung.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Rechnungen' },
      { status: 500 }
    );
  }
}
