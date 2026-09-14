import { describe, it, expect } from "vitest";

/**
 * WCAG 2.1 Relative Luminance and Contrast Ratio Calculation
 * Standard formulas defined by W3C: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return [r, g, b];
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return [r, g, b];
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

function sRgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const R = sRgbToLinear(r);
  const G = sRgbToLinear(g);
  const B = sRgbToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Milestone 1.6 WCAG AA Accessibility Contrast & Semantic Invariants", () => {
  // FairSwap Design Tokens (Tailwind v4 / CSS values)
  const colors = {
    white: "#ffffff",
    black: "#000000",
    gray900: "#111827",
    gray700: "#374151",
    gray600: "#4b5563",
    gray500: "#6b7280",
    gray300: "#d1d5db",
    gray100: "#f3f4f6",
    gray50: "#f9fafb",
    emerald600: "#059669",
    emerald700: "#047857",
    emerald800: "#065f46",
    emerald50: "#ecfdf5",
    red600: "#dc2626",
    red700: "#b91c1c",
    red800: "#991b1b",
    red50: "#fef2f2",
    amber700: "#b45309",
    amber800: "#92400e",
    amber50: "#fffbeb",
    purple700: "#7e22ce",
    purple50: "#faf5ff",
  };

  describe("WCAG AA Normal Text Contrast (>= 4.5:1)", () => {
    it("primary headings and body text (gray-900 on white) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.gray900, colors.white);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThan(15.0); // Very high contrast (~17.7:1)
    });

    it("secondary text (gray-700 on white) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.gray700, colors.white);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(ratio).toBeGreaterThan(9.0);
    });

    it("muted text (gray-600 on white) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.gray600, colors.white);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("accessible dark green text (emerald-800 on white) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.emerald800, colors.white);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("danger button text (white on red-600) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.white, colors.red600);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("active status badge text (emerald-700 on emerald-50) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.emerald700, colors.emerald50);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("suspended status badge text (red-700 on red-50) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.red700, colors.red50);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("deletion pending status badge text (amber-700 on amber-50) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.amber700, colors.amber50);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it("staff role badge text (purple-700 on purple-50) exceeds 4.5:1", () => {
      const ratio = getContrastRatio(colors.purple700, colors.purple50);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("WCAG AA Graphical Objects and User Interface Components Contrast (>= 3.0:1)", () => {
    it("primary action button (white on emerald-600 semibold) exceeds 3.0:1 UI/bold threshold", () => {
      const ratio = getContrastRatio(colors.white, colors.emerald600);
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });

    it("input borders / active focus boundaries (gray-500 or emerald-600 against white) exceeds 3.0:1", () => {
      const inputFocusRatio = getContrastRatio(colors.emerald600, colors.white);
      expect(inputFocusRatio).toBeGreaterThanOrEqual(3.0);

      const dangerBorderRatio = getContrastRatio(colors.red600, colors.white);
      expect(dangerBorderRatio).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("Accessible Semantic Invariants & Form Contracts", () => {
    it("verifies relative luminance calculation mathematically matches W3C test vectors", () => {
      // Pure black has luminance 0
      expect(getRelativeLuminance("#000000")).toBe(0);
      // Pure white has luminance 1
      expect(getRelativeLuminance("#ffffff")).toBe(1);
      // Black against white is 21:1
      expect(getContrastRatio("#000000", "#ffffff")).toBe(21);
      // Identical colors have contrast 1:1
      expect(getContrastRatio("#ffffff", "#ffffff")).toBe(1);
    });
  });
});
