import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import PharmacyInvoice from '@/models/PharmacyInvoice';
import Medicine from '@/models/Medicine';
import Prescription from '@/models/Prescription';

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

async function getNextPharmacyInvoiceId() {
  const records = await PharmacyInvoice.find({ invoiceId: /^PH-INV-\d+$/ }).select('invoiceId').lean();
  let maxNum = 500;
  for (const r of records) {
    const match = r.invoiceId.match(/^PH-INV-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }
  return `PH-INV-${maxNum + 1}`;
}

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'pharmacist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const query = {};

    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { invoiceId: searchRegex },
        { patientName: searchRegex },
        { patientId: searchRegex },
        { prescriptionId: searchRegex },
        { paymentMethod: searchRegex },
      ];
    }

    const [invoices, allForStats] = await Promise.all([
      PharmacyInvoice.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      PharmacyInvoice.find({}).select('totalAmount paymentStatus').lean(),
    ]);

    let totalRevenue = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    for (const inv of allForStats) {
      if (inv.paymentStatus === 'Paid') {
        paidCount++;
        totalRevenue += inv.totalAmount || 0;
      } else if (inv.paymentStatus === 'Unpaid') {
        unpaidCount++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        count: invoices.length,
        currency: 'PKR',
        invoices,
        summary: {
          totalInvoices: allForStats.length,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          paidCount,
          unpaidCount,
          currency: 'PKR',
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Pharmacy Invoices GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve pharmacy invoices' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'pharmacist']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const body = await req.json();
    const {
      patient,
      patientId,
      patientName,
      prescriptionId,
      items,
      discount = 0,
      paymentStatus = 'Paid',
      paymentMethod = 'Cash',
      notes = '',
    } = body;

    if (!patientName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Patient name and at least one medicine item are required' },
        { status: 400 }
      );
    }

    // Check if prescription was already dispensed to avoid double stock deduction
    let alreadyDeducted = false;
    if (prescriptionId) {
      const linkedRx = await Prescription.findOne({
        prescriptionId: prescriptionId.toUpperCase().trim(),
      }).lean();
      if (linkedRx && linkedRx.status === 'Dispensed') {
        alreadyDeducted = true;
      }
    }

    // Process and validate items & calculate totals
    let calculatedSubtotal = 0;
    const processedItems = [];

    for (const item of items) {
      const name = (item.name || '').trim();
      if (!name) continue;

      const qtyUnits = Math.max(1, parseInt(item.qtyUnits || item.qty, 10) || 1);
      const packs = Math.max(0, parseFloat(item.packs) || 0);
      const pricePerPack = Math.max(0, parseFloat(item.pricePerPack) || 0);
      const unitPrice = Math.max(0, parseFloat(item.unitPrice || item.price) || 0);

      // Calculate line total: if billed by pack, packs * pricePerPack; otherwise qtyUnits * unitPrice
      let lineTotal = 0;
      if (item.billingType === 'Pack' && packs > 0 && pricePerPack > 0) {
        lineTotal = Math.round(packs * pricePerPack * 100) / 100;
      } else {
        lineTotal = Math.round(qtyUnits * unitPrice * 100) / 100;
      }

      calculatedSubtotal += lineTotal;

      processedItems.push({
        sku: (item.sku || '').trim().toUpperCase(),
        name,
        qtyUnits,
        packs,
        pricePerPack,
        unitPrice,
        totalPrice: lineTotal,
        billingType: item.billingType || 'Pack',
      });

      // Deduct inventory stock for each billed item atomically
      if (!alreadyDeducted) {
        const nameRegex = new RegExp(`^${escapeRegex(name)}$`, 'i');
        let med = await Medicine.findOne({
          $or: [{ name: nameRegex }, { genericName: nameRegex }],
        });

        if (!med) {
          const firstWord = name.split(' ')[0];
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
          const updated = await Medicine.findOneAndUpdate(
            { _id: med._id, stockQuantity: { $gte: qtyUnits } },
            { $inc: { stockQuantity: -qtyUnits } }
          );
          if (!updated) {
            await Medicine.findByIdAndUpdate(med._id, { $set: { stockQuantity: 0 } });
          }
        }
      }
    }

    const discountAmount = Math.max(0, parseFloat(discount) || 0);
    const finalTotal = Math.max(0, calculatedSubtotal - discountAmount);

    const invoiceId = (body.invoiceId && String(body.invoiceId).trim())
      ? String(body.invoiceId).trim().toUpperCase()
      : await getNextPharmacyInvoiceId();

    const invoice = await PharmacyInvoice.create({
      invoiceId,
      patient: patient || null,
      patientId: patientId ? patientId.trim() : 'WALK-IN',
      patientName: patientName.trim(),
      prescriptionId: prescriptionId ? prescriptionId.trim().toUpperCase() : '',
      items: processedItems,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      discount: discountAmount,
      totalAmount: Math.round(finalTotal * 100) / 100,
      paymentStatus: paymentStatus || 'Paid',
      paymentMethod: paymentMethod || 'Cash',
      dispensedBy: user?.name || body.dispensedBy || 'Clinical Pharmacist',
      notes: notes ? notes.trim() : '',
    });

    return NextResponse.json(
      {
        success: true,
        message: `Pharmacy invoice ${invoice.invoiceId} compiled successfully in PKR`,
        invoice,
        currency: 'PKR',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Pharmacy Invoices POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create pharmacy invoice' },
      { status: 500 }
    );
  }
}

