import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import LabInvoice from '@/models/LabInvoice';
import Counter from '@/models/Counter';
import escapeRegex from '@/lib/escapeRegex';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

async function getNextLabInvoiceId() {
  return await Counter.getNextSequence('labInvoiceId', {
    prefix: 'LAB-INV-',
    padLength: 3,
    seedFloor: 701,
  });
}

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const query = {};

    if (status && status !== 'all') {
      if (status.toLowerCase() === 'paid') query.paymentStatus = 'Paid';
      else if (status.toLowerCase() === 'unpaid') query.paymentStatus = 'Unpaid';
      else if (status.toLowerCase() === 'waived') query.paymentStatus = 'Waived';
      else query.paymentStatus = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { invoiceId: searchRegex },
        { patientName: searchRegex },
        { patientId: searchRegex },
        { orderId: searchRegex },
        { paymentMethod: searchRegex },
        { 'tests.testName': searchRegex },
      ];
    }

    const [invoices, allForStats] = await Promise.all([
      LabInvoice.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      LabInvoice.find({}).select('totalAmount paymentStatus').lean(),
    ]);

    let totalRevenue = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let waivedCount = 0;

    for (const inv of allForStats) {
      if (inv.paymentStatus === 'Paid') {
        paidCount++;
        totalRevenue += inv.totalAmount || 0;
      } else if (inv.paymentStatus === 'Unpaid') {
        unpaidCount++;
      } else if (inv.paymentStatus === 'Waived') {
        waivedCount++;
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
          waivedCount,
          currency: 'PKR',
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Lab Invoices GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve lab invoices' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'lab-technician']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const body = await req.json();
    const {
      patient,
      patientId = 'WALK-IN',
      patientName,
      orderId = '',
      tests,
      discount = 0,
      paymentStatus = 'Paid',
      paymentMethod = 'Cash',
      billedBy,
      notes = '',
    } = body;

    if (!patientName || !tests || !Array.isArray(tests) || tests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Patient name and at least one diagnostic test are required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Process and validate tests & calculate PKR totals
    let calculatedSubtotal = 0;
    const processedTests = [];

    for (const item of tests) {
      const testName = (item.testName || item.name || '').trim();
      if (!testName) continue;

      const price = Math.max(0, parseFloat(item.price) || 0);
      calculatedSubtotal += price;

      processedTests.push({
        testCode: (item.testCode || item.code || '').trim().toUpperCase(),
        testName,
        category: (item.category || 'General Diagnostic').trim(),
        price,
      });
    }

    if (processedTests.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please select valid diagnostic tests with pricing' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const numericDiscount = Math.max(0, parseFloat(discount) || 0);
    const finalTotal = Math.max(0, Math.round((calculatedSubtotal - numericDiscount) * 100) / 100);
    const invoiceId = (body.invoiceId && String(body.invoiceId).trim())
      ? String(body.invoiceId).trim().toUpperCase()
      : await getNextLabInvoiceId();

    const newInvoice = await LabInvoice.create({
      invoiceId,
      patient: patient && patient.match(/^[0-9a-fA-F]{24}$/) ? patient : undefined,
      patientId: (patientId || 'WALK-IN').toUpperCase().trim(),
      patientName: patientName.trim(),
      orderId: (orderId || '').toUpperCase().trim(),
      tests: processedTests,
      subtotal: Math.round(calculatedSubtotal * 100) / 100,
      discount: numericDiscount,
      totalAmount: finalTotal,
      paymentStatus,
      paymentMethod,
      billedBy: user?.name || body.billedBy || billedBy || 'Laboratory Technologist',
      notes: notes.trim(),
      date: new Date().toISOString().split('T')[0],
    });

    return NextResponse.json(
      {
        success: true,
        message: `Laboratory invoice ${invoiceId} generated successfully`,
        invoice: newInvoice,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Lab Invoices POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create lab invoice' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

