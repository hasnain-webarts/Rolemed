import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Equipment from '@/models/Equipment';
import Counter from '@/models/Counter';
import AuditLog from '@/models/AuditLog';
import escapeRegex from '@/lib/escapeRegex';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET(req) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);

    const category = searchParams.get('category') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const condition = searchParams.get('condition') || '';
    const maintenance = searchParams.get('maintenance') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const query = { isArchived: false };

    if (category && category.toLowerCase() !== 'all') {
      query.category = category;
    }

    if (department && department.toLowerCase() !== 'all') {
      query.department = department;
    }

    if (status && status.toLowerCase() !== 'all') {
      query.status = status;
    }

    if (condition && condition.toLowerCase() !== 'all') {
      query.condition = condition;
    }

    if (maintenance === 'overdue') {
      query.nextMaintenanceDate = { $lte: new Date() };
      query.status = { $ne: 'Decommissioned' };
    }

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { name: regex },
        { assetId: regex },
        { serialNumber: regex },
        { modelNumber: regex },
        { manufacturer: regex },
        { locationRoom: regex },
        { bedNumber: regex },
        { assignedTechnician: regex },
        { vendorName: regex },
      ];
    }

    const [equipments, allAssets] = await Promise.all([
      Equipment.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Equipment.find({ isArchived: false }).select('category status condition purchaseCostPkr nextMaintenanceDate').lean(),
    ]);

    const now = new Date();
    let totalValuationPkr = 0;
    let operational = 0;
    let inUse = 0;
    let underMaintenance = 0;
    let needsInspection = 0;
    let decommissioned = 0;
    let totalBeds = 0;
    let operationalBeds = 0;
    let overdueMaintenance = 0;

    for (const item of allAssets) {
      if (item.status !== 'Decommissioned') {
        totalValuationPkr += item.purchaseCostPkr || 0;
      }
      if (item.status === 'Operational') operational++;
      else if (item.status === 'In Use') inUse++;
      else if (item.status === 'Under Maintenance') underMaintenance++;
      else if (item.status === 'Needs Inspection') needsInspection++;
      else if (item.status === 'Decommissioned') decommissioned++;

      if (item.category === 'Hospital Bed' && item.status !== 'Decommissioned') {
        totalBeds++;
        if (item.status === 'Operational') operationalBeds++;
      }

      if (item.nextMaintenanceDate && new Date(item.nextMaintenanceDate) <= now && item.status !== 'Decommissioned') {
        overdueMaintenance++;
      }
    }

    const stats = {
      totalAssets: allAssets.length,
      operational,
      inUse,
      underMaintenance,
      needsInspection,
      decommissioned,
      totalValuationPkr,
      totalBeds,
      operationalBeds,
      overdueMaintenance,
      uptimePercentage: allAssets.length > 0 
        ? Math.round(((operational + inUse) / (allAssets.length - decommissioned || 1)) * 100) 
        : 100,
    };

    return NextResponse.json(
      {
        success: true,
        count: equipments.length,
        stats,
        equipments,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error fetching hospital equipment records');
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, 'admin');
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    await connectDB();
    const body = await req.json();

    const {
      name,
      category,
      manufacturer,
      modelNumber = 'N/A',
      serialNumber,
      department,
      locationRoom,
      bedNumber = '',
      status = 'Operational',
      condition = 'Good',
      purchaseDate = new Date(),
      purchaseCostPkr,
      vendorName,
      vendorContact = '',
      warrantyExpiry,
      maintenanceIntervalDays = 90,
      assignedTechnician = 'Lead Biomedical Eng.',
      notes = '',
    } = body;

    if (!name || !category || !manufacturer || !serialNumber || !department || !locationRoom || purchaseCostPkr === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Required fields missing: name, category, manufacturer, serialNumber, department, locationRoom, and purchaseCostPkr are mandatory.',
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const existingSerial = await Equipment.findOne({ serialNumber: serialNumber.trim() });
    if (existingSerial) {
      return NextResponse.json(
        {
          success: false,
          error: `An equipment asset with serial number "${serialNumber.trim()}" already exists (${existingSerial.assetId} - ${existingSerial.name}).`,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Atomically obtain next unique asset identifier
    const assetId = await Counter.getNextSequence('equipmentId', {
      prefix: 'EQP-',
      padLength: 4,
      seedFloor: 1001,
    });

    const parsedPurchaseCost = parseFloat(purchaseCostPkr) || 0;
    const parsedPurchaseDate = new Date(purchaseDate);
    const parsedWarranty = warrantyExpiry ? new Date(warrantyExpiry) : null;

    const intervalDays = parseInt(maintenanceIntervalDays, 10) || 90;
    const nextMaintenance = new Date();
    nextMaintenance.setDate(nextMaintenance.getDate() + intervalDays);

    const newEquipment = await Equipment.create({
      assetId,
      name: name.trim(),
      category,
      manufacturer: manufacturer.trim(),
      modelNumber: modelNumber.trim(),
      serialNumber: serialNumber.trim(),
      department,
      locationRoom: locationRoom.trim(),
      bedNumber: category === 'Hospital Bed' ? (bedNumber || '').trim().toUpperCase() : undefined,
      status,
      condition,
      purchaseDate: parsedPurchaseDate,
      purchaseCostPkr: parsedPurchaseCost,
      vendorName: vendorName.trim(),
      vendorContact: vendorContact.trim(),
      warrantyExpiry: parsedWarranty,
      lastServicedDate: new Date(),
      nextMaintenanceDate: nextMaintenance,
      maintenanceIntervalDays: intervalDays,
      assignedTechnician: assignedTechnician.trim(),
      notes: notes.trim(),
    });

    // Write audit log entry
    try {
      await AuditLog.create({
        action: 'CREATE',
        module: 'Equipment',
        description: `Registered new asset ${assetId}: ${newEquipment.name} (${newEquipment.category}) in ${newEquipment.department}. Valuation: Rs. ${parsedPurchaseCost.toLocaleString()}`,
        user: user.name || 'Chief Administrator',
        userId: user.id || null,
        userRole: user.role || 'admin',
        ip: req.headers.get('x-forwarded-for') || '127.0.0.1',
      });
    } catch (auditErr) {
      console.error('[Equipment POST] Audit log write warning:', auditErr.message);
    }

    return NextResponse.json(
      {
        success: true,
        message: `Asset ${assetId} successfully registered.`,
        equipment: newEquipment,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    return handleApiError(error, 'Error registering hospital equipment asset');
  }
}

