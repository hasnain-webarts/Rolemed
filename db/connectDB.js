import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/rolemed';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage in Next.js.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log(`[MongoDB] Connected successfully to: ${mongooseInstance.connection.name}`);
      return mongooseInstance;
    });

    if (typeof process !== 'undefined' && !global.__mongoShutdownHookRegistered) {
      global.__mongoShutdownHookRegistered = true;
      const gracefulExit = async (signal) => {
        console.log(`[MongoDB] Received ${signal}. Closing connection cleanly...`);
        try {
          if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close(false);
          }
        } catch (err) {
          console.error('[MongoDB] Error closing connection on exit:', err);
        }
      };

      process.once('SIGINT', () => gracefulExit('SIGINT'));
      process.once('SIGTERM', () => gracefulExit('SIGTERM'));
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('[MongoDB] Connection error:', e.message);
    throw new Error(`Database connection failed: ${e.message}`);
  }

  return cached.conn;
}

export default connectDB;