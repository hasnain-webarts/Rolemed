import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Prescription from '@/models/Prescription';
import Medicine from '@/models/Medicine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'pharmacist', 'patient']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const prescription = await Prescription.findOne({
      $or: [
        { prescriptionId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: 'Prescription record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        prescription,
        currency: 'PKR',
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Prescription [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching prescription' },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'pharmacist']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const existingRx = await Prescription.findOne({
      $or: [
        { prescriptionId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!existingRx) {
      return NextResponse.json(
        { success: false, error: 'Prescription record not found' },
        { status: 404 }
      );
    }

    const updateData = { ...body };
    const isNowDispensed = body.status === 'Dispensed' && existingRx.status !== 'Dispensed';

    if (body.drugs && Array.isArray(body.drugs)) {
      updateData.drugs = body.drugs;
    }

    if (isNowDispensed) {
      updateData.dispensedAt = new Date();
      updateData.dispensedBy = user?.name || body.dispensedBy || 'Clinical Pharmacist';
      updateData.paymentStatus = body.paymentStatus || 'Paid';
      updateData.paymentMethod = body.paymentMethod || 'Cash';

      // Deduct inventory stock for all drugs atomically
      const drugsToDispense = body.drugs || existingRx.drugs || [];
      for (const drug of drugsToDispense) {
        if (!drug || !drug.name) continue;
        const qtyNeeded = Math.max(1, parseInt(drug.qtyNeeded || drug.quantity, 10) || 1);
        const trimmedName = drug.name.trim();
        const nameRegex = new RegExp(`^${escapeRegex(trimmedName)}$`, 'i');

        // Look up by exact name, generic name, or prefix
        let med = await Medicine.findOne({
          $or: [{ name: nameRegex }, { genericName: nameRegex }],
        });

        if (!med) {
          const firstWord = trimmedName.split(' ')[0];
          if (firstWord && firstWord.length >= 3) {
            med = await Medicine.findOne({
              $or: [
                { name: new RegExp(escapeRegex(firstWord), 'i') },
                { genericName: new RegExp(escapeRegex(firstWord), 'i') },
              ],
            });
          }
        }

        if (med) {
          // Atomic stock decrement with negative inventory protection
          const updated = await Medicine.findOneAndUpdate(
            { _id: med._id, stockQuantity: { $gte: qtyNeeded } },
            { $inc: { stockQuantity: -qtyNeeded } },
            { new: true }
          );
          if (!updated) {
            await Medicine.findByIdAndUpdate(med._id, { $set: { stockQuantity: 0 } });
          }
        }
      }
    }

    const prescription = await Prescription.findByIdAndUpdate(
      existingRx._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: isNowDispensed
        ? 'Prescription dispensed, payment recorded, and inventory stock updated in PKR'
        : 'Prescription updated successfully',
      prescription,
      currency: 'PKR',
    });
  } catch (error) {
    console.error('[API Prescription [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating prescription' },
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

    const prescription = await Prescription.findOneAndDelete({
      $or: [
        { prescriptionId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!prescription) {
      return NextResponse.json(
        { success: false, error: 'Prescription record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Prescription ${prescription.prescriptionId} cancelled/removed`,
    });
  } catch (error) {
    console.error('[API Prescription [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error deleting prescription' },
      { status: 500 }
    );
  }
}
