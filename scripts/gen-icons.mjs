// PWA アイコン生成（外部依存なし）。黒背景 + ライム色の "A" マーク。
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const INK = [10, 10, 10];
const LIME = [198, 255, 74];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// 線分との距離（太い線で "A" を描く）
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function makeIcon(size, { maskable }) {
  // maskable は安全領域（中心 80%）にマークを収める
  const scale = maskable ? 0.62 : 0.78;
  const stroke = size * 0.11 * scale;
  const cx = size / 2;
  const top = size / 2 - size * 0.24 * scale;
  const bottom = size / 2 + size * 0.24 * scale;
  const half = size * 0.22 * scale;
  const radius = maskable ? 0 : size * 0.22;
  return encodePng(size, (x, y) => {
    // 角丸（非 maskable のみ）
    if (!maskable) {
      const rx = Math.max(radius - x, 0, x - (size - 1 - radius));
      const ry = Math.max(radius - y, 0, y - (size - 1 - radius));
      if (rx * rx + ry * ry > radius * radius) return [255, 255, 255];
    }
    const d1 = distToSeg(x, y, cx - half, bottom, cx, top);
    const d2 = distToSeg(x, y, cx + half, bottom, cx, top);
    const dot = Math.hypot(x - cx, y - (bottom - size * 0.06 * scale));
    const inside = Math.min(d1, d2) < stroke / 2 || dot < stroke * 0.55;
    return inside ? LIME : INK;
  });
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', makeIcon(192, { maskable: false }));
writeFileSync('public/icons/icon-512.png', makeIcon(512, { maskable: false }));
writeFileSync('public/icons/icon-maskable-512.png', makeIcon(512, { maskable: true }));
writeFileSync('public/apple-touch-icon.png', makeIcon(180, { maskable: true }));
console.log('icons generated');
