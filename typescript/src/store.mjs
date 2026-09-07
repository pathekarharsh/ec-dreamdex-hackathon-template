import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class SentinelStore {
  constructor(file = new URL("../../data/sentinel-log.json", import.meta.url)) { this.file = file; this.records = []; }
  async load() { try { this.records = JSON.parse(await readFile(this.file, "utf8")); } catch { this.records = []; } return this.records; }
  async append(record) { 
    this.records.push({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...record }); 
    await mkdir(dirname(this.file.pathname), { recursive: true }); 
    const replacer = (key, value) => typeof value === 'bigint' ? value.toString() : value;
    await writeFile(this.file, JSON.stringify(this.records, replacer, 2)); 
    return record; 
  }
  async recent(limit = 100) { if (!this.records.length) await this.load(); return this.records.slice(-limit).reverse(); }
}
