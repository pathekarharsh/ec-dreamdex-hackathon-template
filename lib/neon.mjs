import pg from "pg";

const { Pool } = pg;
let pool;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 5_000 });
  return pool;
}

export async function readEvents(limit = 100) {
  const database = getPool();
  if (!database) return [];
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const result = await database.query("SELECT id, event_type, payload, created_at FROM sentinel_events ORDER BY id DESC LIMIT $1", [safeLimit]);
  return result.rows.map((row) => ({ id: row.id, type: row.event_type, ...(row.payload || {}), timestamp: row.created_at }));
}

export async function appendEvent(type, payload = {}) {
  const database = getPool();
  if (!database) throw new Error("DATABASE_URL is not configured");
  const result = await database.query("INSERT INTO sentinel_events (event_type, payload) VALUES ($1, $2::jsonb) RETURNING id, created_at", [type, JSON.stringify(payload)]);
  return result.rows[0];
}

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
}

export function isValidIngestSecret(request) {
  const expected = process.env.AGENT_INGEST_SECRET;
  if (!expected) return false;
  return request.headers?.authorization === `Bearer ${expected}`;
}
