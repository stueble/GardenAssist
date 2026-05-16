import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a legible text color for a given background color using the
 * WCAG 2.1 relative-luminance formula (weights: R 0.2126, G 0.7152, B 0.0722).
 *
 * Returns "#1e2e1e" (dark) for light backgrounds and "white" for dark ones.
 * Falls back to "white" for non-hex values (e.g. CSS variables).
 */
export function textColorForBackground(hex: string): "#1e2e1e" | "white" {
  // Normalise: accept #rgb and #rrggbb
  const raw = hex.trim().replace(/^#/, "");
  let r: number, g: number, b: number;

  if (raw.length === 3) {
    r = parseInt(raw[0] + raw[0], 16);
    g = parseInt(raw[1] + raw[1], 16);
    b = parseInt(raw[2] + raw[2], 16);
  } else if (raw.length === 6) {
    r = parseInt(raw.slice(0, 2), 16);
    g = parseInt(raw.slice(2, 4), 16);
    b = parseInt(raw.slice(4, 6), 16);
  } else {
    // CSS variable or unknown format — assume dark background
    return "white";
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) return "white";

  // Linearise sRGB channels
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

  // WCAG threshold: luminance > 0.179 → use dark text
  return L > 0.179 ? "#1e2e1e" : "white";
}
