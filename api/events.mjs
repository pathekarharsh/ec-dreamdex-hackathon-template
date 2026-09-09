import { readEvents } from "../lib/neon.mjs";

const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function snapshot() {
  try {
    return await readEvents(100);
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

  response.statusCode = 200;
  response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");
  response.setHeader("X-Accel-Buffering", "no");
  response.flushHeaders?.();

  let previous = "";
  let closed = false;
  request.on?.("close", () => { closed = true; });
  const deadline = Date.now() + 25_000;

  while (!closed && Date.now() < deadline) {
    const records = await snapshot();
    const serialized = JSON.stringify(records);
    if (serialized !== previous) {
      response.write(`event: snapshot\ndata: ${serialized}\n\n`);
      previous = serialized;
    } else {
      response.write(": heartbeat\n\n");
    }
    await wait(2_000);
  }
  response.end();
}
