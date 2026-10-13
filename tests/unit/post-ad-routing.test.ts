import { describe, expect, it } from "vitest";
import {
  buildMacroCategoryUrl,
  macroCategorySchema,
  parseMacroCategory,
} from "@/lib/listings/macro-category";

describe("Post Ad macro URL contract", () => {
  it("distinguishes missing from invalid without choosing a section", () => {
    expect(parseMacroCategory(undefined)).toEqual({ status: "missing" });
  });

  it.each(["goods", "vehicles", "property"] as const)("accepts exact %s", (macro) => {
    expect(parseMacroCategory(macro)).toEqual({ status: "valid", macroCategory: macro });
    expect(buildMacroCategoryUrl(macro)).toBe(`/account/listings/new?macro=${macro}`);
    expect(macroCategorySchema.parse(macro)).toBe(macro);
  });

  it.each([
    "", " ", "\t", "\n", "Goods", "VEHICLES", "Property", "unknown",
    " goods", "goods ", " vehicles ", "goods&next=https://evil.example",
    "https://evil.example", "//evil.example", "%67oods",
  ])("rejects unmodified invalid input %j", (input) => {
    expect(parseMacroCategory(input)).toEqual({ status: "invalid" });
  });

  it.each([
    [], ["goods"], ["goods", "goods"], ["vehicles", "property"], [""],
  ].map((value) => ({ value })))("rejects every array $value", ({ value }) => {
    expect(parseMacroCategory(value)).toEqual({ status: "invalid" });
  });

  it("cannot build an arbitrary URL even when a runtime caller bypasses TypeScript", () => {
    // @ts-expect-error The public builder rejects noncanonical section values at compile time.
    expect(() => buildMacroCategoryUrl("https://evil.example")).toThrow();
    // @ts-expect-error Unknown section values are also runtime-validated by Zod.
    expect(() => buildMacroCategoryUrl("unknown")).toThrow();
  });
});
