import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const logPath = resolve(process.cwd(), "data/sentinel-log.json");

async function readRecords() {
  try {
    const value = JSON.parse(await readFile(logPath, "utf8"));
    return Array.isArray(value) ? value.slice(-100).reverse() : [];
  } catch {
    return [];
  }
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET");
    return response.end("Method Not Allowed");
  }

  const records = await readRecords();
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.statusCode = 200;
  return response.end(JSON.stringify({
    agent: process.env.DRY_RUN === "true" || !process.env.PRIVATE_KEY ? "Standby" : "Configured",
    dryRun: process.env.DRY_RUN !== "false",
    marketConfigured: Boolean(process.env.MARKET_ID && process.env.MARKET_POOL),
    safetyNetConfigured: Boolean(process.env.SAFETY_NET_ADDRESS),
    records,
    lastSync: new Date().toISOString(),
  }));
}
