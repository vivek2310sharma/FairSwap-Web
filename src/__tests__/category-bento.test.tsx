import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CategoryBento, featuredCategories } from "@/components/home/CategoryBento";

afterEach(() => cleanup());

describe("CategoryBento rail", () => {
  const cats = [
    { id: "1", slug: "electronics", name: "Electronics" },
    { id: "2", slug: "zz-unmatched", name: "Unmatched" },
    { id: "3", slug: "furniture-test", name: "FS TEST 20261007 M1 Category" },
  ];
  it("features only pictured, non-fixture categories but keeps the full directory available", () => {
    expect(featuredCategories(cats).map((c) => c.id)).toEqual(["1"]);
    const { container } = render(<CategoryBento categories={cats} hrefFor={(slug) => `/search?category=${slug}`} />);
    expect(screen.getByRole("link", { name: "Electronics" })).toHaveAttribute("href", "/search?category=electronics");
    expect(screen.queryByRole("link", { name: "Unmatched" })).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "View all categories" }));
    expect(screen.getByRole("link", { name: "Unmatched" })).toHaveAttribute("href", "/search?category=zz-unmatched");
  });
  it("caps the rail at 8 featured categories", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ id: `${i}`, slug: `electronics-${i}`, name: `Cat ${i}` }));
    render(<CategoryBento categories={many} hrefFor={(s) => s} />);
    expect(document.querySelectorAll("#home-category-rail a")).toHaveLength(8);
  });
});
