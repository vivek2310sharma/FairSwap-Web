import { describe, it, expect } from "vitest";
import { resolveListingActions } from "@/lib/listings/action-matrix";

describe("resolveListingActions", () => {
  it("resolves ACTIVE status actions correctly", () => {
    const actions = resolveListingActions({
      id: "list-1",
      slug: "test-item",
      status: "active",
      renewal_count: 0,
    });

    expect(actions.primary.id).toBe("mark_sold");
    expect(actions.primary.label).toBe("Mark as sold");
    expect(actions.primary.requiresConfirmation).toBe(true);

    expect(actions.secondary).toHaveLength(3);
    expect(actions.secondary.map((a) => a.id)).toEqual(["edit", "pause", "reserve"]);
    expect(actions.secondary[0].href).toBe("/account/listings/list-1/edit");
  });

  it("resolves RESERVED status actions correctly", () => {
    const actions = resolveListingActions({
      id: "list-2",
      slug: "reserved-item",
      status: "reserved",
      renewal_count: 0,
    });

    expect(actions.primary.id).toBe("mark_sold");
    expect(actions.secondary.map((a) => a.id)).toEqual(["unreserve", "edit"]);
  });

  it("resolves PAUSED status actions correctly", () => {
    const actions = resolveListingActions({
      id: "list-3",
      slug: "paused-item",
      status: "paused",
      renewal_count: 0,
    });

    expect(actions.primary.id).toBe("resume");
    expect(actions.primary.label).toBe("Resume");
    expect(actions.secondary.map((a) => a.id)).toEqual(["edit", "mark_sold"]);
    expect(actions.secondary[1].requiresConfirmation).toBe(true);
  });

  it("resolves DRAFT status actions for eligible goods listing", () => {
    const actions = resolveListingActions({
      id: "list-4",
      slug: "draft-item",
      status: "draft",
      renewal_count: 0,
      propertyDraft: false,
      vehicleDraft: false,
      unresolvedFamily: false,
    });

    expect(actions.primary.id).toBe("edit");
    expect(actions.primary.label).toBe("Continue editing");
    expect(actions.secondary).toHaveLength(1);
    expect(actions.secondary[0].id).toBe("submit");
    expect(actions.secondary[0].label).toBe("Submit for review");
  });

  it("suppresses secondary submit action for restricted DRAFT categories", () => {
    const propertyDraftActions = resolveListingActions({
      id: "list-prop",
      slug: "property-item",
      status: "draft",
      renewal_count: 0,
      propertyDraft: true,
    });
    expect(propertyDraftActions.secondary).toHaveLength(0);

    const vehicleDraftActions = resolveListingActions({
      id: "list-veh",
      slug: "vehicle-item",
      status: "draft",
      renewal_count: 0,
      vehicleDraft: true,
    });
    expect(vehicleDraftActions.secondary).toHaveLength(0);

    const unresolvedActions = resolveListingActions({
      id: "list-unres",
      slug: "unresolved-item",
      status: "draft",
      renewal_count: 0,
      unresolvedFamily: true,
    });
    expect(unresolvedActions.secondary).toHaveLength(0);
  });

  it("resolves PENDING_REVIEW status actions correctly", () => {
    const goodsActions = resolveListingActions({
      id: "list-5",
      slug: "pending-item",
      status: "pending_review",
      renewal_count: 0,
    });
    expect(goodsActions.primary.id).toBe("view_details");
    expect(goodsActions.primary.href).toBe("/listings/pending-item");
    expect(goodsActions.secondary[0].label).toBe("Edit");

    const propertyActions = resolveListingActions({
      id: "list-6",
      slug: "pending-prop",
      status: "pending_review",
      renewal_count: 0,
      propertyDraft: true,
    });
    expect(propertyActions.primary.id).toBe("view_details");
    expect(propertyActions.secondary[0].label).toBe("View saved details");
  });

  it("resolves EXPIRED status actions with remaining renewals", () => {
    const actions = resolveListingActions({
      id: "list-7",
      slug: "expired-item",
      status: "expired",
      renewal_count: 1,
    });

    expect(actions.primary.id).toBe("renew");
    expect(actions.primary.label).toBe("Renew (2 left)");
    expect(actions.secondary.map((a) => a.id)).toEqual(["edit"]);
  });

  it("resolves EXPIRED status actions when renewals are exhausted", () => {
    const actions = resolveListingActions({
      id: "list-8",
      slug: "expired-exhausted",
      status: "expired",
      renewal_count: 3,
    });

    expect(actions.primary.id).toBe("edit");
    expect(actions.primary.label).toBe("Edit");
    expect(actions.secondary).toHaveLength(0);
  });

  it("resolves REJECTED status actions correctly", () => {
    const actions = resolveListingActions({
      id: "list-9",
      slug: "rejected-item",
      status: "rejected",
      renewal_count: 0,
    });

    expect(actions.primary.id).toBe("edit");
    expect(actions.primary.label).toBe("Fix ad");
    expect(actions.secondary).toHaveLength(0);
  });

  it("resolves SOLD status actions correctly", () => {
    const actions = resolveListingActions({
      id: "list-10",
      slug: "sold-item",
      status: "sold",
      renewal_count: 0,
    });

    expect(actions.primary.id).toBe("view_details");
    expect(actions.primary.href).toBe("/listings/sold-item");
    expect(actions.secondary.map((a) => a.id)).toEqual(["edit"]);
  });

  it("resolves REMOVED status actions correctly", () => {
    const actions = resolveListingActions({
      id: "list-11",
      slug: "removed-item",
      status: "removed",
      renewal_count: 0,
    });

    expect(actions.primary.id).toBe("view_details");
    expect(actions.secondary).toHaveLength(0);
  });

  it("falls back to ID in view_details href when slug is missing or empty", () => {
    const actions = resolveListingActions({
      id: "uuid-1234",
      slug: "",
      status: "sold",
      renewal_count: 0,
    });

    expect(actions.primary.href).toBe("/listings/uuid-1234");
  });
});
