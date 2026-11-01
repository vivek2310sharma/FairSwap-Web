import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeSearchInput, suggestionsFor } from "@/components/listings/HomeSearchSuggestions";
import { InteractiveSafety } from "@/components/home/InteractiveSafety";
import { HomepageStory } from "@/components/home/HomepageStory";
import { LanguageSelector } from "@/components/LanguageSelector";
import { USER_FACING_LOCALES, isSelectableLocale, resolveLocale } from "@/lib/i18n/locales";
import { useState } from "react";

const categories = [
  { id: "1", slug: "furniture", name: "Furniture" },
  { id: "2", slug: "electronics", name: "Electronics" },
  { id: "3", slug: "electronics-audio", name: "Audio & Electronics" },
];

function Harness({ onPick }: { onPick: (slug: string) => void }) {
  const [value, setValue] = useState("");
  return <form onSubmit={(e) => e.preventDefault()}><label htmlFor="q">Search items</label><HomeSearchInput id="q" categories={categories} value={value} onChange={setValue} onPickCategory={onPick} placeholder="x" /></form>;
}

describe("search suggestions", () => {
  it("only suggests real categories that match, capped", () => {
    expect(suggestionsFor(categories, "elec").map((c) => c.slug)).toEqual(["electronics", "electronics-audio"]);
    expect(suggestionsFor(categories, "  ")).toEqual([]);
    expect(suggestionsFor(categories, "zzz")).toEqual([]);
  });

  it("is keyboard operable: arrows move, Enter picks, Escape closes, Enter without a highlight submits normally", () => {
    const pick = vi.fn();
    render(<Harness onPick={pick} />);
    const input = screen.getByRole("searchbox", { name: "Search items" });
    fireEvent.change(input, { target: { value: "elec" } });
    expect(screen.getAllByRole("option")).toHaveLength(2);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[0].id);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(pick).toHaveBeenCalledWith("electronics-audio");
    fireEvent.change(input, { target: { value: "furn" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.change(input, { target: { value: "furn" } });
    const prevented = !fireEvent.keyDown(input, { key: "Enter" });
    expect(prevented).toBe(false);
    expect(pick).toHaveBeenCalledTimes(1);
  });

  it("picks with the pointer", () => {
    const pick = vi.fn();
    render(<Harness onPick={pick} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "furn" } });
    fireEvent.mouseDown(screen.getByRole("option", { name: /Furniture/ }));
    expect(pick).toHaveBeenCalledWith("furniture");
  });
});

describe("interactive safety panel", () => {
  it("covers the four India scam patterns and expands accessibly", () => {
    render(<InteractiveSafety />);
    for (const name of [/UPI advance/, /QR codes/, /courier or pickup/, /army officer/]) {
      const button = screen.getByRole("button", { name });
      expect(button).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(button);
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(document.getElementById(button.getAttribute("aria-controls")!)).not.toHaveAttribute("hidden");
    }
  });

  it("makes no escrow, protection or verification claims", () => {
    const { container } = render(<InteractiveSafety />);
    expect(container.textContent).not.toMatch(/escrow|guarantee|protected|verified|fraud-free/i);
  });
});

describe("homepage story", () => {
  it("has four steps and swaps the illustration on selection", () => {
    render(<HomepageStory />);
    expect(screen.getAllByRole("button", { pressed: false }).length + screen.getAllByRole("button", { pressed: true }).length).toBe(4);
    expect(screen.getByTestId("story-art").querySelector("img")?.getAttribute("src")).toMatch(/laptop/);
    fireEvent.click(screen.getByRole("button", { name: /Exchange/ }));
    expect(screen.getByTestId("story-art").querySelector("img")?.getAttribute("src")).toMatch(/handshake/);
  });
});

describe("language selector", () => {
  it("shows only English and Hindi, with only English selectable", () => {
    render(<LanguageSelector />);
    const select = screen.getByRole("combobox", { name: "Language" });
    expect(select).toHaveValue("en");
    const options = screen.getAllByRole("option") as HTMLOptionElement[];
    expect(options).toHaveLength(USER_FACING_LOCALES.length);
    expect(options.map((o) => o.value)).toEqual(["en", "hi"]);
    expect(options.filter((o) => !o.disabled).map((o) => o.value)).toEqual(["en"]);
    expect(screen.getByRole("option", { name: "हिन्दी (coming soon)" })).toBeDisabled();
  });

  it("never resolves to a locale that is not enabled", () => {
    expect(isSelectableLocale("hi")).toBe(false);
    expect(resolveLocale("hi")).toBe("en");
    expect(resolveLocale("<script>")).toBe("en");
    expect(resolveLocale(null)).toBe("en");
  });
});