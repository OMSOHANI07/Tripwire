// Downloads freely licensed destination photos from Wikimedia Commons into
// public/photos/, resizes them, and records attribution in
// lib/photo-credits.json.   Run: node scripts/fetch-images.mjs [id ...]
//
// Each entry maps a photo id to a Wikipedia article whose lead image we use
// (or a direct "File:..." name on Commons). Only Commons-hosted, freely
// licensed files are accepted.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const UA = "GroupTripDecider/1.0 (student project; photo fetcher)";
const SOURCES = JSON.parse(readFileSync("scripts/photo-sources.json", "utf8"));
const CREDITS = "lib/photo-credits.json";
const credits = existsSync(CREDITS) ? JSON.parse(readFileSync(CREDITS, "utf8")) : {};
mkdirSync("public/photos", { recursive: true });

const strip = (html = "") => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, tries = 5) {
  for (let i = 0; ; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res;
    if (res.status !== 429 || i >= tries) throw new Error(`${res.status} ${url}`);
    await sleep(3000 * (i + 1)); // rate limited: back off
  }
}

async function fileFor(source) {
  if (source.startsWith("File:")) return source;
  const q = `https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=name&titles=${encodeURIComponent(source)}`;
  const page = Object.values((await (await get(q)).json()).query.pages)[0];
  if (!page.pageimage) throw new Error(`no lead image for ${source}`);
  return `File:${page.pageimage}`;
}

const only = process.argv.slice(2);
for (const [id, source] of Object.entries(SOURCES)) {
  if (only.length && !only.includes(id)) continue;
  try {
    const file = await fileFor(source);
    const q = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1600&titles=${encodeURIComponent(file)}`;
    const page = Object.values((await (await get(q)).json()).query.pages)[0];
    const info = page.imageinfo?.[0];
    if (!info) throw new Error(`${file} is not on Commons (possibly non-free)`);
    const m = info.extmetadata ?? {};
    const license = m.LicenseShortName?.value ?? "";
    if (!/CC|Public domain|PD/i.test(license)) throw new Error(`${file}: license "${license}" not accepted`);
    const buf = Buffer.from(await (await get(info.thumburl ?? info.url)).arrayBuffer());
    const out = `public/photos/${id}.jpg`;
    writeFileSync(out, buf);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "68", "-Z", ["hero", "banner"].includes(id) ? "1800" : "900", out, "--out", out], { stdio: "ignore" });
    credits[id] = {
      title: file.replace(/^File:/, "").replace(/\.[a-z]+$/i, "").replace(/_/g, " "),
      artist: strip(m.Artist?.value) || "Unknown",
      license,
      source: info.descriptionurl,
    };
    console.log(`✓ ${id.padEnd(12)} ${license.padEnd(14)} ${file}`);
  } catch (e) {
    console.log(`✗ ${id.padEnd(12)} ${e.message}`);
  }
  await sleep(1500);
}
writeFileSync(CREDITS, JSON.stringify(credits, null, 2) + "\n");
