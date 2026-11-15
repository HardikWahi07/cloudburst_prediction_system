import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  HIMALAYAN_DISTRICTS,
  HIMALAYAN_MONITORING_LOCATIONS,
  HIMALAYAN_STATES,
} from "./seedData.js";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connection string detection (Vercel Postgres, Supabase, Neon, AWS RDS, Local)
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.PG_CONNECTION_STRING ||
  null;

let pool = null;
let isConnected = false;
let initPromise = null;

if (connectionString || process.env.PGHOST) {
  try {
    pool = new Pool({
      connectionString: connectionString || undefined,
      host: process.env.PGHOST,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
      ssl:
        process.env.PGSSLMODE === "disable"
          ? false
          : process.env.NODE_ENV === "production" || connectionString?.includes("sslmode=require")
          ? { rejectUnauthorized: false }
          : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.warn("[PostgreSQL] Idle client error, falling back to in-memory store:", err.message);
      isConnected = false;
    });
  } catch (err) {
    console.warn("[PostgreSQL] Pool initialization warning:", err.message);
    pool = null;
  }
}

/**
 * Initializes the PostgreSQL schema and seeds tables if empty.
 * Runs idempotently on startup.
 */
export async function initializeDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!pool) {
      console.log("[PostgreSQL] No database connection string provided. Using in-memory Indian Himalayan geospatial store.");
      return false;
    }

    try {
      const client = await pool.connect();
      try {
        // 1. Run schema migration
        const schemaPath = path.resolve(__dirname, "schema.sql");
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, "utf-8");
          await client.query(schemaSql);
        }

        // 2. Check if locations are populated
        const countRes = await client.query("SELECT COUNT(*) AS count FROM himalayan_monitoring_locations;");
        const count = Number.parseInt(countRes.rows[0]?.count || "0", 10);

        if (count === 0) {
          console.log("[PostgreSQL] Seeding Indian Himalayan geospatial database tables...");
          const seedPath = path.resolve(__dirname, "seed.sql");
          if (fs.existsSync(seedPath)) {
            const seedSql = fs.readFileSync(seedPath, "utf-8");
            await client.query(seedSql);
            console.log(`[PostgreSQL] Database seeded successfully with ${HIMALAYAN_MONITORING_LOCATIONS.length} monitoring locations.`);
          }
        }

        isConnected = true;
        console.log(`[PostgreSQL] Connected and verified: ${count || HIMALAYAN_MONITORING_LOCATIONS.length} Himalayan locations ready.`);
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn("[PostgreSQL] Connection or migration failed, operating in resilient in-memory mode:", err.message);
      isConnected = false;
      return false;
    }
  })();

  return initPromise;
}

/**
 * Executes a parameterized query using PostgreSQL pool if available,
 * or returns null to signal fallback.
 * @param {string} text SQL statement
 * @param {Array<any>} params Parameter bindings
 * @returns {Promise<Array<object>|null>}
 */
export async function queryPostgres(text, params = []) {
  if (!pool || !isConnected) {
    await initializeDatabase().catch(() => {});
  }

  if (!pool || !isConnected) return null;

  try {
    const res = await pool.query(text, params);
    return res.rows;
  } catch (err) {
    console.warn(`[PostgreSQL Query Error]: ${err.message}. Falling back.`);
    return null;
  }
}

/**
 * Returns database engine connection status & diagnostics
 */
export async function getDatabaseStatus() {
  await initializeDatabase().catch(() => {});

  return {
    engine: "PostgreSQL",
    connected: isConnected,
    mode: isConnected ? "Live PostgreSQL Database" : "In-Memory Geospatial Fallback",
    database: process.env.PGDATABASE || (connectionString ? "Remote PostgreSQL" : "N/A"),
    totalStates: HIMALAYAN_STATES.length,
    totalDistricts: HIMALAYAN_DISTRICTS.length,
    totalMonitoringLocations: HIMALAYAN_MONITORING_LOCATIONS.length,
    spatialIndexing: isConnected ? "B-Tree (lat, lon) + Spatial BBox" : "In-Memory Float Scan",
  };
}

export { pool };

