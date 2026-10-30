import { describe, expect, it } from "vitest";
import { PALETTES } from "@/lib/home-intro/palettes";
import { MOTIFS } from "@/lib/home-intro/motifs";
import { MOTIF_FAMILIES, MOTIF_FAMILY_IDS } from "@/lib/home-intro/motif-families";
import { TAGLINES } from "@/lib/home-intro/taglines";
import { GREETING_CANDIDATES } from "@/lib/home-intro/greetings";
import {
  DISTINCT_GREETINGS, GREETINGS_SHOWN, HERO_GREETING, MAX_MOTIFS, SPEED, TIMING, centerBand, chooseFamily, chooseGreetings, chooseTheme,
  createTaglineBag, deviceForWidth, greetingFontSize, layoutMotifs, motifSize, mulberry32, normaliseGreeting, overlaps,
} from "@/lib/home-intro/selectors";

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const VIEWPORTS: [number, number][] = [[320, 568], [360, 740], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 720], [1440, 900]];

describe("locked V19 data", () => {
  it("has the 8 exact palettes", () => {
    expect(PALETTES.map((p) => p.id)).toEqual(["midnight", "lavender", "sage", "peach", "blue", "orchid", "sandstone", "monsoon"]);
    expect(PALETTES.map((p) => p.label.replace(/^\d+ — /, ""))).toEqual(["Royal Midnight", "Lavender Haze", "Sage Atelier", "Rose Sand", "Powder Blue", "Moonlit Orchid", "Sandstone Heritage", "Monsoon Teal"]);
    expect(PALETTES[0]).toMatchObject({ bg: "#0b1526", bg2: "#1a2c45", accent: "#f8bc80", text: "#faf1e7", art: "#dfa977" });
    expect(PALETTES[7]).toMatchObject({ bg: "#153D49", bg2: "#386C78", accent: "#BCE4DB", text: "#F0F9F7", art: "#AAD6E5" });
  });

  it("has 87 unique motifs, three families with the approved sizes, and no missing pool keys", () => {
    expect(Object.keys(MOTIFS)).toHaveLength(87);
    expect(new Set(Object.values(MOTIFS)).size).toBe(87);
    expect(MOTIF_FAMILY_IDS).toEqual(["mixed", "india", "items"]);
    expect(Object.fromEntries(MOTIF_FAMILY_IDS.map((f) => [f, MOTIF_FAMILIES[f].length]))).toEqual({ mixed: 72, india: 55, items: 30 });
    for (const family of MOTIF_FAMILY_IDS) {
      expect(new Set(MOTIF_FAMILIES[family]).size).toBe(MOTIF_FAMILIES[family].length);
      for (const key of MOTIF_FAMILIES[family]) expect(MOTIFS[key], `${family}:${key}`).toBeTruthy();
    }
  });

  it("has exactly the four approved taglines", () => {
    expect(TAGLINES).toEqual([
      "India’s marketplace. Buy, sell, exchange and share.",
      "India’s marketplace. Fairer ways to buy and sell.",
      "India’s marketplace. Local deals, fair exchanges.",
      "India’s marketplace. Reuse more, waste less.",
    ]);
  });

  it("keeps the prototype greeting inventory: 22 candidates, 17 distinct visible strings", () => {
    expect(GREETING_CANDIDATES).toHaveLength(22);
    expect(DISTINCT_GREETINGS).toHaveLength(17);
  });

  it("keeps the Faster speed preset and the prototype step timings", () => {
    expect(SPEED).toBe(0.75);
    expect(TIMING.first).toBe(203);
    expect(TIMING.gap).toBe(79);
    expect(TIMING.leave).toBeCloseTo(56.25, 2);
  });
});

describe("random selection", () => {
  it("always starts with नमस्ते exactly once, then 14 distinct visible strings (15 total)", () => {
    for (const seed of SEEDS) {
      const list = chooseGreetings(mulberry32(seed));
      expect(list).toHaveLength(GREETINGS_SHOWN);
      expect(list[0].text).toBe(HERO_GREETING);
      expect(list.filter((g) => g.text === HERO_GREETING)).toHaveLength(1);
      expect(new Set(list.map((g) => normaliseGreeting(g.text))).size).toBe(15);
    }
  });

  it("varies the greeting subset and order between sessions", () => {
    const signatures = new Set(SEEDS.map((seed) => chooseGreetings(mulberry32(seed)).map((g) => g.lang).join(",")));
    expect(signatures.size).toBeGreaterThan(50);
  });

  it("selects palette, motif family and tagline independently: every combination is reachable", () => {
    const rng = mulberry32(7);
    const seen = new Set<string>();
    for (let i = 0; i < 6000; i++) {
      const theme = chooseTheme(rng).id;
      const family = chooseFamily(rng);
      const tagline = TAGLINES[Math.floor(rng() * TAGLINES.length)];
      seen.add(`${theme}|${family}|${tagline}`);
    }
    expect(seen.size).toBe(PALETTES.length * MOTIF_FAMILY_IDS.length * TAGLINES.length);
  });

  it("deals taglines from a shuffle bag: no repeat until all four have been used", () => {
    const next = createTaglineBag(mulberry32(3));
    for (let round = 0; round < 5; round++) {
      const drawn = [next(), next(), next(), next()];
      expect(new Set(drawn).size).toBe(4);
      drawn.forEach((t) => expect(TAGLINES).toContain(t));
    }
  });
});

describe("responsive composition", () => {
  it("uses three distinct compositions by width", () => {
    expect([320, 430, 639].map(deviceForWidth)).toEqual(["mobile", "mobile", "mobile"]);
    expect([640, 768, 1023].map(deviceForWidth)).toEqual(["tablet", "tablet", "tablet"]);
    expect([1024, 1280, 1440].map(deviceForWidth)).toEqual(["desktop", "desktop", "desktop"]);
  });

  it("adjusts the greeting size for long strings like the prototype", () => {
    const long = "x".repeat(13), medium = "x".repeat(10);
    expect(greetingFontSize("mobile", long)).toBe("clamp(20px,5.1vw,27px)");
    expect(greetingFontSize("mobile", medium)).toBe("clamp(22px,5.9vw,31px)");
    expect(greetingFontSize("tablet", long)).toBe("38px");
    expect(greetingFontSize("tablet", medium)).toBe("");
    expect(greetingFontSize("desktop", long)).toBe("");
    expect(greetingFontSize("mobile", "سلام")).toBe("");
  });
});

describe("motif layout", () => {
  for (const [width, height] of VIEWPORTS) {
    const device = deviceForWidth(width);
    it(`${width}x${height} (${device}): no motif overlaps another, the greeting zone, or the viewport edge (2px float envelope included)`, () => {
      const size = motifSize(device, width);
      const band = centerBand(device, width, height);
      for (const family of MOTIF_FAMILY_IDS) {
        for (const seed of SEEDS.slice(0, 40)) {
          const placed = layoutMotifs(family, device, width, height, mulberry32(seed * 31 + width));
          expect(placed.length).toBeLessThanOrEqual(MAX_MOTIFS[device]);
          expect(placed.length).toBeGreaterThan(0);
          expect(new Set(placed.map((m) => m.kind)).size).toBe(placed.length); // never the same icon twice in one playback
          placed.forEach((m) => expect(MOTIF_FAMILIES[family]).toContain(m.kind));
          const boxes = placed.map((m) => ({ left: m.x - size / 2 - 2, right: m.x + size / 2 + 2, top: m.y - size / 2 - 2, bottom: m.y + size / 2 + 2 }));
          boxes.forEach((b, i) => {
            expect(overlaps(b, band), `zone ${family} seed ${seed} #${i}`).toBe(false);
            expect(b.left).toBeGreaterThanOrEqual(0);
            expect(b.top).toBeGreaterThanOrEqual(0);
            expect(b.right).toBeLessThanOrEqual(width);
            expect(b.bottom).toBeLessThanOrEqual(height);
            for (let j = i + 1; j < boxes.length; j++) expect(overlaps(b, boxes[j]), `pair ${family} seed ${seed} ${i}/${j}`).toBe(false);
          });
        }
      }
    });
  }

  it("scatters rather than aligning in rows or columns, and differs between replays", () => {
    const a = layoutMotifs("mixed", "desktop", 1280, 720, mulberry32(1));
    const b = layoutMotifs("mixed", "desktop", 1280, 720, mulberry32(2));
    expect(a.map((m) => m.kind).join()).not.toBe(b.map((m) => m.kind).join());
    expect(new Set(a.map((m) => Math.round(m.x))).size).toBeGreaterThan(a.length * 0.8);
    expect(new Set(a.map((m) => Math.round(m.y))).size).toBeGreaterThan(a.length * 0.8);
  });

  it("keeps float slow and subtle: 19-35s cycles, under 2px sideways drift", () => {
    for (const m of layoutMotifs("mixed", "desktop", 1440, 900, mulberry32(9))) {
      expect(m.duration).toBeGreaterThanOrEqual(19);
      expect(m.duration).toBeLessThanOrEqual(35);
      expect(Math.abs(m.floatX)).toBeLessThanOrEqual(1.5);
    }
  });

  it("renders fewer motifs rather than forcing an overlap when space runs out", () => {
    const placed = layoutMotifs("mixed", "mobile", 200, 200, mulberry32(4));
    expect(placed.length).toBeLessThan(MAX_MOTIFS.mobile);
  });
});