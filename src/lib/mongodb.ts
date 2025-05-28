
import mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('FATAL_ERROR: MONGO_URL environment variable is not defined.');
  throw new Error(
    'Please define the MONGO_URL environment variable inside .env.local'
  );
} else {
  console.log('[DB_CONNECT_LOG] MONGO_URL is defined.');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // Allow global `mongoose` cache object in development
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

let cached: MongooseCache = global.mongoose;

if (!cached) {
  console.log('[DB_CONNECT_LOG] Initializing global mongoose cache.');
  cached = global.mongoose = { conn: null, promise: null };
} else {
  console.log('[DB_CONNECT_LOG] Global mongoose cache already exists.');
}

async function dbConnect(): Promise<typeof mongoose> {
  console.log('[DB_CONNECT_LOG] dbConnect called.');
  if (cached.conn) {
    console.log('[DB_CONNECT_LOG] Using cached MongoDB connection.');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Disable buffering for more immediate error feedback
      serverSelectionTimeoutMS: 5000, // Short timeout for connection attempts
    };

    console.log('[DB_CONNECT_LOG] No cached promise. Creating new MongoDB connection promise.');
    console.log(`[DB_CONNECT_LOG] Attempting to connect to: ${MONGO_URL.substring(0, MONGO_URL.indexOf('@') > 0 ? MONGO_URL.indexOf('@') : MONGO_URL.length)}...`); // Log URL without credentials for security

    cached.promise = mongoose.connect(MONGO_URL!, opts).then((mongooseInstance) => {
      console.log('[DB_CONNECT_LOG] MongoDB connected successfully via new promise.');
      return mongooseInstance;
    }).catch(error => {
        console.error('[DB_CONNECT_LOG] MongoDB connection error during initial connection promise:', error.message);
        console.error('[DB_CONNECT_LOG] Full error during initial promise:', error);
        cached.promise = null; // Reset promise on error so next attempt can try again
        throw error; // Re-throw to be caught by the caller
    });
  } else {
    console.log('[DB_CONNECT_LOG] Awaiting existing MongoDB connection promise.');
  }

  try {
    cached.conn = await cached.promise;
    console.log('[DB_CONNECT_LOG] MongoDB connection established from promise.');
  } catch (e: any) {
    cached.promise = null; // Clear the promise if it failed
    console.error('[DB_CONNECT_LOG] MongoDB connection error while awaiting promise:', e.message);
    console.error('[DB_CONNECT_LOG] Full error awaiting promise:', e);
    throw e; // Re-throw to be caught by the caller
  }
  
  return cached.conn;
}

export default dbConnect;
