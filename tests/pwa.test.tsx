// @vitest-environment jsdom
// PWA enhancement: manifest correctness, maskable icon presence, and safe
// service-worker registration. No install-prompt / browser-behavior tests —
// those are environment-dependent and fragile.
import { describe, it, expect, vi, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { render, cleanup } from "@testing-library/react";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const ROOT = process.cwd();
const manifest = JSON.parse(
  readFileSync(join(ROOT, "public", "manifest.webmanifest"), "utf8"),
);

// ---- Manifest ---------------------------------------------------------------

describe("web app manifest", () => {
  it("parses as valid JSON with the expected identity fields", () => {
    expect(manifest.name).toBe("Co-Gym Assistant");
    expect(manifest.short_name).toBe("Co-Gym");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.orientation).toBe("portrait");
    expect(manifest.theme_color).toBe("#2f6f4e");
    expect(manifest.background_color).toBe("#f7f5f2");
  });

  it("declares the required app categories", () => {
    expect(manifest.categories).toEqual(
      expect.arrayContaining(["health", "fitness", "productivity"]),
    );
  });

  it("includes regular (any) icons at 192 and 512", () => {
    const anyIcons = manifest.icons.filter((i: { purpose: string }) => i.purpose === "any");
    const sizes = anyIcons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("includes dedicated maskable icons at 192 and 512", () => {
    const maskable = manifest.icons.filter((i: { purpose: string }) => i.purpose === "maskable");
    const sizes = maskable.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    // maskable icons must be their own files, not the "any" ones re-purposed
    for (const i of maskable) expect(i.src).toMatch(/maskable-icon-\d+\.png$/);
  });

  it("has no icon marked 'any maskable' (that anti-pattern was the bug being fixed)", () => {
    for (const i of manifest.icons) {
      expect(i.purpose === "any" || i.purpose === "maskable").toBe(true);
    }
  });
});

// ---- Icon files on disk -----------------------------------------------------

describe("PWA icon files exist", () => {
  it.each([
    "icons/icon-192.png",
    "icons/icon-512.png",
    "icons/maskable-icon-192.png",
    "icons/maskable-icon-512.png",
  ])("public/%s is present", (rel) => {
    expect(existsSync(join(ROOT, "public", rel))).toBe(true);
  });
});

// ---- Service worker registration -------------------------------------------

describe("ServiceWorkerRegister", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    // remove any serviceWorker stub between tests
    if ("serviceWorker" in navigator) {
      // @ts-expect-error test cleanup of an ad-hoc stub
      delete navigator.serviceWorker;
    }
  });

  it("renders nothing and does not crash when serviceWorker is unsupported", () => {
    if ("serviceWorker" in navigator) {
      // @ts-expect-error ensure the API is absent for this case
      delete navigator.serviceWorker;
    }
    const { container } = render(<ServiceWorkerRegister />);
    // firing load must not throw even though registration is impossible
    expect(() => window.dispatchEvent(new Event("load"))).not.toThrow();
    expect(container.innerHTML).toBe("");
  });

  it("attempts to register /sw.js when supported and in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });

    render(<ServiceWorkerRegister />);
    window.dispatchEvent(new Event("load"));

    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("does not register outside production even when supported", () => {
    vi.stubEnv("NODE_ENV", "development");
    const register = vi.fn().mockResolvedValue({});
    Object.defineProperty(navigator, "serviceWorker", { value: { register }, configurable: true });

    render(<ServiceWorkerRegister />);
    window.dispatchEvent(new Event("load"));

    expect(register).not.toHaveBeenCalled();
  });
});
