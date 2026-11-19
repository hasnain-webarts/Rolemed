import { NextResponse } from 'next/server';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
import Medicine from '@/models/Medicine';
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
    const auth = await authenticateRoute(req, ['admin', 'doctor', 'pharmacist', 'receptionist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const limit = parseInt(searchParams.get('limit') || '200', 10);

    const query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { name: searchRegex },
        { genericName: searchRegex },
        { sku: searchRegex },
        { manufacturer: searchRegex },
        { batchNumber: searchRegex },
        { category: searchRegex },
      ];
    }

    if (status === 'out') {
      query.stockQuantity = 0;
    } else if (status === 'low') {
      query.$expr = {
        $and: [
          { $gt: ['$stockQuantity', 0] },
          { $lte: ['$stockQuantity', '$reorderLevel'] },
        ],
      };
    } else if (status === 'in') {
      query.$expr = {
        $gt: ['$stockQuantity', '$reorderLevel'],
      };
    }

    const [medicines, allMedsForStats] = await Promise.all([
      Medicine.find(query).sort({ name: 1 }).limit(limit).lean(),
      Medicine.find({}).select('stockQuantity reorderLevel unitPrice pricePerPack quantityPerPack').lean(),
    ]);

    let lowStockCount = 0;
    let outOfStockCount = 0;
    let totalUnits = 0;
    let totalStockValuePKR = 0;

    for (const m of allMedsForStats) {
      const qty = m.stockQuantity || 0;
      const reorder = m.reorderLevel !== undefined ? m.reorderLevel : 20;
      const price = m.unitPrice || 0;

      totalUnits += qty;
      totalStockValuePKR += qty * price;

      if (qty === 0) {
        outOfStockCount++;
      } else if (qty <= reorder) {
        lowStockCount++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        count: medicines.length,
        currency: 'PKR',
        medicines,
        summary: {
          totalFormulations: allMedsForStats.length,
          lowStockCount,
          outOfStockCount,
          totalUnits,
          totalStockValue: Math.round(totalStockValuePKR * 100) / 100,
          currency: 'PKR',
        },
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Medicines GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve pharmaceutical formulary' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await authenticateRoute(req, ['admin', 'pharmacist']);
    if (auth instanceof NextResponse) return auth;

    await connectDB();
    const body = await req.json();
    const {
      sku,
      name,
      genericName,
      category,
      dosageForm,
      strength,
      quantityPerPack,
      pricePerPack,
      unitPrice,
      stockQuantity,
      reorderLevel,
      expiryDate,
      manufacturer,
      batchNumber,
      location,
    } = body;

    if (!name || stockQuantity === undefined || !expiryDate) {
      return NextResponse.json(
        { success: false, error: 'Name, stock quantity, and expiry date are required' },
        { status: 400 }
      );
    }

    const parsedQtyPerPack = Math.max(1, parseInt(quantityPerPack, 10) || 10);
    let parsedPricePerPack = Math.max(0, parseFloat(pricePerPack) || 0);
    let parsedUnitPrice = Math.max(0, parseFloat(unitPrice) || 0);

    // Synchronize price per pack and unit price in PKR
    if (parsedPricePerPack > 0 && (!parsedUnitPrice || parsedUnitPrice === 0)) {
      parsedUnitPrice = Math.round((parsedPricePerPack / parsedQtyPerPack) * 100) / 100;
    } else if (parsedUnitPrice > 0 && parsedPricePerPack === 0) {
      parsedPricePerPack = Math.round(parsedUnitPrice * parsedQtyPerPack * 100) / 100;
    }

    const assignedSku = sku ? sku.trim().toUpperCase() : await Medicine.generateNextSku();

    const existing = await Medicine.findOne({ sku: assignedSku });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `Medicine formulation with SKU "${assignedSku}" already exists` },
        { status: 400 }
      );
    }

    const medicine = await Medicine.create({
      sku: assignedSku,
      name: name.trim(),
      genericName: genericName ? genericName.trim() : '',
      category: category || 'Other',
      dosageForm: dosageForm || 'Tablet',
      strength: strength ? strength.trim() : '',
      quantityPerPack: parsedQtyPerPack,
      pricePerPack: parsedPricePerPack,
      unitPrice: parsedUnitPrice,
      stockQuantity: Math.max(0, parseInt(stockQuantity, 10) || 0),
      reorderLevel: reorderLevel !== undefined ? parseInt(reorderLevel, 10) : 20,
      expiryDate: expiryDate.trim(),
      manufacturer: manufacturer ? manufacturer.trim() : 'Hospital Formulary',
      batchNumber: batchNumber ? batchNumber.trim() : 'BATCH-001',
      location: location ? location.trim() : 'Central Pharmacy Shelf A',
    });

    return NextResponse.json(
      {
        success: true,
        message: `Medicine "${medicine.name}" (${medicine.sku}) registered successfully in PKR`,
        medicine,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API Medicines POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to register formulation' },
      { status: 500 }
    );
  }
}
