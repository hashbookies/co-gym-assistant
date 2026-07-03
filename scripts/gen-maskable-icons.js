/*
 * Generate dedicated MASKABLE PWA icons with no image dependencies — the same
 * brand-green square + white dumbbell glyph as gen-icons.js, but the glyph is
 * inset into the central ~66% so Android launcher masks (which can crop to a
 * circle as small as 80% of the icon) never clip it. Full-bleed green
 * background means no transparent corners show through any mask shape.
 *
 *   public/icons/maskable-icon-192.png
 *   public/icons/maskable-icon-512.png
 *
 * Run:  node scripts/gen-maskable-icons.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const ICON_DIR = path.resolve(__dirname, "..", "public", "icons");

// CRC32 (for PNG chunks)
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
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const BG = [5, 150, 105]; // brand-600, matches the existing icon set
const FG = [255, 255, 255];

// Glyph occupies the central SAFE fraction of the icon; the rest is padding.
// 0.66 keeps all content inside the 80% maskable safe zone with margin.
const SAFE = 0.66;

function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x < x1 && y >= y0 && y < y1;
}

// Draw a dumbbell in a local s-sized coordinate space (same proportions as
// gen-icons.js so the maskable and regular icons read as the same mark).
function isGlyphLocal(lx, ly, s) {
  const handle = inRect(lx, ly, 0.30 * s, 0.455 * s, 0.70 * s, 0.545 * s);
  const lPlate = inRect(lx, ly, 0.235 * s, 0.36 * s, 0.32 * s, 0.64 * s);
  const rPlate = inRect(lx, ly, 0.68 * s, 0.36 * s, 0.765 * s, 0.64 * s);
  const lCap = inRect(lx, ly, 0.20 * s, 0.41 * s, 0.245 * s, 0.59 * s);
  const rCap = inRect(lx, ly, 0.755 * s, 0.41 * s, 0.80 * s, 0.59 * s);
  return handle || lPlate || rPlate || lCap || rCap;
}

// Map full-icon (x,y) into the inset glyph space, then test the glyph.
function isGlyph(x, y, size) {
  const inset = ((1 - SAFE) / 2) * size;
  const lx = (x - inset) / SAFE;
  const ly = (y - inset) / SAFE;
  if (lx < 0 || ly < 0 || lx >= size || ly >= size) return false;
  return isGlyphLocal(lx, ly, size);
}

function makePng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = isGlyph(x, y, size) ? FG : BG;
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(ICON_DIR, { recursive: true });
const out = [
  ["maskable-icon-192.png", 192],
  ["maskable-icon-512.png", 512],
];
for (const [name, size] of out) {
  fs.writeFileSync(path.join(ICON_DIR, name), makePng(size));
  console.log(`wrote public/icons/${name} (${size}x${size}, maskable safe area ${SAFE * 100}%)`);
}
