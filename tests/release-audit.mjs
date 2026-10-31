import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const www = path.join(root, 'www');
const pages = ['index.html', 'online.html', 'demo.html'];
const errors = [];
function check(condition, message) { if (!condition) errors.push(message); }

for (const page of pages) {
  const file = path.join(www, page);
  const html = fs.readFileSync(file, 'utf8');
  const ids = [...html.matchAll(/\bid\s*=\s*(["'])(.*?)\1/gi)].map(m => m[2]);
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  check(!duplicates.length, `${page}: duplicate static id(s): ${duplicates.join(', ')}`);
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/.test(match[1]) || !match[2].trim()) continue;
    try { new vm.Script(match[2], { filename: `${page}:inline` }); }
    catch (e) { errors.push(`${page}: inline script syntax: ${e.message}`); }
  }
  for (const match of html.matchAll(/\b(src|href)\s*=\s*(["'])(.*?)\2/gi)) {
    const attr = match[1], raw = match[3];
    if (!['src', 'href'].includes(attr.toLowerCase())) continue;
    const ref = raw.split(/[?#]/, 1)[0];
    if (!ref || /^(?:https?:|data:|mailto:|tel:|#|javascript:)/i.test(ref)) continue;
    check(fs.existsSync(path.resolve(www, ref)), `${page}: missing local ${attr} ${raw}`);
  }
}

let manifest;
try { manifest = JSON.parse(fs.readFileSync(path.join(www, 'manifest.webmanifest'), 'utf8')); }
catch (e) { errors.push(`manifest.webmanifest: invalid JSON (${e.message})`); }
if (manifest) {
  check(typeof manifest.name === 'string' && manifest.name.length > 0, 'manifest: missing app name');
  check(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display), 'manifest: unexpected display mode');
  check(manifest.icons?.some(i => i.sizes === '192x192'), 'manifest: missing 192x192 icon');
  check(manifest.icons?.some(i => i.sizes === '512x512'), 'manifest: missing 512x512 icon');
  for (const icon of manifest.icons || []) check(fs.existsSync(path.resolve(www, icon.src)), `manifest: missing icon ${icon.src}`);
}

for (const file of ['online.js', 'app.js']) {
  const js = fs.readFileSync(path.join(www, file), 'utf8');
  try { new vm.Script(js, { filename: file }); }
  catch (e) { errors.push(`${file}: JavaScript syntax (${e.message})`); }
  check(!/service_role|sb_secret_/i.test(js), `${file}: possible server-side secret key in client source`);
}

if (errors.length) {
  console.error(`PitakGo release audit failed (${errors.length} issue(s)):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('PitakGo release audit passed: 3 HTML pages, static IDs, local asset references, manifest icons, 2 JavaScript files, and client-secret scan.');
}
