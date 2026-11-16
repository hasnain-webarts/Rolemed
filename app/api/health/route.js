import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/db/connectDB';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let isConnected = false;

  try {
    await connectDB();
    const readyState = mongoose.connection.readyState;
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    if (readyState === 1) {
      dbStatus = 'connected';
      isConnected = true;
    } else if (readyState === 2) {
      dbStatus = 'connecting';
    } else {
      dbStatus = 'disconnected';
    }
  } catch (error) {
    dbStatus = 'error';
    console.error('[Healthcheck DB Error]:', error.message);
  }

  const responseTimeMs = Date.now() - startTime;
  const memory = process.memoryUsage ? process.memoryUsage() : {};

  const payload = {
    status: isConnected ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    responseTimeMs,
    environment: process.env.NODE_ENV || 'production',
    database: {
      status: dbStatus,
      name: mongoose.connection?.name || 'rolemed',
      host: mongoose.connection?.host || 'localhost',
    },
    system: {
      heapUsedMB: memory.heapUsed ? Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100 : 0,
      rssMB: memory.rss ? Math.round((memory.rss / 1024 / 1024) * 100) / 100 : 0,
    },
  };

  return NextResponse.json(payload, {
    status: isConnected ? 200 : 503,
    headers: NO_CACHE_HEADERS,
  });
}

