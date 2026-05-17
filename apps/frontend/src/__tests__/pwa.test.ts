/**
 * PWA setup tests.
 *
 * Verifies that the Web App Manifest and index.html contain all required
 * PWA fields so the app is installable and behaves correctly on mobile.
 *
 * We read the files directly — no browser rendering needed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const publicDir = resolve(__dirname, "../../public");

const manifest = JSON.parse(
  readFileSync(resolve(publicDir, "manifest.webmanifest"), "utf-8")
);

const html = readFileSync(resolve(__dirname, "../../index.html"), "utf-8");

describe("Web App Manifest", () => {
  it("has a non-empty name", () => {
    expect(typeof manifest.name).toBe("string");
    expect(manifest.name.length).toBeGreaterThan(0);
  });

  it("has a non-empty short_name", () => {
    expect(typeof manifest.short_name).toBe("string");
    expect(manifest.short_name.length).toBeGreaterThan(0);
  });

  it("sets display to standalone", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("has a theme_color matching the deep green brand color", () => {
    expect(manifest.theme_color).toBe("#2d4a2d");
  });

  it("has a background_color matching the warm white brand color", () => {
    expect(manifest.background_color).toBe("#fdfbf8");
  });

  it("defines a start_url", () => {
    expect(manifest.start_url).toBe("/");
  });

  it("includes a 192x192 icon", () => {
    const icon192 = manifest.icons?.find(
      (i: { sizes: string }) => i.sizes === "192x192"
    );
    expect(icon192).toBeDefined();
    expect(icon192.type).toBe("image/png");
  });

  it("includes a 512x512 icon", () => {
    const icon512 = manifest.icons?.find(
      (i: { sizes: string }) => i.sizes === "512x512"
    );
    expect(icon512).toBeDefined();
    expect(icon512.type).toBe("image/png");
  });

  it("192x192 icon file exists in public/", () => {
    const icon192 = manifest.icons?.find(
      (i: { sizes: string }) => i.sizes === "192x192"
    );
    const iconPath = resolve(publicDir, icon192.src.replace(/^\//, ""));
    expect(existsSync(iconPath)).toBe(true);
  });

  it("512x512 icon file exists in public/", () => {
    const icon512 = manifest.icons?.find(
      (i: { sizes: string }) => i.sizes === "512x512"
    );
    const iconPath = resolve(publicDir, icon512.src.replace(/^\//, ""));
    expect(existsSync(iconPath)).toBe(true);
  });
});

describe("index.html — PWA meta tags", () => {
  it("links to the web app manifest", () => {
    expect(html).toContain('rel="manifest"');
    expect(html).toContain("manifest.webmanifest");
  });

  it("has a theme-color meta tag matching the brand color", () => {
    expect(html).toContain('name="theme-color"');
    expect(html).toContain("#2d4a2d");
  });

  it("has apple-mobile-web-app-capable meta tag", () => {
    expect(html).toContain('name="apple-mobile-web-app-capable"');
  });

  it("has apple-mobile-web-app-title meta tag", () => {
    expect(html).toContain('name="apple-mobile-web-app-title"');
  });

  it("has apple-touch-icon link", () => {
    expect(html).toContain('rel="apple-touch-icon"');
    expect(html).toContain("apple-touch-icon.png");
  });
});
