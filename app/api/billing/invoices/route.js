import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute } from '@/lib/authGuard';
import HospitalInvoice from '@/models/HospitalInvoice';
import HospitalSetting from '@/models/HospitalSetting';
import Prescription from '@/models/Prescription';
import LabOrder from '@/models/LabOrder';
import AuditLog from '@/models/AuditLog';
import { escapeRegex } from '@/lib/escapeRegex';
import mongoose from 'mongoose';

/**
 * GET /api/billing/invoices
 * Lists hospital invoices with search, department filtering, payment status filter, and pagination.
 */
export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'receptionist', 'pharmacist', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status')?.trim();
    const department = searchParams.get('department')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (search) {
      const safeRegex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { invoiceId: safeRegex },
        { patientName: safeRegex },
        { patientId: safeRegex },
        { patientPhone: safeRegex },
      ];
    }

    if (status && ['Paid', 'Unpaid', 'Waived', 'Refunded'].includes(status)) {
      query.paymentStatus = status;
    }

    if (department && department !== 'All') {
      query.$or = [
        { issuedDepartment: department },
        { 'items.department': department },
      ];
    }

    const [invoices, total] = await Promise.all([
      HospitalInvoice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HospitalInvoice.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      invoices,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('[API Hospital Invoices GET Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve hospital invoices' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/billing/invoices
 * Issues a consolidated master hospital invoice across OPD, Bed Stay, Pharmacy, and Diagnostics.
 */
export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'receptionist', 'pharmacist', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const {
      patientId,
      patientName,
      patientPhone = '',
      issuedDepartment = 'Reception',
      items = [],
      discount = 0,
      paymentMethod = 'Cash',
      paymentStatus = 'Paid',
      notes = '',
    } = body;

    if (!patientId || !patientName) {
      return NextResponse.json(
        { success: false, error: 'Patient ID and patient name are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invoice must contain at least one billable line item' },
        { status: 400 }
      );
    }

    await connectDB();
    const settings = await HospitalSetting.getSettings();

    // Verify subtotal and calculate item line totals
    let computedSubtotal = 0;
    const validatedItems = items.map((it) => {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
      const lineTotal = Number(it.totalPrice) > 0 ? Number(it.totalPrice) : qty * unitPrice;
      computedSubtotal += lineTotal;

      const title = it.itemName || it.name || 'Clinical Service';

      return {
        department: it.department || 'Reception',
        itemType: it.itemType || 'Service',
        name: title,
        itemName: title,
        quantity: qty,
        unitPrice,
        totalPrice: lineTotal,
        referenceId: it.referenceId || '',
      };
    });

    const numDiscount = Math.max(0, Number(discount) || 0);
    const netTotal = Math.max(0, computedSubtotal - numDiscount);

    // Generate atomic next sequence invoice ID (e.g. INV-1001)
    const invoiceId = await HospitalInvoice.generateNextInvoiceId();

    const cashierName = auth.user?.name || 'Authorized Cashier';

    const newInvoice = await HospitalInvoice.create({
      invoiceId,
      patientId: patientId.toUpperCase().trim(),
      patientName: patientName.trim(),
      patientPhone: patientPhone.trim(),
      billingMode: settings.billingMode || 'Centralized',
      issuedDepartment,
      items: validatedItems,
      subtotal: computedSubtotal,
      discount: numDiscount,
      tax: 0,
      totalAmount: netTotal,
      paidAmount: paymentStatus === 'Paid' ? netTotal : 0,
      paymentMethod,
      paymentStatus,
      paidAt: paymentStatus === 'Paid' ? new Date() : null,
      collectedBy: cashierName,
      cashierRole: auth.user?.role || 'receptionist',
      notes: notes.trim(),
    });

    // If paid, settle referenced prescriptions and lab orders
    if (paymentStatus === 'Paid') {
      const rxRefIds = validatedItems
        .filter((it) => it.department === 'Pharmacy' || it.itemType === 'Medication')
        .map((it) => it.referenceId)
        .filter(Boolean);

      if (rxRefIds.length > 0) {
        for (const refId of rxRefIds) {
          if (mongoose.Types.ObjectId.isValid(refId)) {
            await Prescription.findByIdAndUpdate(refId, {
              paymentStatus: 'Paid',
              status: 'Dispensed',
            });
          } else {
            await Prescription.updateMany(
              { consultationId: refId },
              { paymentStatus: 'Paid', status: 'Dispensed' }
            );
          }
        }
      }

      const labRefIds = validatedItems
        .filter((it) => it.department === 'Laboratory' || it.itemType === 'Diagnostic Test')
        .map((it) => it.referenceId)
        .filter(Boolean);

      if (labRefIds.length > 0) {
        await LabOrder.updateMany(
          { orderId: { $in: labRefIds } },
          { status: 'In Progress' }
        );
      }
    }

    // Record audit log
    await AuditLog.create({
      action: 'HOSPITAL_INVOICE_ISSUED',
      performedBy: auth.user?.id || 'SYSTEM',
      performedByName: cashierName,
      performedByRole: auth.user?.role || 'receptionist',
      targetModel: 'HospitalInvoice',
      targetId: newInvoice._id.toString(),
      details: {
        invoiceId,
        patientId,
        totalAmount: netTotal,
        paymentStatus,
        paymentMethod,
        itemCount: validatedItems.length,
      },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    return NextResponse.json({
      success: true,
      message: `Consolidated hospital invoice ${invoiceId} generated successfully`,
      invoice: newInvoice,
    }, { status: 201 });
  } catch (error) {
    console.error('[API Hospital Invoices POST Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create hospital invoice' },
      { status: 500 }
    );
  }
}
