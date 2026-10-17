// Скачивает все картинки и видео с CDN Framer в assets/media/
// и переписывает ссылки в HTML на локальные.
// Запуск из корня проекта:  node scripts/download-assets.mjs   (нужен Node 18+)
import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MEDIA = path.join(ROOT, "assets", "media");
const RE = /https:\/\/framerusercontent\.com\/(?:images|assets)\/[A-Za-z0-9_-]+\.(?:png|jpe?g|svg|webp|gif|mp4|webm)/g;

async function walk(dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = path.join(dir, name);
    const s = await stat(p);
    if (s.isDirectory()) out.push(...(await walk(p)));
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
const urls = new Set();
const contents = new Map();
for (const f of files) {
  const t = await readFile(f, "utf8");
  contents.set(f, t);
  for (const m of t.matchAll(RE)) urls.add(m[0]);
}

await mkdir(MEDIA, { recursive: true });
console.log(`Найдено файлов: ${urls.size}`);
let i = 0;
for (const url of urls) {
  i++;
  const name = path.basename(new URL(url).pathname);
  const dest = path.join(MEDIA, name);
  if (existsSync(dest)) { console.log(`[${i}/${urls.size}] уже есть ${name}`); continue; }
  const res = await fetch(url);
  if (!res.ok) { console.warn(`[${i}/${urls.size}] ОШИБКА ${res.status} ${url}`); continue; }
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`[${i}/${urls.size}] ${name}`);
}

for (const [f, t] of contents) {
  const next = t.replace(RE, (u) => {
    const name = path.basename(new URL(u).pathname);
    return existsSync(path.join(MEDIA, name)) ? `/assets/media/${name}` : u;
  });
  if (next !== t) await writeFile(f, next);
}
console.log("Готово: ссылки в HTML заменены на /assets/media/...");
