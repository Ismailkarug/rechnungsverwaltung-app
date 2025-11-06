import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, updates } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Keine IDs angegeben' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Keine Updates angegeben' },
        { status: 400 }
      );
    }

    // Build update data object (only allow specific fields)
    const updateData: any = {};
    
    if (updates.status !== undefined) {
      updateData.status = updates.status;
    }
    
    if (updates.mwstSatz !== undefined) {
      updateData.mwstSatz = updates.mwstSatz;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Keine gültigen Updates angegeben' },
        { status: 400 }
      );
    }

    // Update invoices
    const result = await prisma.rechnung.updateMany({
      where: {
        id: {
          in: ids
        }
      },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Rechnungen' },
      { status: 500 }
    );
  }
}
