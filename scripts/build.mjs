import { cp, mkdir, rm } from "node:fs/promises";

await rm("public", { recursive: true, force: true });
await mkdir("public", { recursive: true });
await cp("dashboard/index.html", "public/index.html");
await cp("dashboard", "public/dashboard", { recursive: true });
console.log("Prepared public dashboard output");
