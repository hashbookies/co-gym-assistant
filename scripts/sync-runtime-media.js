/*
 * Copy all home-suitable exercise media into /public/runtime-media so Next can serve it statically and deploy safely to Vercel.
 *
 * Run:  node scripts/sync-runtime-media.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LIBRARY_PATH = path.join(ROOT, "data", "exercises.tagged.json");
const SRC_IMAGES = path.join(ROOT, "images");
const SRC_VIDEOS = path.join(ROOT, "videos");
const DEST_IMAGES = path.join(ROOT, "public", "runtime-media", "images");
const DEST_VIDEOS = path.join(ROOT, "public", "runtime-media", "videos");

if (!fs.existsSync(LIBRARY_PATH)) {
  console.error(`Error: exercises.tagged.json not found at ${LIBRARY_PATH}`);
  process.exit(1);
}

const library = JSON.parse(fs.readFileSync(LIBRARY_PATH, "utf8"));

// Collect all unique image and video/gif filenames
const uniqueImages = new Set();
const uniqueVideos = new Set();

for (const ex of library) {
  if (ex.image) {
    uniqueImages.add(path.basename(ex.image));
  }
  if (ex.gifUrl) {
    uniqueVideos.add(path.basename(ex.gifUrl));
  }
}

// Clean and recreate destination directories to prevent stale untracked assets
fs.rmSync(DEST_IMAGES, { recursive: true, force: true });
fs.rmSync(DEST_VIDEOS, { recursive: true, force: true });
fs.mkdirSync(DEST_IMAGES, { recursive: true });
fs.mkdirSync(DEST_VIDEOS, { recursive: true });

let copiedImages = 0;
let copiedVideos = 0;
let missingImages = 0;
let missingVideos = 0;

// Copy unique images
for (const filename of uniqueImages) {
  const srcPath = path.join(SRC_IMAGES, filename);
  const destPath = path.join(DEST_IMAGES, filename);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    copiedImages++;
  } else {
    console.warn(`Warning: Missing source image: ${filename}`);
    missingImages++;
  }
}

// Copy unique videos (gifs)
for (const filename of uniqueVideos) {
  const srcPath = path.join(SRC_VIDEOS, filename);
  const destPath = path.join(DEST_VIDEOS, filename);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    copiedVideos++;
  } else {
    console.warn(`Warning: Missing source video: ${filename}`);
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
console.log(`Unique images to copy: ${uniqueImages.size}`);
console.log(`Unique videos to copy: ${uniqueVideos.size}`);
console.log(`Copied images: ${copiedImages}`);
console.log(`Copied videos: ${copiedVideos}`);
console.log(`Missing images: ${missingImages}`);
console.log(`Missing videos: ${missingVideos}`);
console.log(`Total output size: ${totalSizeMB} MB (${totalSizeB} bytes)`);

