import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getCategoryImagePath } from "@/lib/categories/category-images";

describe("FairSwap category photography", () => {
  it("matches currently visible category slugs to local WebP assets", () => {
    const examples = [
      ["commuter-bikes", "commuter-bikes"],
      ["sports-superbikes", "sports-superbikes"],
      ["cruiser-bikes", "cruiser-bikes"],
      ["adventure-touring-bikes", "adventure-touring-bikes"],
      ["bicycles-sports", "bicycles-sports"],
      ["electronics", "electronics"],
      ["furniture", "furniture"],
      ["home-appliances", "home-appliances"],
      ["mobiles", "mobiles-tablets"],
    ] as const;
    for (const [slug, asset] of examples) {
      const path = getCategoryImagePath(slug);
      expect(path).toBe(`/images/categories/${asset}.webp`);
      expect(existsSync(join(process.cwd(), "public", path!))).toBe(true);
    }
  });

  it("inherits the most specific proposed taxonomy category image", () => {
    expect(getCategoryImagePath("electronics-gaming-console-controllers")).toBe(
      "/images/categories/electronics-gaming.webp",
    );
    expect(getCategoryImagePath("mobiles-tablets-smartphones-android-phones")).toBe(
      "/images/categories/mobiles-tablets.webp",
    );
    expect(getCategoryImagePath("sports-outdoors-cycling-city-bicycles")).toBe(
      "/images/categories/sports-outdoors-cycling.webp",
    );
  });

  it("does not treat unknown or test categories as image-backed", () => {
    expect(getCategoryImagePath("fs-test-20261007-m1-category")).toBeNull();
    expect(getCategoryImagePath("a-random-category")).toBeNull();
    expect(getCategoryImagePath("../../outside")).toBeNull();
  });
});
