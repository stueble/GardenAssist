/**
 * Design token tests.
 *
 * Verifies that all required design tokens are defined in index.css.
 * These tests check that no token was accidentally omitted during edits.
 *
 * We read the CSS source directly — no browser rendering needed.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const css = readFileSync(
  resolve(__dirname, "../index.css"),
  "utf-8"
);

const requiredColors = [
  // Brand greens
  "green-deep", "green-mid", "green-light", "green-pale", "green-mist",
  // Neutrals
  "cream", "warm-white", "bark", "bark-light",
  // Semantic
  "red-warn", "red-soft", "yellow-warn", "yellow-soft", "blue-mid", "blue-soft",
  // Text
  "text-dark", "text-mid", "text-light",
  // Structural
  "border",
  // Schedule
  "sc-bloom", "sc-growth", "sc-foliage", "sc-prune", "sc-fertilize", "sc-misc",
];

const requiredFonts = ["display", "body"];
const requiredShadows = ["shadow-ga", "shadow-ga-lg"];
const requiredRadii = ["radius-sm", "radius-md", "radius-lg", "radius-xl", "radius-full"];

describe("Design tokens — @theme block", () => {
  it("contains an @theme block", () => {
    expect(css).toContain("@theme");
  });

  describe("Colors", () => {
    for (const token of requiredColors) {
      it(`defines --color-${token}`, () => {
        expect(css).toContain(`--color-${token}:`);
      });
    }
  });

  describe("Fonts", () => {
    for (const token of requiredFonts) {
      it(`defines --font-${token}`, () => {
        expect(css).toContain(`--font-${token}:`);
      });
    }

    it("imports Playfair Display from Google Fonts", () => {
      expect(css).toContain("Playfair+Display");
    });

    it("imports DM Sans from Google Fonts", () => {
      expect(css).toContain("DM+Sans");
    });
  });

  describe("Shadows", () => {
    for (const token of requiredShadows) {
      it(`defines --${token}`, () => {
        expect(css).toContain(`--${token}:`);
      });
    }
  });

  describe("Border radius", () => {
    for (const token of requiredRadii) {
      it(`defines --${token}`, () => {
        expect(css).toContain(`--${token}:`);
      });
    }
  });
});
