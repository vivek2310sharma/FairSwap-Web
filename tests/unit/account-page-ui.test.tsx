import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import AccountPage from "@/app/account/page";
import { getAccountCopy } from "@/lib/account/copy";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  createClient: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/components/providers/AuthProvider", () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

describe("ACC-02 My Account Page UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: mocks.from,
      rpc: mocks.rpc,
    });
    mocks.rpc.mockResolvedValue({ data: { exists: true, onboarding_completed: true }, error: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects unauthenticated users to sign-in page", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "Not authenticated" } });

    await expect(AccountPage()).rejects.toThrow("REDIRECT:/auth/sign-in?next=/account");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/sign-in?next=/account");
  });

  it("renders active account without internal terms version or status badge, showing My profile and Settings tiles and no duplicate Edit profile button", async () => {
    const user = { id: "user-active-123", email: "customer@example.com" };
    const profile = { display_name: "John Doe", city: "Mumbai", state: "Maharashtra", bio: "Hello world" };
    const account = {
      user_id: "user-active-123",
      account_status: "active",
      terms_version: "2026-09-18",
    };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: profile, error: null }),
            }),
          }),
        };
      }
      if (table === "user_accounts") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: account, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    render(await AccountPage());

    expect(screen.getByRole("heading", { level: 1, name: "John Doe" })).toBeInTheDocument();
    expect(screen.getByText("customer@example.com")).toBeInTheDocument();
    expect(screen.getByText("Mumbai")).toBeInTheDocument();

    // Ensure raw status and terms version are NOT rendered
    expect(screen.queryByText("Terms Version:")).toBeNull();
    expect(screen.queryByText("2026-09-18")).toBeNull();
    expect(screen.queryByText("Status:")).toBeNull();
    expect(screen.queryByText("active")).toBeNull();

    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute("href", "/account/settings");
    expect(screen.queryByRole("link", { name: /Edit profile/i })).toBeNull();
    expect(screen.getByRole("link", { name: /My profile/i })).toHaveAttribute("href", "/account/profile");
    expect(screen.getByRole("link", { name: /Security settings/i })).toHaveAttribute("href", "/account/security");
    expect(screen.getByRole("link", { name: "View public profile" })).toHaveAttribute("href", "/seller/user-active-123");

    // No alert banner shown for active account
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders suspended account banner, appeal link, and View Profile link", async () => {
    const user = { id: "user-suspended-123", email: "suspended@example.com" };
    const profile = { display_name: "Suspended User" };
    const account = { user_id: "user-suspended-123", account_status: "suspended", terms_version: "2026-09-18" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: profile, error: null }),
            }),
          }),
        };
      }
      if (table === "user_accounts") {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: account, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    render(await AccountPage());

    // Suspension banner is present
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Account Suspended")).toBeInTheDocument();
    expect(screen.getByText(/Your account is currently suspended/i)).toBeInTheDocument();

    // Restricted accounts cannot edit, have no public profile link and no verification preview
    expect(screen.queryByRole("link", { name: /Edit profile/i })).toBeNull();
    expect(screen.queryByRole("link", { name: "View public profile" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Verify account/i })).toBeNull();

    // Help tile keeps support and appeals access
    expect(screen.getByRole("link", { name: /Help & safety/ })).toHaveAttribute("href", "/account/support");
    expect(screen.getByRole("link", { name: /My profile/ })).toHaveAttribute("href", "/account/profile");

    // Terms version and raw status string are still not exposed
    expect(screen.queryByText("Terms Version:")).toBeNull();
    expect(screen.queryByText("2026-09-18")).toBeNull();
    expect(screen.queryByText("Status:")).toBeNull();
    expect(screen.queryByText("suspended")).toBeNull();
  });

  it("renders human-readable alert for deletion_pending account and View Profile link", async () => {
    const user = { id: "user-del-123", email: "del@example.com" };
    const account = { user_id: "user-del-123", account_status: "deletion_pending", terms_version: "2026-09-18" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === "user_accounts") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: account, error: null }) }) }) };
      }
      return {};
    });

    render(await AccountPage());

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Account Deletion Pending")).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: /Edit profile/i })).toBeNull();

    // Raw enum string not displayed
    expect(screen.queryByText("deletion_pending")).toBeNull();
    expect(screen.queryByText("Terms Version:")).toBeNull();
  });

  it("renders human-readable alert for deleted account and View Profile link", async () => {
    const user = { id: "user-deleted-123", email: "deleted@example.com" };
    const account = { user_id: "user-deleted-123", account_status: "deleted", terms_version: "2026-09-18" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === "user_accounts") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: account, error: null }) }) }) };
      }
      return {};
    });

    render(await AccountPage());

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Account Closed")).toBeInTheDocument();

    expect(screen.queryByRole("link", { name: /Edit profile/i })).toBeNull();

    // Raw enum string not displayed
    expect(screen.queryByText("deleted")).toBeNull();
    expect(screen.queryByText("Terms Version:")).toBeNull();
  });

  it("handles missing user_accounts record or query error safely with warning banner and View Profile link", async () => {
    const user = { id: "user-no-account-123", email: "noaccount@example.com" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === "user_accounts") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: "Query failed" } }) }) }) };
      }
      return {};
    });

    render(await AccountPage());

    expect(screen.getByText("noaccount@example.com")).toBeInTheDocument();

    // Renders neutral warning banner for unavailable account status
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Account Information Unavailable");

    expect(screen.queryByRole("link", { name: /Edit profile/i })).toBeNull();

    expect(screen.queryByText("Status:")).toBeNull();
    expect(screen.queryByText("unknown")).toBeNull();
    expect(screen.queryByText("active")).toBeNull();
  });

  it("renders account tiles in order with real links and Coming soon previews", async () => {
    const user = { id: "user-9tile-123", email: "user9@example.com" };
    const account = { user_id: "user-9tile-123", account_status: "active" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      if (table === "user_accounts") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: account, error: null }) }) }) };
      }
      return {};
    });

    render(await AccountPage());

    const options = within(screen.getByRole("navigation", { name: "Account options" }));
    const names = options.getAllByRole("listitem").map((li) => li.textContent ?? "");
    const order = ["My profile", "My ads", "My trades", "Chats", "Favourites", "Saved searches & alerts", "Ratings", "FairSeeds", "Settings", "Privacy & your data", "Help & safety"];
    expect(names).toHaveLength(11);
    expect(options.getByRole("link", { name: /My trades/ })).toHaveAttribute("href", "/account/trades");
    expect(options.getByRole("link", { name: /My trades/ })).toHaveTextContent("Coming soon");
    expect(options.getByRole("link", { name: /Help & safety/ }).closest("li")).toHaveClass("lg:col-span-2");
    order.forEach((title, i) => expect(names[i]).toContain(title));

    expect(options.getByRole("link", { name: /My ads/ })).toHaveAttribute("href", "/account/listings");
    expect(options.getByRole("link", { name: /Chats/ })).toHaveAttribute("href", "/account/messages");
    expect(options.getByRole("link", { name: /Favourites/ })).toHaveAttribute("href", "/account/favourites");
    expect(options.getByRole("link", { name: /Privacy & your data/ })).toHaveAttribute("href", "/account/privacy");
    expect(options.getByRole("button", { name: /Ratings/ })).toBeInTheDocument();
    expect(options.getByRole("button", { name: /FairSeeds/ })).toBeInTheDocument();

    // Neutral fallbacks, no placeholders, no decorative arrows
    expect(screen.getByRole("heading", { level: 1, name: "FairSwap member" })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/[←-⇿]|\[City\]|\[n\]/);

    // Verification preview copy
    expect(screen.getByText("Help us make FairSwap secure")).toBeInTheDocument();
    expect(screen.getByText("Planned launch offer - Coming soon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Verify account/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(options.getByRole("link", { name: /My ads/ })).toHaveTextContent("Manage the ads you've posted on FairSwap.");

    const savedSearches = options.getByRole("button", { name: /Saved searches & alerts/ });
    expect(savedSearches).toHaveTextContent("Coming soon");
    expect(options.queryByRole("link", { name: /Saved searches & alerts/ })).toBeNull();
    // jsdom does not implement the native dialog methods.
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    Object.defineProperties(dialog, {
      showModal: { value: () => dialog.setAttribute("open", "") },
      close: { value: () => dialog.removeAttribute("open") },
    });
    fireEvent.click(savedSearches);
    expect(screen.getByRole("dialog")).toHaveTextContent("Saved searches & alerts are coming soon.");
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

 it("preserves English and Hindi ad copy with existing internal keys", () => {
  expect(getAccountCopy().tiles.listings).toEqual({ title: "My ads", description: "Manage the ads you've posted on FairSwap." });
  expect(getAccountCopy("hi").tiles.listings.title).toBe("मेरे विज्ञापन");
  expect(getAccountCopy("hi").seller.searchLabel).toBe("इस विक्रेता के विज्ञापन खोजें");
});
