import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import LabOrder from '@/models/LabOrder';
import Patient from '@/models/Patient';

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

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'lab-technician', 'patient']);
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const patientId = searchParams.get('patientId') || '';
    const priority = searchParams.get('priority') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const query = {};

    // Scoping for patient role
    if (user.role === 'patient') {
      query.patientId = user.patientId || 'NONE';
    }

    if (status && status.toLowerCase() !== 'all') {
      // Capitalize first letter to match Enum: 'Pending', 'In Progress', 'Completed', 'Cancelled'
      if (status.toLowerCase() === 'pending') query.status = 'Pending';
      else if (status.toLowerCase() === 'in progress' || status.toLowerCase() === 'inprogress') query.status = 'In Progress';
      else if (status.toLowerCase() === 'completed') query.status = 'Completed';
      else if (status.toLowerCase() === 'cancelled') query.status = 'Cancelled';
      else query.status = status;
    }

    if (patientId) {
      query.patientId = patientId.toUpperCase();
    }

    if (priority && priority.toLowerCase() !== 'all') {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { patientName: searchRegex },
        { orderId: searchRegex },
        { testName: searchRegex },
        { findings: searchRegex },
        { patientId: searchRegex },
        { doctorName: searchRegex },
      ];
    }

    const [labOrders, allForCounts] = await Promise.all([
      LabOrder.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      LabOrder.find({}).select('status priority criticalAlert').lean(),
    ]);

    let pendingCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let criticalCount = 0;
    let rejectedCount = 0;

    for (const order of allForCounts) {
      if (order.status === 'Pending') pendingCount++;
      else if (order.status === 'In Progress') inProgressCount++;
      else if (order.status === 'Completed') completedCount++;
      else if (order.status === 'Specimen Rejected' || order.status === 'Recollection Requested') rejectedCount++;

      if (order.criticalAlert) criticalCount++;
    }

    return NextResponse.json(
      {
        success: true,
        count: labOrders.length,
        totalOrders: allForCounts.length,
        stats: {
          pending: pendingCount,
          inProgress: inProgressCount,
          completed: completedCount,
          critical: criticalCount,
          rejected: rejectedCount,
        },
        labOrders,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Lab-Orders GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching lab orders' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'doctor']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();

    const {
      patientId,
      testName,
      priority = 'Routine',
      consultationId,
      doctorName = 'Dr. Sarah Johnson',
      specimenType = 'Blood',
    } = body;

    if (!patientId || !testName) {
      return NextResponse.json(
        { success: false, error: 'Patient ID and Test Name are required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const patient = await Patient.findOne({
      $or: [
        { patientId: patientId.toUpperCase() },
        { _id: patientId.match(/^[0-9a-fA-F]{24}$/) ? patientId : null },
      ],
    });

    if (!patient) {
      return NextResponse.json(
        { success: false, error: `Patient ${patientId} not found in registry` },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    const orderId = (body.orderId && String(body.orderId).trim())
      ? String(body.orderId).trim().toUpperCase()
      : await LabOrder.generateNextOrderId();

    const newLabOrder = await LabOrder.create({
      orderId,
      patient: patient._id,
      patientId: patient.patientId,
      patientName: patient.name,
      doctorName,
      consultationId: consultationId || '',
      testName,
      priority,
      specimenType,
      status: body.status || 'Pending',
      date: new Date().toISOString().split('T')[0],
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Lab order created successfully',
        labOrder: newLabOrder,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Lab-Orders POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error creating lab order' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
