import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import AccountPage from "@/app/account/page";
import { createFakeSupabase, type FakeResult } from "../helpers/fake-supabase";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

const USER = { id: "user-123", email: "asha.private@example.com" };

const PROFILE = {
  display_name: "Asha Verma",
  city: "Pune",
  state: "Maharashtra",
  created_at: "2026-03-15T10:00:00.000Z",
};

interface Setup {
  status?: string | null;
  profile?: FakeResult;
  active?: FakeResult;
  pending?: FakeResult;
}

function setup({ status = "active", profile, active, pending }: Setup = {}) {
  const fake = createFakeSupabase({
    user: USER,
    tables: {
      profiles: profile ?? { data: PROFILE },
      user_accounts:
        status === null
          ? { data: null, error: { message: "Query failed" } }
          : { data: { account_status: status } },
      listings: (query) => {
        const wanted = query.eq.find(([column]) => column === "status")?.[1];
        return wanted === "active"
          ? (active ?? { count: 4 })
          : (pending ?? { count: 2 });
      },
    },
  });
  mocks.createClient.mockResolvedValue(fake.client);
  return fake;
}

const CARD_LINKS: Array<[RegExp, string]> = [
  [/^Profile/, "/account/profile"],
  [/^My listings/, "/account/listings"],
  [/^Chats/, "/account/messages"],
  [/^Favourites/, "/account/favourites"],
  [/^Settings/, "/account/settings"],
  [/^Privacy & your data/, "/account/privacy"],
  [/^Help & safety/, "/account/support"],
];

describe("ACC-01 Account overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects unauthenticated users to sign-in", async () => {
    mocks.createClient.mockResolvedValue(createFakeSupabase({ user: null }).client);

    await expect(AccountPage()).rejects.toThrow("REDIRECT:/auth/sign-in?next=/account");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/sign-in?next=/account");
  });

  it("shows identity: initial, name, owner email, city and member-since", async () => {
    setup();
    render(await AccountPage());

    expect(screen.getByRole("heading", { level: 1, name: "My account" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Asha Verma" })).toBeInTheDocument();
    expect(screen.getByText("asha.private@example.com")).toBeInTheDocument();
    expect(screen.getByText("Pune, Maharashtra")).toBeInTheDocument();
    expect(screen.getByText("Member since March 2026")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    // Initials only: no remote avatar image is ever rendered.
    expect(document.querySelector("img")).toBeNull();
  });

  it("links to the public profile for active accounts", async () => {
    setup();
    render(await AccountPage());

    expect(screen.getByRole("link", { name: "View public profile" })).toHaveAttribute(
      "href",
      "/seller/user-123"
    );
  });

  it("renders a Sign out button", async () => {
    setup();
    render(await AccountPage());

    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).not.toBeNull();
  });

  it("renders exactly seven cards, each a single link to the right route", async () => {
    setup();
    render(await AccountPage());

    const sections = screen.getByRole("navigation", { name: "Account sections" });
    const links = within(sections).getAllByRole("link");
    expect(links).toHaveLength(7);

    for (const [name, href] of CARD_LINKS) {
      const matches = links.filter((link) => name.test(link.textContent ?? ""));
      expect(matches, String(name)).toHaveLength(1);
      expect(matches[0]).toHaveAttribute("href", href);
    }

    // One destination per card: no nested links.
    for (const link of links) {
      expect(link.querySelector("a")).toBeNull();
    }
  });

  it("shows real live and in-review listing counts", async () => {
    setup({ active: { count: 4 }, pending: { count: 2 } });
    render(await AccountPage());

    expect(screen.getByText("4 live · 2 in review")).toBeInTheDocument();
  });

  it("scopes every listing count to the authenticated user", async () => {
    const fake = setup();
    render(await AccountPage());

    const listingQueries = fake.queries.filter((q) => q.table === "listings");
    expect(listingQueries).toHaveLength(2);
    for (const query of listingQueries) {
      expect(query.eq).toContainEqual(["seller_id", USER.id]);
      expect(query.selectOptions).toMatchObject({ count: "exact", head: true });
    }
    expect(listingQueries.map((q) => q.eq.find(([c]) => c === "status")?.[1]).sort()).toEqual([
      "active",
      "pending_review",
    ]);

    const profileQuery = fake.queries.find((q) => q.table === "profiles");
    expect(profileQuery?.eq).toContainEqual(["id", USER.id]);
    expect(profileQuery?.select).not.toContain("*");
    const accountQuery = fake.queries.find((q) => q.table === "user_accounts");
    expect(accountQuery?.eq).toContainEqual(["user_id", USER.id]);
  });

  it("never selects or renders a private email from profiles", async () => {
    const fake = setup();
    render(await AccountPage());

    const profileQuery = fake.queries.find((q) => q.table === "profiles");
    expect(profileQuery?.select).not.toMatch(/email/i);
  });

  it("omits counts when they cannot be loaded instead of showing zero", async () => {
    setup({
      active: { error: { message: "boom" } },
      pending: { error: { message: "boom" } },
    });
    render(await AccountPage());

    expect(screen.queryByText(/\d+ live/)).toBeNull();
    expect(screen.queryByText(/\d+ in review/)).toBeNull();
    expect(screen.getByRole("link", { name: /^My listings/ })).toBeInTheDocument();
  });

  it("shows a zero count truthfully when the user has no listings", async () => {
    setup({ active: { count: 0 }, pending: { count: 0 } });
    render(await AccountPage());

    expect(screen.getByText("0 live · 0 in review")).toBeInTheDocument();
  });

  it("does not render excluded features, fake counters or verification status", async () => {
    setup();
    const { container } = render(await AccountPage());
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/verif/i);
    expect(text).not.toMatch(/saved search/i);
    expect(text).not.toMatch(/\bratings?\b/i);
    expect(text).not.toMatch(/\breviews\b/i);
    expect(text).not.toMatch(/whatsapp/i);
    expect(text).not.toMatch(/\bunread\b/i);
  });

  it("shows the Report a scam strip with Indian fraud examples and a working link", async () => {
    setup();
    render(await AccountPage());

    const strip = screen.getByRole("region", { name: "Report a scam" });
    expect(within(strip).getByRole("heading", { name: "Something feel wrong?" })).toBeInTheDocument();
    expect(within(strip).getByText(/Advance-payment or UPI/)).toBeInTheDocument();
    expect(within(strip).getByText(/Fake courier or delivery links/)).toBeInTheDocument();
    expect(within(strip).getByText(/Fake army officer/)).toBeInTheDocument();
    expect(within(strip).getByText(/Fraudulent payment links/)).toBeInTheDocument();
    expect(within(strip).getByRole("link", { name: /Report a scam/ })).toHaveAttribute(
      "href",
      "/account/support/report-scam"
    );
    expect(strip).toHaveTextContent("safety support ticket");
  });

  it("uses the reference's three-column desktop grid, with Help & safety as a full-width seventh card", async () => {
    setup();
    render(await AccountPage());

    const sections = screen.getByRole("navigation", { name: "Account sections" });
    const list = within(sections).getByRole("list");
    expect(list.className).toContain("lg:grid-cols-3");
    expect(list.className).not.toContain("lg:grid-cols-4");

    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(7);
    expect(items.slice(0, 6).every((li) => !li.className.includes("col-span"))).toBe(true);
    expect(items[6].className).toContain("lg:col-span-3");
    expect(within(items[6]).getByRole("link")).toHaveAttribute("href", "/account/support");
  });

  it("renders mobile rows as one grouped list with descriptions shown only from sm upwards", async () => {
    setup();
    render(await AccountPage());

    const list = within(screen.getByRole("navigation", { name: "Account sections" })).getByRole("list");
    expect(list.className).toContain("divide-y");
    for (const link of within(list).getAllByRole("link")) {
      const description = link.querySelector("span.hidden");
      expect(description, link.textContent ?? "").not.toBeNull();
      expect(description?.className).toContain("sm:block");
    }
  });

  it("uses initials only and never reads or renders avatar_url, even if a hostile URL is stored", async () => {
    const fake = setup({
      profile: { data: { ...PROFILE, avatar_url: "https://tracker.example/pixel.png" } },
    });
    const { container } = render(await AccountPage());

    expect(container.querySelector("img")).toBeNull();
    expect(container.innerHTML).not.toContain("tracker.example");
    expect(fake.queries.find((q) => q.table === "profiles")?.select).not.toContain("avatar_url");
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("does not render the secondary account tab strip itself", async () => {
    setup();
    render(await AccountPage());

    expect(screen.queryByRole("navigation", { name: "Account navigation" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Mobile bottom navigation" })).toBeNull();
  });

  describe("restricted account states", () => {
    const restricted: Array<[string, string, string]> = [
      ["suspended", "Account Suspended", "Your account is currently suspended"],
      ["deletion_pending", "Account Deletion Pending", "pending processing"],
      ["deleted", "Account Closed", "has been closed"],
    ];

    for (const [status, title, body] of restricted) {
      it(`renders ${status}: alert, no public profile link, no scam strip, appeals card`, async () => {
        setup({ status });
        render(await AccountPage());

        const alert = screen.getByRole("alert");
        expect(alert).toHaveTextContent(title);
        expect(alert).toHaveTextContent(body);
        expect(screen.queryByRole("link", { name: "View public profile" })).toBeNull();
        expect(screen.queryByRole("region", { name: "Report a scam" })).toBeNull();
        expect(screen.getByRole("link", { name: /^Appeals & support/ })).toHaveAttribute(
          "href",
          "/account/support"
        );
        expect(screen.getByRole("link", { name: /^Profile/ })).toHaveTextContent(
          "Review your saved profile details"
        );
        // No listing counts for restricted accounts, and the raw enum never leaks.
        expect(screen.queryByText(/\d+ live/)).toBeNull();
        expect(screen.queryByText(status)).toBeNull();
        // Sign out remains available.
        expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
      });
    }

    it("renders a neutral warning when account status cannot be loaded", async () => {
      setup({ status: null });
      render(await AccountPage());

      expect(screen.getByRole("alert")).toHaveTextContent("Account Information Unavailable");
      expect(screen.queryByRole("link", { name: "View public profile" })).toBeNull();
      expect(screen.queryByRole("region", { name: "Report a scam" })).toBeNull();
      expect(screen.getByText("asha.private@example.com")).toBeInTheDocument();
    });
  });

  it("still renders when the profile row is missing", async () => {
    setup({ profile: { data: null } });
    render(await AccountPage());

    expect(screen.getByRole("heading", { level: 2, name: "My account" })).toBeInTheDocument();
    expect(screen.getByText("asha.private@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/Member since/)).toBeNull();
  });
});
