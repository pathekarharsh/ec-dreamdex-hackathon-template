import { appendEvent, isValidIngestSecret } from "../lib/neon.mjs";

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64 * 1024) throw new Error("Payload too large");
  }
  return JSON.parse(body || "{}");
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.statusCode = 405;
    response.setHeader("Allow", "POST");
    return response.end("Method Not Allowed");
  }
  if (!isValidIngestSecret(request)) {
    response.statusCode = 401;
    return response.end(JSON.stringify({ error: "Unauthorized" }));
  }
  try {
    const input = await readBody(request);
    const type = typeof input.type === "string" ? input.type.trim().slice(0, 64) : "agent";
    const payload = input.payload && typeof input.payload === "object" && !Array.isArray(input.payload) ? input.payload : {};
    const result = await appendEvent(type, payload);
    response.statusCode = 201;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    return response.end(JSON.stringify({ ok: true, ...result }));
  } catch (error) {
    response.statusCode = error.message === "Payload too large" ? 413 : 400;
    return response.end(JSON.stringify({ error: "Invalid event payload" }));
  }
}
