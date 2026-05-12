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
const css = readFileSync(resolve(__dirname, "../index.css"), "utf-8");
// Fonts are loaded via <link> in index.html (not in CSS)
const html = readFileSync(resolve(__dirname, "../../index.html"), "utf-8");
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
const requiredFontSizes = ["font-size-logo", "font-size-nav", "font-size-nav-lang"];
const requiredLayout = ["height-nav", "width-nav-logo"];
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
        it("imports Playfair Display from Google Fonts (via index.html <link>)", () => {
            expect(html).toContain("Playfair+Display");
        });
        it("imports DM Sans from Google Fonts (via index.html <link>)", () => {
            expect(html).toContain("DM+Sans");
        });
        it("loads correct font weights for Playfair Display (400, 600, italic 400)", () => {
            expect(html).toContain("0,400;0,600;1,400");
        });
        it("loads correct font weights for DM Sans (300, 400, 500)", () => {
            expect(html).toContain("wght@300;400;500");
        });
    });
    describe("Font sizes", () => {
        for (const token of requiredFontSizes) {
            it(`defines --${token}`, () => {
                expect(css).toContain(`--${token}:`);
            });
        }
    });
    describe("Layout", () => {
        for (const token of requiredLayout) {
            it(`defines --${token}`, () => {
                expect(css).toContain(`--${token}:`);
            });
        }
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
