import { describe, it, expect } from "vitest";
import { isRemoteMedia, toRuntimeMediaPath, getMediaCandidates } from "@/lib/media";

describe("media helper library", () => {
  describe("isRemoteMedia", () => {
    it("returns true for http and https URLs", () => {
      expect(isRemoteMedia("http://example.com/image.jpg")).toBe(true);
      expect(isRemoteMedia("https://example.com/video.gif")).toBe(true);
    });

    it("returns false for relative/local paths", () => {
      expect(isRemoteMedia("/images/0001.jpg")).toBe(false);
      expect(isRemoteMedia("images/0001.jpg")).toBe(false);
      expect(isRemoteMedia("videos/0001.gif")).toBe(false);
    });
  });

  describe("toRuntimeMediaPath", () => {
    it("converts local paths to runtime-media paths for images", () => {
      expect(toRuntimeMediaPath("images/0001-abc.jpg", "image")).toBe("/runtime-media/images/0001-abc.jpg");
      expect(toRuntimeMediaPath("/images/sub/0001-abc.jpg", "image")).toBe("/runtime-media/images/0001-abc.jpg");
    });

    it("converts local paths to runtime-media paths for videos", () => {
      expect(toRuntimeMediaPath("videos/0001-abc.gif", "video")).toBe("/runtime-media/videos/0001-abc.gif");
      expect(toRuntimeMediaPath("/videos/sub/0001-abc.gif", "video")).toBe("/runtime-media/videos/0001-abc.gif");
    });
  });

  describe("getMediaCandidates", () => {
    it("returns empty array for empty source", () => {
      expect(getMediaCandidates(undefined, "image")).toEqual([]);
      expect(getMediaCandidates("", "image")).toEqual([]);
    });

    it("returns only the remote URL if the source is remote", () => {
      const src = "https://example.com/test.gif";
      expect(getMediaCandidates(src, "video")).toEqual([src]);
    });

    it("returns runtime-media path first and local path second for local sources", () => {
      expect(getMediaCandidates("images/0001-abc.jpg", "image")).toEqual([
        "/runtime-media/images/0001-abc.jpg",
        "/images/0001-abc.jpg",
      ]);

      expect(getMediaCandidates("/videos/0001-abc.gif", "video")).toEqual([
        "/runtime-media/videos/0001-abc.gif",
        "/videos/0001-abc.gif",
      ]);
    });
  });
});
