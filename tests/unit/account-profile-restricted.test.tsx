import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import ProfilePage from "@/app/account/profile/page";

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
vi.mock("@/app/account/profile/profile-form", () => ({
  default: () => <div data-testid="profile-form-editable">Editable Profile Form</div>,
}));

describe("Profile Page Account Status Restriction Tests", () => {
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
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { message: "Unauthenticated" } });

    await expect(ProfilePage()).rejects.toThrow("REDIRECT:/auth/sign-in?next=/account/profile");
  });

  it("renders editable profile form for active user", async () => {
    const user = { id: "active-user-123" };
    const profile = { display_name: "Active User", city: "Delhi", state: "Delhi", bio: "Active bio" };
    const account = { account_status: "active" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: profile, error: null }) }) }) };
      }
      if (table === "user_accounts") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: account, error: null }) }) }) };
      }
      return {};
    });

    render(await ProfilePage());

    expect(screen.getByRole("heading", { name: "Edit Public Profile" })).toBeInTheDocument();
    expect(screen.getByTestId("profile-form-editable")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("disables editing form and displays read-only view for suspended user", async () => {
    const user = { id: "suspended-user-123" };
    const profile = { display_name: "Suspended User", city: "Mumbai", state: "Maharashtra", bio: "Suspended bio" };
    const account = { account_status: "suspended" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: profile, error: null }) }) }) };
      }
      if (table === "user_accounts") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: account, error: null }) }) }) };
      }
      return {};
    });

    render(await ProfilePage());

    expect(screen.getByRole("heading", { name: "Public Profile" })).toBeInTheDocument();
    expect(screen.queryByTestId("profile-form-editable")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Your account is suspended. Profile edits are disabled.");
    expect(screen.getByText("Suspended User")).toBeInTheDocument();
  });

  it("disables editing form and displays read-only view for deletion_pending user", async () => {
    const user = { id: "del-user-123" };
    const profile = { display_name: "Pending Del User", city: "Bengaluru", state: "Karnataka", bio: "Pending del bio" };
    const account = { account_status: "deletion_pending" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: profile, error: null }) }) }) };
      }
      if (table === "user_accounts") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: account, error: null }) }) }) };
      }
      return {};
    });

    render(await ProfilePage());

    expect(screen.getByRole("heading", { name: "Public Profile" })).toBeInTheDocument();
    expect(screen.queryByTestId("profile-form-editable")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Your account deletion request is pending. Profile edits are disabled.");
    expect(screen.getByText("Pending Del User")).toBeInTheDocument();
  });

  it("disables editing form and displays read-only view for deleted user", async () => {
    const user = { id: "deleted-user-123" };
    const profile = { display_name: "Deleted User", city: "Kolkata", state: "West Bengal", bio: "Closed bio" };
    const account = { account_status: "deleted" };

    mocks.getUser.mockResolvedValue({ data: { user } });
    mocks.from.mockImplementation((table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: profile, error: null }) }) }) };
      }
      if (table === "user_accounts") {
        return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: account, error: null }) }) }) };
      }
      return {};
    });

    render(await ProfilePage());

    expect(screen.getByRole("heading", { name: "Public Profile" })).toBeInTheDocument();
    expect(screen.queryByTestId("profile-form-editable")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("This account has been closed. Profile edits are disabled.");
    expect(screen.getByText("Deleted User")).toBeInTheDocument();
  });
});
