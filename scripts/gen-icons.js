/*
 * Generate PWA icons with no image dependencies — a brand-green square with a
 * white dumbbell glyph, encoded as valid PNG via zlib. Maskable-safe (the glyph
 * sits within the inner 80%).
 *
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/apple-touch-icon.png (180)
 *
 * Run:  node scripts/gen-icons.js
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

const BG = [5, 150, 105]; // brand-600
const FG = [255, 255, 255];

function inRect(x, y, x0, y0, x1, y1) {
  return x >= x0 && x < x1 && y >= y0 && y < y1;
}

// Draw a dumbbell: handle + two plates, all proportional to size.
function isGlyph(x, y, s) {
  const handle = inRect(x, y, 0.30 * s, 0.455 * s, 0.70 * s, 0.545 * s);
  const lPlate = inRect(x, y, 0.235 * s, 0.36 * s, 0.32 * s, 0.64 * s);
  const rPlate = inRect(x, y, 0.68 * s, 0.36 * s, 0.765 * s, 0.64 * s);
  const lCap = inRect(x, y, 0.20 * s, 0.41 * s, 0.245 * s, 0.59 * s);
  const rCap = inRect(x, y, 0.755 * s, 0.41 * s, 0.80 * s, 0.59 * s);
  return handle || lPlate || rPlate || lCap || rCap;
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
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  // 10,11,12 = 0 (compression/filter/interlace)
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
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];
for (const [name, size] of out) {
  fs.writeFileSync(path.join(ICON_DIR, name), makePng(size));
  console.log(`wrote public/icons/${name} (${size}x${size})`);
}
