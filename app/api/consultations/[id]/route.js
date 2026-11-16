import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Consultation from '@/models/Consultation';

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'patient']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const consultation = await Consultation.findOne({
      $or: [
        { consultationId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consultation record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      consultation,
    });
  } catch (error) {
    console.error('[API Consultation [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching consultation record' },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const allowedSet = {};
    if (body.symptoms !== undefined) allowedSet.symptoms = body.symptoms;
    if (body.diagnosis !== undefined) allowedSet.diagnosis = body.diagnosis;
    if (body.vitals !== undefined) allowedSet.vitals = body.vitals;
    if (body.labs !== undefined) allowedSet.labs = body.labs;
    if (body.notes !== undefined) allowedSet.notes = body.notes;

    const updateOps = {};
    if (Object.keys(allowedSet).length > 0) {
      updateOps.$set = allowedSet;
    }

    if (body.addendum && typeof body.addendum === 'string' && body.addendum.trim()) {
      updateOps.$push = {
        addenda: {
          note: body.addendum.trim(),
          author: auth.user?.name || 'Attending Physician',
          authorId: auth.user?.id || null,
          timestamp: new Date(),
        },
      };
    }

    const consultation = await Consultation.findOneAndUpdate(
      {
        $or: [
          { consultationId: id.toUpperCase() },
          { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        ],
      },
      updateOps,
      { returnDocument: 'after', runValidators: true }
    );

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consultation record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Consultation record updated',
      consultation,
    });
  } catch (error) {
    console.error('[API Consultation [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating consultation' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const consultation = await Consultation.findOneAndDelete({
      $or: [
        { consultationId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!consultation) {
      return NextResponse.json(
        { success: false, error: 'Consultation record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Consultation ${consultation.consultationId} removed`,
    });
  } catch (error) {
    console.error('[API Consultation [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error deleting consultation' },
      { status: 500 }
    );
  }
}
