import crypto from "node:crypto";
import { NewsAdapter } from "./news.mjs";

export function normalizeSignal(item, source = "news") {
  const title = String(item.title || "").trim();
  const url = String(item.url || "").trim();
  return {
    signalId: crypto.createHash("sha256").update(`${source}:${url || title}`).digest("hex"),
    source,
    title,
    url,
    sourceName: item.source || source,
    publishedAt: item.publishedAt || new Date().toISOString(),
    receivedAt: new Date().toISOString(),
  };
}

export class SignalIngestor {
  constructor({ query, onSignal } = {}) {
    this.news = new NewsAdapter({ query });
    this.onSignal = onSignal;
    this.running = false;
  }

  async runOnce() {
    const items = await this.news.fetchLatest();
    const signals = items.map((item) => normalizeSignal(item));
    for (const signal of signals) await this.onSignal?.(signal);
    return signals;
  }

  async start(intervalMs = 60_000) {
    if (this.running) return;
    this.running = true;
    while (this.running) {
      try { await this.runOnce(); } catch (error) { console.error(`[sentinel] signal ingestion failed: ${error.message}`); }
      if (this.running) await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  stop() { this.running = false; }
}
