import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { config as loadEnv } from "./typescript/node_modules/dotenv/lib/main.js";
loadEnv({ path: path.join(process.cwd(), ".env") });
import statusHandler from "./api/status.mjs";
import eventsHandler from "./api/events.mjs";
import ingestHandler from "./api/ingest.mjs";

const lazyHandler = (loader) => async (request, response) => {
  const module = await loader();
  return module.default(request, response);
};
const runSentinelHandler = lazyHandler(() => import("./api/run-sentinel.mjs"));
const faucetHandler = lazyHandler(() => import("./api/faucet.mjs"));
const claimHandler = lazyHandler(() => import("./api/claim.mjs"));
const riskResetHandler = lazyHandler(() => import("./api/risk-reset.mjs"));

const PORT = Number(process.env.PORT || 3000);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/api/status") {
    return statusHandler(req, res);
  }

  if (pathname === "/api/events") {
    return eventsHandler(req, res);
  }

  if (pathname === "/api/run-sentinel") {
    return runSentinelHandler(req, res);
  }

  if (pathname === "/api/faucet") {
    return faucetHandler(req, res);
  }

  if (pathname === "/api/claim") {
    return claimHandler(req, res);
  }

  if (pathname === "/api/risk-reset") {
    return riskResetHandler(req, res);
  }

  if (pathname === "/api/ingest") {
    return ingestHandler(req, res);
  }

  let filePath = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
  const fullPath = path.join(process.cwd(), safePath);

  try {
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      const indexPath = path.join(fullPath, "index.html");
      const content = await fs.readFile(indexPath);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(content);
    }
    const content = await fs.readFile(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    return res.end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(PORT, () => {
  console.log(`Sentinel server running on http://localhost:${PORT}`);
});
