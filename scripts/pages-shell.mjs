import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "dist", "client");
const assets = readdirSync(join(root, "assets"));
const css = assets.find((name) => name.startsWith("styles-") && name.endsWith(".css"));
if (!css) throw new Error("pages build did not emit a stylesheet");

const shellPath = join(root, "_shell.html");
const html = readFileSync(shellPath, "utf8").replace(/styles-[A-Za-z0-9_-]+\.css/g, css);
writeFileSync(join(root, "index.html"), html);
writeFileSync(join(root, "404.html"), html);
writeFileSync(join(root, ".nojekyll"), "");
console.log(`[pages] wrote index.html using ${css}`);
