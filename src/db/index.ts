import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | null | undefined;
}

export const isCloudSqlConfigured = (): boolean => {
  const { SQL_HOST, DATABASE_URL } = process.env;
  return Boolean(
    (SQL_HOST && SQL_HOST.trim().length > 0) ||
    (DATABASE_URL && DATABASE_URL.trim().length > 0)
  );
};

// Function to create or retrieve the connection pool safely.
export const createPool = (): Pool | null => {
  if (global._postgresPool !== undefined) {
    return global._postgresPool;
  }

  if (!isCloudSqlConfigured()) {
    global._postgresPool = null;
    return null;
  }

  try {
    const { SQL_HOST, SQL_USER, SQL_PASSWORD, SQL_DB_NAME, DATABASE_URL } = process.env;

    const poolConfig = DATABASE_URL
      ? {
          connectionString: DATABASE_URL,
          max: 10,
          connectionTimeoutMillis: 5000,
          ssl: DATABASE_URL.includes("neon.tech") || DATABASE_URL.includes("supabase.co") || DATABASE_URL.includes("vercel-storage.com")
            ? { rejectUnauthorized: false }
            : false,
        }
      : {
          host: SQL_HOST,
          user: SQL_USER,
          password: SQL_PASSWORD,
          database: SQL_DB_NAME,
          max: 10,
          connectionTimeoutMillis: 5000,
        };

    const newPool = new Pool(poolConfig);

    // Prevent unhandled pool-level errors from crashing the application
    newPool.on('error', (err) => {
      console.warn('SQL pool connection notice:', err?.message || err);
    });

    global._postgresPool = newPool;
    return newPool;
  } catch (err) {
    console.warn('PostgreSQL pool creation failed, falling back to persistent local store:', err);
    global._postgresPool = null;
    return null;
  }
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool if available.
export const db = pool ? drizzle(pool, { schema }) : null;
export { schema };

let dbDisabledUntil = 0;

export const recordDbFailure = (err?: any) => {
  // Disable Cloud SQL queries for 45 seconds after a connection failure to maintain fast responses via local store
  dbDisabledUntil = Date.now() + 45000;
};

export const getDb = () => {
  if (!db) return null;
  if (Date.now() < dbDisabledUntil) return null;
  return db;
};


