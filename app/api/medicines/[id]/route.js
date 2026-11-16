import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Medicine from '@/models/Medicine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'pharmacist', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const medicine = await Medicine.findOne({
      $or: [
        { sku: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: 'Medicine formulation not found in catalog' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        medicine,
        currency: 'PKR',
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Medicine [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching medicine formulation' },
      { status: 500 }
    );
  }
}

export async function PATCH(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'pharmacist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const existingMed = await Medicine.findOne({
      $or: [
        { sku: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!existingMed) {
      return NextResponse.json(
        { success: false, error: 'Medicine formulation not found in catalog' },
        { status: 404 }
      );
    }

    // Handle relative stock adjustment (+10, -5, etc.)
    if (body.adjustQty !== undefined) {
      const adjustVal = parseInt(body.adjustQty, 10) || 0;
      const calculatedQty = Math.max(0, existingMed.stockQuantity + adjustVal);
      existingMed.stockQuantity = calculatedQty;
    }

    // Handle absolute updates
    if (body.stockQuantity !== undefined && body.adjustQty === undefined) {
      existingMed.stockQuantity = Math.max(0, parseInt(body.stockQuantity, 10) || 0);
    }

    if (body.quantityPerPack !== undefined) {
      existingMed.quantityPerPack = Math.max(1, parseInt(body.quantityPerPack, 10) || 10);
    }

    if (body.pricePerPack !== undefined) {
      existingMed.pricePerPack = Math.max(0, parseFloat(body.pricePerPack) || 0);
      existingMed.unitPrice = Math.round((existingMed.pricePerPack / existingMed.quantityPerPack) * 100) / 100;
    } else if (body.unitPrice !== undefined) {
      existingMed.unitPrice = Math.max(0, parseFloat(body.unitPrice) || 0);
      existingMed.pricePerPack = Math.round(existingMed.unitPrice * existingMed.quantityPerPack * 100) / 100;
    }

    if (body.reorderLevel !== undefined) {
      existingMed.reorderLevel = Math.max(0, parseInt(body.reorderLevel, 10) || 0);
    }
    if (body.name) existingMed.name = body.name.trim();
    if (body.genericName !== undefined) existingMed.genericName = body.genericName.trim();
    if (body.category) existingMed.category = body.category;
    if (body.dosageForm) existingMed.dosageForm = body.dosageForm;
    if (body.strength !== undefined) existingMed.strength = body.strength.trim();
    if (body.expiryDate) existingMed.expiryDate = body.expiryDate.trim();
    if (body.manufacturer !== undefined) existingMed.manufacturer = body.manufacturer.trim();
    if (body.batchNumber !== undefined) existingMed.batchNumber = body.batchNumber.trim();
    if (body.location !== undefined) existingMed.location = body.location.trim();

    await existingMed.save();

    return NextResponse.json({
      success: true,
      message: `Formulation ${existingMed.sku} updated successfully`,
      medicine: existingMed,
    });
  } catch (error) {
    console.error('[API Medicine [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating medicine formulation' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'pharmacist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const medicine = await Medicine.findOneAndDelete({
      $or: [
        { sku: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!medicine) {
      return NextResponse.json(
        { success: false, error: 'Medicine formulation not found in catalog' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Medicine formulation "${medicine.name}" (${medicine.sku}) removed from catalog`,
      medicine,
    });
  } catch (error) {
    console.error('[API Medicine [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error deleting medicine formulation' },
      { status: 500 }
    );
  }
}
