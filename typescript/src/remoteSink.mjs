const endpoint = process.env.AGENT_DASHBOARD_URL ? `${process.env.AGENT_DASHBOARD_URL.replace(/\/$/, "")}/api/ingest` : null;
const secret = process.env.AGENT_INGEST_SECRET;

export async function publishAgentEvent(type, payload) {
  if (!endpoint || !secret) return;
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ type, payload }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.warn(`[remote-sink] Dashboard publish skipped: ${error.message}`);
  }
}
