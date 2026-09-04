import crypto from "node:crypto";

export class NewsAdapter {
  constructor({ query = "crypto market prediction", apiKey = process.env.NEWS_API_KEY } = {}) { this.query = query; this.apiKey = apiKey; this.seen = new Set(); }
  async fetchLatest() {
    if (!this.apiKey) return [];
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", this.query); url.searchParams.set("pageSize", "20"); url.searchParams.set("sortBy", "publishedAt"); url.searchParams.set("language", "en");
    const response = await fetch(url, { headers: { "X-Api-Key": this.apiKey } });
    if (!response.ok) throw new Error(`news provider returned ${response.status}`);
    const data = await response.json();
    return (data.articles || []).map((item) => ({ title: item.title, url: item.url, source: item.source?.name, publishedAt: item.publishedAt })).filter((item) => { const id = crypto.createHash("sha256").update(item.url || item.title).digest("hex"); if (this.seen.has(id)) return false; this.seen.add(id); return true; });
  }
}
