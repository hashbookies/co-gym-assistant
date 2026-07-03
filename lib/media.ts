/**
 * Pure media helper utilities for resolving local public paths, curated runtime fallbacks, and remote URLs.
 */

export function isRemoteMedia(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://");
}

export function toRuntimeMediaPath(src: string, kind: "image" | "video"): string {
  // Extract filename
  const parts = src.split(/[/\\]/);
  const filename = parts[parts.length - 1];
  
  if (!filename) return "";
  
  const subfolder = kind === "image" ? "images" : "videos";
  return `/runtime-media/${subfolder}/${filename}`;
}

export function getMediaCandidates(src: string | undefined, kind: "image" | "video"): string[] {
  if (!src) return [];

  // If it's already a remote URL, use it directly (no local fallbacks needed)
  if (isRemoteMedia(src)) {
    return [src];
  }

  // 1. Curated runtime media path (deploy-safe, preferred first)
  const runtimePath = toRuntimeMediaPath(src, kind);

  // 2. Full local public media path (e.g. /images/... or /videos/...), normalized with a leading slash
  const localPath = src.startsWith("/") ? src : `/${src}`;

  const candidates: string[] = [];
  if (runtimePath) {
    candidates.push(runtimePath);
  }
  candidates.push(localPath);

  return candidates;
}
