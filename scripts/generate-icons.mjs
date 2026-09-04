/**
 * Generatore icone PWA — zero dipendenze.
 * Design: full-bleed blu iOS (#0a84ff) + griglia 2×2 di tile bianchi
 * arrotondati (le 4 tab: Scuola, Routine, Nutrizione, Wallet).
 * Supersampling 2× per anti-aliasing.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ── PNG encoder minimale ──
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // Scanlines con filter byte 0
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ── Disegno ──
const BLUE = [0x0a, 0x84, 0xff];
const WHITE = [0xff, 0xff, 0xff];

/** SDF di un rettangolo arrotondato centrato. */
function roundedRectSDF(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function render(size) {
  const S = 2; // supersampling
  const W = size * S;
  const buf = Buffer.alloc(size * size * 4);
  const scale = W / 512; // coordinate di riferimento 512

  // Layout (riferimento 512): griglia 336×336 centrata, tile 150, gap 36, raggio 34
  const total = 336 * scale;
  const tile = 150 * scale;
  const gap = 36 * scale;
  const radius = 40 * scale;
  const start = (W - total) / 2;
  const centers = [
    [start + tile / 2, start + tile / 2],
    [start + tile + gap + tile / 2, start + tile / 2],
    [start + tile / 2, start + tile + gap + tile / 2],
    [start + tile + gap + tile / 2, start + tile + gap + tile / 2],
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const px = x * S + sx + 0.5;
          const py = y * S + sy + 0.5;
          let color = BLUE;
          for (const [cx, cy] of centers) {
            if (roundedRectSDF(px, py, cx, cy, tile / 2, tile / 2, radius) <= 0) {
              color = WHITE;
              break;
            }
          }
          r += color[0];
          g += color[1];
          b += color[2];
        }
      }
      const n = S * S;
      const idx = (y * size + x) * 4;
      buf[idx] = Math.round(r / n);
      buf[idx + 1] = Math.round(g / n);
      buf[idx + 2] = Math.round(b / n);
      buf[idx + 3] = 255; // opaco (necessario per maskable/apple-touch)
    }
  }
  return encodePNG(size, size, buf);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-512.png', render(512));
writeFileSync('public/icons/icon-192.png', render(192));
writeFileSync('public/icons/apple-touch-icon.png', render(180));
console.log('✅ Icone generate: icon-192.png, icon-512.png, apple-touch-icon.png');
