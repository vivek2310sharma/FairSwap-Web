import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SignInPage from "@/app/auth/sign-in/page";
import SignUpPage from "@/app/auth/sign-up/page";
import { AccountNav } from "@/components/account/AccountNav";

// Mock next/navigation
const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
  redirect: vi.fn(),
}));

// Mock Supabase server client for any actions or auth calls
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
    },
  })),
}));

describe("Auth Entry Close Control (Issue #72)", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  describe("Sign In page close affordance", () => {
    it("renders a Close link navigating to '/'", () => {
      render(<SignInPage />);

      const closeLink = screen.getByRole("link", { name: "Close" });
      expect(closeLink).toBeInTheDocument();
      expect(closeLink).toHaveAttribute("href", "/");
    });

    it("has accessible name and tooltip title", () => {
      render(<SignInPage />);

      const closeLink = screen.getByRole("link", { name: "Close" });
      expect(closeLink).toHaveAttribute("aria-label", "Close");
      expect(closeLink).toHaveAttribute("title", "Close");
    });

    it("preserves navigation to Create Account", () => {
      render(<SignInPage />);

      const createAccountLink = screen.getByRole("link", {
        name: /create account/i,
      });
      expect(createAccountLink).toBeInTheDocument();
      expect(createAccountLink).toHaveAttribute("href", "/auth/sign-up");
    });
  });

  describe("Sign Up page close affordance", () => {
    it("renders a Close link navigating to '/'", () => {
      render(<SignUpPage />);

      const closeLink = screen.getByRole("link", { name: "Close" });
      expect(closeLink).toBeInTheDocument();
      expect(closeLink).toHaveAttribute("href", "/");
    });

    it("has accessible name and tooltip title", () => {
      render(<SignUpPage />);

      const closeLink = screen.getByRole("link", { name: "Close" });
      expect(closeLink).toHaveAttribute("aria-label", "Close");
      expect(closeLink).toHaveAttribute("title", "Close");
    });

    it("preserves navigation to Sign In", () => {
      render(<SignUpPage />);

      const signInLink = screen.getByRole("link", {
        name: /sign in/i,
      });
      expect(signInLink).toBeInTheDocument();
      expect(signInLink).toHaveAttribute("href", "/auth/sign-in");
    });
  });

  describe("AccountNav regression check", () => {
    it("does NOT contain a Close or Close Account control in authenticated AccountNav", () => {
      mockUsePathname.mockReturnValue("/account/listings");
      render(<AccountNav />);

      // Should have the Account navigation landmark
      const nav = screen.getByRole("navigation", {
        name: "Account navigation",
      });
      expect(nav).toBeInTheDocument();

      // Ensure no close control exists anywhere in the rendered component
      expect(screen.queryByRole("link", { name: "Close" })).toBeNull();
      expect(screen.queryByRole("link", { name: "Close account" })).toBeNull();
      expect(screen.queryByRole("button", { name: /close/i })).toBeNull();

      // Ensure all links in AccountNav are valid account sections, not /
      const links = screen.getAllByRole("link");
      for (const link of links) {
        expect(link.getAttribute("href")).toMatch(/^\/account/);
      }
    });
  });
});
