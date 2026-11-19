import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { Shapes } from "lucide-react";
import fixture from "./taxonomy-v2-fixture.json";
import { CANONICAL_CATEGORY_PARENTS } from "@/lib/listings/canonical-category-slugs";
import { CANONICAL_CATEGORY_ICONS, getMainCategoryIcon, getSubcategoryIcon } from "@/components/listings/post-ad-category-icons";
import { canonicalCategoryHref, resolveCreationQuery } from "@/lib/listings/canonical-posting-route";
import { taxonomySchema } from "@/lib/listings/taxonomy-v2";
import { PostingWizardSteps, PostingWizardReview } from "@/components/listings/posting/PostingWizard";

afterEach(cleanup);
describe("canonical category publishing boundary", () => {
  it("covers exactly the authoritative 15 roots and 63 leaves with distinct glyph geometry", () => {
    const inventory = fixture.nodes.map(node => node.slug).sort();
    expect(Object.keys(CANONICAL_CATEGORY_ICONS).sort()).toEqual(inventory);
    expect(Object.keys(CANONICAL_CATEGORY_PARENTS).sort()).toEqual(inventory);
    const geometry = fixture.nodes.map(node => {
      const Icon = CANONICAL_CATEGORY_ICONS[node.slug as keyof typeof CANONICAL_CATEGORY_ICONS];
      expect(Icon).not.toBe(Shapes);
      const parent = fixture.nodes.find(parent => parent.id === node.parent_id);
      expect(parent ? getSubcategoryIcon(parent.slug, node.slug) : getMainCategoryIcon(node.slug)).toBe(Icon);
      const markup = renderToStaticMarkup(<Icon/>);
      return markup.slice(markup.indexOf(">") + 1).replace(/ class="[^"]*"/g, "");
    });
    expect(new Set(geometry).size).toBe(78);
    expect(getMainCategoryIcon("unknown")).toBe(Shapes);
    expect(getSubcategoryIcon("v2-property", "mobile-phones")).toBe(Shapes);
  });

  it.each(fixture.nodes.filter(node => node.parent_id))("selects $slug once in the canonical URL", node => {
    const slug = node.slug as Parameters<typeof canonicalCategoryHref>[0];
    expect(canonicalCategoryHref(slug)).toBe(`/account/listings/new?category=${node.slug}`);
    expect(resolveCreationQuery({ category: node.slug })).toEqual({ kind: "category", slug });
  });

  it.each([
    { macro: "goods" }, { macro: "vehicles" }, { macro: "property" }, { entry: "legacy" },
    { posting: "mobile-phones" }, { posting: "tablets" }, { posting: "wearables" }, { posting: "mobile-accessories" },
    { category: ["mobile-phones", "tablets"] }, { category: "mobile-phones", entry: "legacy" },
    { category: "v2-services" }, { category: "v2-jobs" }, { category: "v2-property" },
    { category: "made-up" }, { category: "__proto__" }, { category: "" }, { entry: ["legacy", "legacy"] },
  ])("redirects legacy/malformed input %j without choosing a form", query => {
    expect(resolveCreationQuery(query)).toEqual({ kind: "redirect" });
  });
  it("rejects invented inventory or canonical leaves moved under a different root", () => {
    for (const change of ["slug", "parent"] as const) {
      const data = structuredClone(fixture);
      if (change === "slug") data.nodes[1].slug = "invented-phone";
      else data.nodes[1].parent_id = data.nodes.find(node => node.slug === "v2-property")!.id;
      expect(taxonomySchema.safeParse(data).success).toBe(false);
    }
  });
});

it("shares exactly five keyboard-operable step controls and five review edit links", () => {
  const labels = ["Photos", "Details", "Condition", "Terms", "Location"] as const;
  const visited: number[] = [];
  const { rerender } = render(<PostingWizardSteps labels={labels} step={1} reachable={2} busy={false} maintenance={false} sessionReady onNavigate={step => visited.push(step)}/>);
  expect(screen.getAllByRole("button")).toHaveLength(5);
  expect(screen.getByRole("button", { name: "Step 2: Details" })).toHaveAttribute("aria-current", "step");
  expect(screen.getByRole("button", { name: "Step 4: Terms" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Step 1: Photos" }));
  expect(visited).toEqual([0]);
  rerender(<PostingWizardReview labels={labels} onNavigate={step => visited.push(step)}>Seller-declared details.</PostingWizardReview>);
  expect(screen.getAllByRole("button", { name: /^Edit / })).toHaveLength(5);
  expect(screen.queryByRole("button", { name: /Step 6/ })).toBeNull();
});
