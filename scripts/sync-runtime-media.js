/*
 * Copy only the 65 curated MVP pool exercise media into /public/runtime-media so Next can serve it statically and deploy safely to Vercel.
 *
 * Run:  node scripts/sync-runtime-media.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MVP_POOL_PATH = path.join(ROOT, "data", "mvp-pool.json");
const SRC_IMAGES = path.join(ROOT, "images");
const SRC_VIDEOS = path.join(ROOT, "videos");
const DEST_IMAGES = path.join(ROOT, "public", "runtime-media", "images");
const DEST_VIDEOS = path.join(ROOT, "public", "runtime-media", "videos");

if (!fs.existsSync(MVP_POOL_PATH)) {
  console.error(`Error: mvp-pool.json not found at ${MVP_POOL_PATH}`);
  process.exit(1);
}

const pool = JSON.parse(fs.readFileSync(MVP_POOL_PATH, "utf8"));

// Create directories
fs.mkdirSync(DEST_IMAGES, { recursive: true });
fs.mkdirSync(DEST_VIDEOS, { recursive: true });

let copiedImages = 0;
let copiedVideos = 0;
let missingImages = 0;
let missingVideos = 0;

for (const ex of pool) {
  // Handle image
  if (ex.image) {
    const filename = path.basename(ex.image);
    const srcPath = path.join(SRC_IMAGES, filename);
    const destPath = path.join(DEST_IMAGES, filename);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      copiedImages++;
    } else {
      console.warn(`Warning: Missing source image: ${filename}`);
      missingImages++;
    }
  } else {
    missingImages++;
  }

  // Handle video (gif)
  if (ex.gif) {
    const filename = path.basename(ex.gif);
    const srcPath = path.join(SRC_VIDEOS, filename);
    const destPath = path.join(DEST_VIDEOS, filename);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      copiedVideos++;
    } else {
      console.warn(`Warning: Missing source video: ${filename}`);
      missingVideos++;
    }
  } else {
    missingVideos++;
  }
}

// Calculate total size of public/runtime-media
function getDirSize(dirPath) {
  let size = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isFile()) {
      size += stats.size;
    } else if (stats.isDirectory()) {
      size += getDirSize(filePath);
    }
  }
  return size;
}

const totalSizeB = getDirSize(path.join(ROOT, "public", "runtime-media"));
const totalSizeMB = (totalSizeB / (1024 * 1024)).toFixed(2);

console.log(`Sync runtime media completed.`);
console.log(`Copied images: ${copiedImages}`);
console.log(`Copied videos: ${copiedVideos}`);
console.log(`Missing images: ${missingImages}`);
console.log(`Missing videos: ${missingVideos}`);
console.log(`Total output size: ${totalSizeMB} MB (${totalSizeB} bytes)`);
