import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/db/connectDB';
import { authenticateRoute, handleApiError } from '@/lib/authGuard';
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
    const action = searchParams.get('action') || '';
    const moduleName = searchParams.get('module') || '';
    const alert = searchParams.get('alert') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const query = {};

    if (action && action.toUpperCase() !== 'ALL') {
      query.action = action.toUpperCase();
    }

    if (moduleName && moduleName.toLowerCase() !== 'all') {
      query.module = new RegExp(`^${escapeRegex(moduleName)}$`, 'i');
    }

    if (alert === 'true') {
      query.alert = true;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { description: searchRegex },
        { user: searchRegex },
        { action: searchRegex },
        { module: searchRegex },
        { ip: searchRegex },
      ];
    }

    const logs = await AuditLog.find(query).sort({ timestamp: -1, createdAt: -1 }).limit(limit).lean();

    const formattedLogs = logs.map((log) => {
      const d = log.timestamp || log.createdAt || new Date();
      const dateStr = new Date(d).toISOString().split('T')[0];
      const timeStr = new Date(d).toTimeString().split(' ')[0];
      return {
        id: log._id.toString(),
        date: dateStr,
        time: timeStr,
        user: log.user,
        uid: log.userId ? log.userId.toString().slice(-6).toUpperCase() : '#SYS-01',
        actionType: log.action,
        actionDescription: log.description,
        module: log.module,
        ip: log.ip,
        alert: Boolean(log.alert),
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: formattedLogs.length,
        logs: formattedLogs,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Audit-Logs GET Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error fetching audit logs' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to submit audit logs' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await req.json();

    const {
      action = 'SYSTEM',
      module = 'System',
      description,
      alert = false,
    } = body;

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Audit description is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Derive authentic user and IP from session and headers, not untrusted client body
    const realUser = session.user.name || session.user.email || 'Hospital Staff';
    const realUserRole = session.user.role || 'staff';
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const newLog = await AuditLog.create({
      action: action.toUpperCase(),
      module,
      description: description.trim(),
      user: realUser,
      userRole: realUserRole,
      ip: clientIp,
      alert: Boolean(alert),
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        log: newLog,
      },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error('[API Audit-Logs POST Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error recording audit log' },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

