import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createFakeSupabase } from "../helpers/fake-supabase";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  headerProps: vi.fn(),
  signOut: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  usePathname: () => "/account/listings",
}));
vi.mock("@/components/header", () => ({
  Header: (props: unknown) => {
    mocks.headerProps(props);
    return <header data-testid="header" />;
  },
}));

import { loadAccountOverview, deriveFirstName, deriveInitial } from "@/lib/account/overview";
import { loadHeaderViewer } from "@/lib/account/viewer";
import AccountLayout from "@/app/account/layout";
import { shouldShowBottomNav, isRouteActive } from "@/components/navigation/MobileBottomNav";
import { formatMonthYear } from "@/lib/formatters";
import { signOutAction } from "@/app/auth/actions";

describe("loadAccountOverview", () => {
  it("runs all queries in one parallel batch scoped to the user", async () => {
    // A staff/moderator account can read every listing through RLS: the explicit filter keeps counts personal.
    const fake = createFakeSupabase({
      tables: {
        profiles: { data: { display_name: "Moderator Mira", city: " Delhi ", state: null, created_at: "2026-01-05T00:00:00Z" } },
        user_accounts: { data: { account_status: "active" } },
        listings: (q) => ({ count: q.eq.some(([c, v]) => c === "status" && v === "active") ? 3 : 1 }),
      },
    });

    const overview = await loadAccountOverview(fake.client as never, { id: "staff-1", email: "mira@example.com" });

    expect(overview).toMatchObject({
      userId: "staff-1",
      email: "mira@example.com",
      displayName: "Moderator Mira",
      firstName: "Moderator",
      initial: "M",
      city: "Delhi",
      state: null,
      accountState: "active",
      counts: { activeListings: 3, pendingReviewListings: 1 },
    });
    expect(fake.queries).toHaveLength(4);
    for (const query of fake.queries.filter((q) => q.table === "listings")) {
      expect(query.eq).toContainEqual(["seller_id", "staff-1"]);
    }
  });

  it("degrades safely when queries fail", async () => {
    const fake = createFakeSupabase({
      tables: {
        profiles: { error: { message: "x" } },
        user_accounts: { error: { message: "x" } },
        listings: { error: { message: "x" } },
      },
    });
    const overview = await loadAccountOverview(fake.client as never, { id: "u1", email: "u1@example.com" });

    expect(overview.accountState).toBe("unavailable");
    expect(overview.displayName).toBeNull();
    expect(overview.initial).toBe("U");
    expect(overview.counts).toEqual({ activeListings: null, pendingReviewListings: null });
  });

  it("derives first names and initials safely, including non-Latin names", () => {
    expect(deriveFirstName("  Asha  Verma ")).toBe("Asha");
    expect(deriveFirstName("")).toBeNull();
    expect(deriveFirstName(null)).toBeNull();
    expect(deriveInitial("आशा वर्मा")).toBe("आ");
    expect(deriveInitial("")).toBe("?");
  });

  it("formats member-since as Month YYYY in Indian time", () => {
    expect(formatMonthYear("2026-03-15T10:00:00.000Z")).toBe("March 2026");
    expect(formatMonthYear("2026-02-28T20:00:00.000Z")).toBe("March 2026"); // 01:30 IST on 1 March
    expect(formatMonthYear("not a date")).toBe("");
    expect(formatMonthYear(null)).toBe("");
  });
});

describe("loadHeaderViewer and AccountLayout", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("returns the first name and initial for a signed-in user without calling getUser", async () => {
    const fake = createFakeSupabase({
      claimsSub: "user-1",
      tables: { profiles: { data: { display_name: "Asha Verma" } } },
    });
    const getUser = vi.spyOn(fake.client.auth, "getUser");
    mocks.createClient.mockResolvedValue(fake.client);

    expect(await loadHeaderViewer()).toEqual({ firstName: "Asha", initial: "A" });
    expect(getUser).not.toHaveBeenCalled();
    expect(fake.queries).toHaveLength(1);
    expect(fake.queries[0]).toMatchObject({ table: "profiles", select: "display_name" });
    expect(fake.queries[0].eq).toContainEqual(["id", "user-1"]);
  });

  it("returns null when signed out, when the profile is missing or on any failure", async () => {
    mocks.createClient.mockResolvedValue(createFakeSupabase({ claimsSub: null }).client);
    expect(await loadHeaderViewer()).toBeNull();

    mocks.createClient.mockResolvedValue(
      createFakeSupabase({ claimsSub: "u", tables: { profiles: { data: null } } }).client
    );
    expect(await loadHeaderViewer()).toBeNull();

    mocks.createClient.mockRejectedValue(new Error("cookies unavailable"));
    expect(await loadHeaderViewer()).toBeNull();
  });

  it("passes the viewer to the header and keeps the account tab strip for child routes", async () => {
    mocks.createClient.mockResolvedValue(
      createFakeSupabase({ claimsSub: "u", tables: { profiles: { data: { display_name: "Asha Verma" } } } }).client
    );

    render(await AccountLayout({ children: <p>child content</p> }));

    expect(mocks.headerProps).toHaveBeenCalledWith({ viewer: { firstName: "Asha", initial: "A" } });
    expect(screen.getByText("child content")).toBeInTheDocument();
    // usePathname is mocked to a child route, so the tab strip renders.
    expect(screen.getByRole("navigation", { name: "Account navigation" })).toBeInTheDocument();
  });

  it("still renders the page when the viewer cannot be loaded", async () => {
    mocks.createClient.mockRejectedValue(new Error("down"));
    render(await AccountLayout({ children: <p>child content</p> }));

    expect(mocks.headerProps).toHaveBeenCalledWith({ viewer: null });
    expect(screen.getByText("child content")).toBeInTheDocument();
  });
});

describe("HDR-01 bottom navigation compatibility", () => {
  it("is shown on the hub and the new support routes, with the Account tab active", () => {
    for (const path of [
      "/account",
      "/account/support",
      "/account/support/report-scam",
      "/account/privacy",
      "/account/settings",
    ]) {
      expect(shouldShowBottomNav(path), path).toBe(true);
      expect(isRouteActive("/account", path), path).toBe(true);
    }
  });

  it("keeps its existing hide rules (listing flows, chat threads, auth, policy review)", () => {
    for (const path of [
      "/account/listings/new",
      "/account/listings/abc/edit",
      "/account/messages/thread-1",
      "/account/policy-review",
      "/auth/sign-in",
    ]) {
      expect(shouldShowBottomNav(path), path).toBe(false);
    }
  });
});

describe("Sign out", () => {
  it("signs the user out through Supabase and returns to the home page", async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({ auth: { signOut } });

    await expect(signOutAction()).rejects.toThrow("REDIRECT:/");
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });
});
