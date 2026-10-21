import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AccountPage from "@/app/account/page";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  createClient: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

describe("ACC-02 My Account Page UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { getUser: mocks.getUser },
      from: mocks.from,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects unauthenticated users to sign-in page", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "Not authenticated" } });

    await expect(AccountPage()).rejects.toThrow("REDIRECT:/auth/sign-in?next=/account");
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/sign-in?next=/account");
  });

  it("renders active account without internal terms version or status badge, showing Edit Profile and Manage Settings links", async () => {
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

    // Security card header and subtitle
    expect(screen.getByRole("heading", { name: "Account Security" })).toBeInTheDocument();
    expect(screen.getByText("Manage your account security and sign-in details.")).toBeInTheDocument();

    // User email
    expect(screen.getByText("customer@example.com")).toBeInTheDocument();

    // Ensure raw status and terms version are NOT rendered
    expect(screen.queryByText("Terms Version:")).toBeNull();
    expect(screen.queryByText("2026-09-18")).toBeNull();
    expect(screen.queryByText("Status:")).toBeNull();
    expect(screen.queryByText("active")).toBeNull();

    // Primary Manage Settings link exists
    const settingsLink = screen.getByRole("link", { name: /Manage Settings/i });
    expect(settingsLink).toHaveAttribute("href", "/account/settings");

    // Edit Profile link exists for active account
    const profileLink = screen.getByRole("link", { name: /Edit Profile/i });
    expect(profileLink).toHaveAttribute("href", "/account/profile");

    // Security Settings link exists
    const securityLink = screen.getByRole("link", { name: /Security Settings/i });
    expect(securityLink).toHaveAttribute("href", "/account/security");

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

    // Public profile card shows View Profile link instead of Edit Profile for restricted account
    const profileLink = screen.getByRole("link", { name: /View Profile/i });
    expect(profileLink).toHaveAttribute("href", "/account/profile");
    expect(screen.queryByRole("link", { name: /Edit Profile/i })).toBeNull();

    // Help & Support card shows appeal link
    expect(screen.getByText("Appeals & Inquiries")).toBeInTheDocument();
    const appealLink = screen.getByRole("link", { name: "Submit Appeal" });
    expect(appealLink).toHaveAttribute("href", "/account/support");

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

    // View Profile link rendered instead of Edit Profile
    expect(screen.getByRole("link", { name: /View Profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Edit Profile/i })).toBeNull();

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

    // View Profile link rendered instead of Edit Profile
    expect(screen.getByRole("link", { name: /View Profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Edit Profile/i })).toBeNull();

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

    expect(screen.getByRole("heading", { name: "Account Security" })).toBeInTheDocument();
    expect(screen.getByText("noaccount@example.com")).toBeInTheDocument();

    // Renders neutral warning banner for unavailable account status
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Account Information Unavailable");

    // Profile card displays View Profile instead of Edit Profile
    expect(screen.getByRole("link", { name: /View Profile/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Edit Profile/i })).toBeNull();

    expect(screen.queryByText("Status:")).toBeNull();
    expect(screen.queryByText("unknown")).toBeNull();
    expect(screen.queryByText("active")).toBeNull();
  });

  it("renders the streamlined four-card layout with primary Manage Settings link", async () => {
    const user = { id: "user-4card-123", email: "user4card@example.com" };
    const account = { user_id: "user-4card-123", account_status: "active" };

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

    // Card 1: My Listings & Favourites
    expect(screen.getByRole("heading", { name: "My Listings" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View My Listings/i })).toHaveAttribute("href", "/account/listings");
    expect(screen.getByRole("link", { name: /Favourites/i })).toHaveAttribute("href", "/account/favourites");

    // Card 2: Messages & Activity
    expect(screen.getByRole("heading", { name: "Messages & Activity" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View Inbox/i })).toHaveAttribute("href", "/account/messages");
    expect(screen.getByRole("link", { name: /Notifications/i })).toHaveAttribute("href", "/account/notifications");

    // Card 3: Account Security & Manage Settings
    expect(screen.getByRole("heading", { name: "Account Security" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Manage Settings/i })).toHaveAttribute("href", "/account/settings");

    // Card 4: Help & Support
    expect(screen.getByRole("heading", { name: "Help & Support" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Support Tickets/i })).toHaveAttribute("href", "/account/support");
  });
});
