import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => fs.readFileSync(path.resolve(p), "utf8");

describe("fixed light theme", () => {
  const css = read("src/app/globals.css");

  it("does not switch tokens on the OS/browser colour scheme", () => {
    expect(css).not.toMatch(/prefers-color-scheme\s*:\s*dark/);
    expect(css).toMatch(/color-scheme:\s*light/);
  });

  it("makes dark: utilities inert instead of tied to the system preference", () => {
    expect(css).toMatch(/@custom-variant dark \(&:where\(\[data-fs-never-dark\]/);
  });

  it("keeps the deliberately dark ink band and intro palette tokens", () => {
    expect(css).toMatch(/--fs-ink:\s*#0E2B22/i);
    expect(css).toMatch(/\.fs-ink-band\s*\{[^}]*background:\s*var\(--fs-ink\)/);
    expect(css).toMatch(/html\[data-fs-intro="pending"\] body::before/);
  });

  it("declares a light colour scheme to the browser from the root layout", () => {
    expect(read("src/app/layout.tsx")).toMatch(/colorScheme:\s*"light"/);
  });
});

describe("Permissions-Policy", () => {
  const config = read("next.config.ts");

  it("allows geolocation for the same origin only and keeps camera and microphone blocked", () => {
    const value = config.match(/value:\s*"(camera=\(\)[^"]*)"/)![1];
    expect(value).toBe("camera=(), microphone=(), geolocation=(self)");
    expect(value).not.toMatch(/geolocation=\(\*\)|geolocation=\*/);
  });

  it("never asks for the device location on page load", () => {
    const selector = read("src/components/listings/DiscoveryLocationSelector.tsx");
    const calls = selector.match(/navigator\.geolocation\.getCurrentPosition/g) ?? [];
    expect(calls).toHaveLength(1);
    const idx = selector.indexOf("navigator.geolocation.getCurrentPosition");
    const enclosing = selector.slice(Math.max(0, idx - 700), idx);
    expect(enclosing).not.toMatch(/useEffect\(/);
  });
});
