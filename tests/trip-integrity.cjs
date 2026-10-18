const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const poster = 'assets/trip-overview-2026-v4.jpg';
assert.ok(html.includes('src="' + poster + '"'));
assert.ok(!html.includes('trip-overview-2026-v3.jpg'));
assert.ok(html.includes('id="imageLightboxScroll"'));
assert.ok(html.includes('id="imageZoomIn"') && html.includes('id="imageZoomOut"'));
assert.ok(html.includes('href="' + poster + '" download='));
assert.ok(!html.includes('user-scalable=no'));
function data(name) {
  const match = html.match(new RegExp('^const ' + name + '\\s*=\\s*(\\[[\\s\\S]*?\\n\\]);', 'm'));
  assert.ok(match, name + ' must be a structured array');
  return JSON.parse(match[1]);
}

for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
  if (match[1].trim()) new vm.Script(match[1]);
}
const days = data('DAYS');
const hotels = data('HOTELS');
const guide = data('GUIDE');
const mapDays = data('MAP_DAYS');
const info = data('DAY_INFO');
assert.equal(days.length, 8);
assert.equal(hotels.length, 6);
assert.equal(mapDays.length, 8);
assert.equal(info.length, 8);
assert.deepEqual(days.map(d => d.key), mapDays.map(d => d.key));
assert.ok(!JSON.stringify({ days, hotels, guide, mapDays }).includes('\u51fd\u9928'));
assert.deepEqual(info.map(d => hotels.findIndex(h => d.hotel.includes(h.name) || d.hotel.includes(h.ja) || d.hotel.includes(h.zh))), [0, 1, 2, 2, 3, 4, 5, -1]);
for (const hotel of hotels) {
  assert.ok(hotel.address && hotel.phone && hotel.check);
  assert.equal(new URL(hotel.mapUrl).hostname, 'maps.app.goo.gl');
  assert.equal(new URL(hotel.web).protocol, 'https:');
}
for (const day of mapDays) {
  assert.ok(day.routes.length > 0);
  for (const route of day.routes) {
    for (const coords of [route.stationCoord, route.spotCoord]) {
      assert.equal(coords.length, 2);
      assert.ok(coords[0] > 42 && coords[0] < 44);
      assert.ok(coords[1] > 140 && coords[1] < 142);
    }
  }
}
for (const spot of guide) {
  assert.ok(spot.dayIndex >= 0 && spot.dayIndex < days.length);
  assert.ok(spot.gallery.length > 0);
}
const assets = new Set([...html.matchAll(/["'`](assets\/[^"'`?\s]+)["'`]/g)].map(m => m[1]));
for (const asset of assets) assert.ok(fs.existsSync(path.join(root, asset)), 'Missing asset: ' + asset);
assert.equal(html, fs.readFileSync(path.join(root, '\u672d\u5e4c\u65c5\u904aApp.html'), 'utf8'));
assert.ok(!/\b\d{10}\b|(?:NT)?\$\s*\d{4}|transaction number|ReceiptPdf/.test(html));
const ignored = execFileSync('git', ['check-ignore', 'private-trip-notes.txt', 'ReceiptPdf.pdf', 'booking.pdf'], { cwd: root, encoding: 'utf8' });
assert.equal(ignored.trim().split('\n').length, 3);
assert.equal(execFileSync('git', ['ls-files', '*.pdf', 'private-trip-notes.txt'], { cwd: root, encoding: 'utf8' }).trim(), '');
console.log('PASS: 8 days, 6 stays, guide photos, maps, assets, script syntax, mirrored entry and privacy exclusions.');
