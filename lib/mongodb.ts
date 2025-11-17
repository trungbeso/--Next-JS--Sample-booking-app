import mongoose, { ConnectOptions } from 'mongoose';

/**
 * MongoDB connection URI.
 *
 * This should be defined in your environment variables, e.g. `.env.local`:
 * MONGODB_URI=mongodb+srv://user:password@cluster-url/db-name
 */
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable (e.g. in .env.local)');
}

/**
 * Shape of the cached Mongoose connection used between hot reloads.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

/**
 * Augment the global scope to store a cached Mongoose connection in development.
 *
 * Using `var` in the declaration ensures the variable is attached to `globalThis`
 * and can be reused across module reloads in Next.js dev mode.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

// Reuse existing cached connection if it exists, otherwise create a new cache object.
const cached: MongooseCache = globalThis._mongoose ?? { conn: null, promise: null };
if (!globalThis._mongoose) {
  globalThis._mongoose = cached;
}

/**
 * Establishes (or reuses) a single Mongoose connection.
 *
 * This function:
 * - Reuses an existing connection if one is already established.
 * - Caches the connection promise to avoid creating multiple connections
 *   during concurrent requests or hot reloads in development.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  // If we already have an active connection, return it.
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection is already in progress, reuse its promise.
  if (!cached.promise) {
    const options: ConnectOptions = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, options).then((mongooseInstance) => {
      return mongooseInstance;
    });

    if (!MONGODB_URI) {
        throw new Error('Please define the MONGODB_URI environment variable inside .env');
    }
  }

  // Wait for the connection promise to resolve and cache the resolved connection.
  cached.conn = await cached.promise;
  return cached.conn;
}

export default connectToDatabase;
