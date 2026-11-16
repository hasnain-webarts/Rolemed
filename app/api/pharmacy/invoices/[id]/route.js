import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import PharmacyInvoice from '@/models/PharmacyInvoice';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req, { params }) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'pharmacist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { id } = await params;

    const invoice = await PharmacyInvoice.findOne({
      $or: [
        { invoiceId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    }).lean();

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Pharmacy invoice record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        invoice,
        currency: 'PKR',
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Pharmacy Invoice [id] GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching pharmacy invoice' },
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

    const existingInvoice = await PharmacyInvoice.findOne({
      $or: [
        { invoiceId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { success: false, error: 'Pharmacy invoice record not found' },
        { status: 404 }
      );
    }

    if (body.paymentStatus) {
      existingInvoice.paymentStatus = body.paymentStatus;
    }
    if (body.paymentMethod) {
      existingInvoice.paymentMethod = body.paymentMethod;
    }
    if (body.notes !== undefined) {
      existingInvoice.notes = body.notes.trim();
    }

    await existingInvoice.save();

    return NextResponse.json({
      success: true,
      message: `Invoice ${existingInvoice.invoiceId} updated successfully`,
      invoice: existingInvoice,
      currency: 'PKR',
    });
  } catch (error) {
    console.error('[API Pharmacy Invoice [id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error updating pharmacy invoice' },
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

    const invoice = await PharmacyInvoice.findOneAndDelete({
      $or: [
        { invoiceId: id.toUpperCase() },
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
      ],
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'Pharmacy invoice record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Pharmacy invoice ${invoice.invoiceId} voided/removed`,
    });
  } catch (error) {
    console.error('[API Pharmacy Invoice [id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error voiding pharmacy invoice' },
      { status: 500 }
    );
  }
}

