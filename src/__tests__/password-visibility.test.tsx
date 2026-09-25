import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PasswordInput } from "@/components/auth/PasswordInput";
import SignInPage from "@/app/auth/sign-in/page";
import SignUpPage from "@/app/auth/sign-up/page";
import ResetPasswordPage from "@/app/auth/reset-password/page";

// Mock next/navigation
const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
  redirect: vi.fn(),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      updateUser: vi.fn(),
    },
  })),
}));

describe("Password Visibility Affordance (Issue #66)", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  describe("PasswordInput component", () => {
    it("renders as type='password' by default with Show password toggle button", () => {
      render(
        <PasswordInput
          id="test-pwd"
          name="password"
          placeholder="Enter password"
        />
      );

      const input = screen.getByPlaceholderText("Enter password");
      expect(input).toHaveAttribute("type", "password");
      expect(input).toHaveAttribute("id", "test-pwd");
      expect(input).toHaveAttribute("name", "password");

      const toggleBtn = screen.getByRole("button", { name: "Show password" });
      expect(toggleBtn).toBeInTheDocument();
      expect(toggleBtn).toHaveAttribute("type", "button");
      expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
      expect(toggleBtn).toHaveAttribute("aria-controls", "test-pwd");
      expect(toggleBtn).toHaveAttribute("title", "Show password");
    });

    it("toggles input type between 'password' and 'text' upon clicking the toggle button", () => {
      render(
        <PasswordInput
          id="test-pwd"
          name="password"
          placeholder="Enter password"
        />
      );

      const input = screen.getByPlaceholderText("Enter password");
      const toggleBtn = screen.getByRole("button", { name: "Show password" });

      // Click to show password
      fireEvent.click(toggleBtn);
      expect(input).toHaveAttribute("type", "text");
      expect(toggleBtn).toHaveAttribute("aria-label", "Hide password");
      expect(toggleBtn).toHaveAttribute("aria-pressed", "true");
      expect(toggleBtn).toHaveAttribute("title", "Hide password");

      // Click again to hide password
      fireEvent.click(toggleBtn);
      expect(input).toHaveAttribute("type", "password");
      expect(toggleBtn).toHaveAttribute("aria-label", "Show password");
      expect(toggleBtn).toHaveAttribute("aria-pressed", "false");
      expect(toggleBtn).toHaveAttribute("title", "Show password");
    });

    it("supports custom toggle accessible labels", () => {
      render(
        <PasswordInput
          id="confirm-pwd"
          name="confirmPassword"
          placeholder="Confirm password"
          toggleAriaLabel={{
            show: "Show confirm password",
            hide: "Hide confirm password",
          }}
        />
      );

      const toggleBtn = screen.getByRole("button", { name: "Show confirm password" });
      expect(toggleBtn).toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(screen.getByRole("button", { name: "Hide confirm password" })).toBeInTheDocument();
    });

    it("disables both input and toggle button when disabled prop is true", () => {
      render(
        <PasswordInput
          id="disabled-pwd"
          name="password"
          disabled
          placeholder="Disabled password"
        />
      );

      const input = screen.getByPlaceholderText("Disabled password");
      const toggleBtn = screen.getByRole("button", { name: "Show password" });

      expect(input).toBeDisabled();
      expect(toggleBtn).toBeDisabled();
    });
  });

  describe("Sign In page password visibility", () => {
    it("renders password input and allows toggling visibility", () => {
      render(<SignInPage />);

      const passwordInput = screen.getByLabelText(/^Password$/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleBtn = screen.getByRole("button", { name: "Show password" });
      expect(toggleBtn).toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "text");

      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  describe("Sign Up page password visibility", () => {
    it("renders password input and allows toggling visibility", () => {
      render(<SignUpPage />);

      const passwordInput = screen.getByLabelText(/Password \(min\. 8 characters\)/i);
      expect(passwordInput).toHaveAttribute("type", "password");

      const toggleBtn = screen.getByRole("button", { name: "Show password" });
      expect(toggleBtn).toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "text");

      fireEvent.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  describe("Reset Password page password visibility", () => {
    it("renders separate independent visibility toggles for new password and confirm password", () => {
      render(<ResetPasswordPage />);

      const newPasswordInput = screen.getByLabelText(/New Password \(min\. 8 characters\)/i, { selector: "input" });
      const confirmPasswordInput = screen.getByLabelText("Confirm New Password", { selector: "input" });

      expect(newPasswordInput).toHaveAttribute("type", "password");
      expect(confirmPasswordInput).toHaveAttribute("type", "password");

      const toggleNewBtn = screen.getByRole("button", { name: "Show new password" });
      const toggleConfirmBtn = screen.getByRole("button", { name: "Show confirm new password" });

      expect(toggleNewBtn).toBeInTheDocument();
      expect(toggleConfirmBtn).toBeInTheDocument();

      // Toggle new password only
      fireEvent.click(toggleNewBtn);
      expect(newPasswordInput).toHaveAttribute("type", "text");
      expect(confirmPasswordInput).toHaveAttribute("type", "password");

      // Toggle confirm password only
      fireEvent.click(toggleConfirmBtn);
      expect(newPasswordInput).toHaveAttribute("type", "text");
      expect(confirmPasswordInput).toHaveAttribute("type", "text");

      // Toggle new password back to hidden
      fireEvent.click(toggleNewBtn);
      expect(newPasswordInput).toHaveAttribute("type", "password");
      expect(confirmPasswordInput).toHaveAttribute("type", "text");
    });
  });
});
