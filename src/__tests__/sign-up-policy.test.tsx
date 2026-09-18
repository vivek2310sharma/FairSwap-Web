import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import SignUpPage from "@/app/auth/sign-up/page";
import { signUpAction } from "@/app/auth/actions";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

// Mock Supabase server client for signUpAction tests
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signUp: vi.fn(async () => ({
        data: { user: { id: "test-user-id" } },
        error: null,
      })),
    },
  })),
}));

// Mock next/navigation redirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Signup Policy Acceptance & 18+ Verification", () => {
  describe("Sign Up Page Component", () => {
    it("renders versioned Terms, Acceptable Use, and Privacy links without draft labels", () => {
      render(<SignUpPage />);
      expect(screen.queryByText(/draft/i)).not.toBeInTheDocument();

      const termsLink = screen.getByRole("link", {
        name: `Terms of Service (v${LEGAL_POLICY.termsVersion})`,
      });
      expect(termsLink).toHaveAttribute("href", "/terms");

      const acceptableUseLink = screen.getByRole("link", {
        name: `Acceptable Use Policy (v${LEGAL_POLICY.acceptableUseVersion})`,
      });
      expect(acceptableUseLink).toHaveAttribute("href", "/acceptable-use");

      const privacyLink = screen.getByRole("link", {
        name: `Privacy Policy (v${LEGAL_POLICY.privacyVersion})`,
      });
      expect(privacyLink).toHaveAttribute("href", "/privacy");
    });

    it("renders required Terms and 18+ checkboxes without pre-checking", () => {
      render(<SignUpPage />);

      const termsCheckbox = screen.getByLabelText(/I accept the/i);
      expect(termsCheckbox).toBeInTheDocument();
      expect(termsCheckbox).toHaveAttribute("type", "checkbox");
      expect(termsCheckbox).toBeRequired();
      expect(termsCheckbox).not.toBeChecked();

      const ageCheckbox = screen.getByLabelText(/I confirm that I am at least 18 years old/i);
      expect(ageCheckbox).toBeInTheDocument();
      expect(ageCheckbox).toHaveAttribute("type", "checkbox");
      expect(ageCheckbox).toBeRequired();
      expect(ageCheckbox).not.toBeChecked();
    });
  });

  describe("signUpAction Server Validation", () => {
    it("fails when terms accepted is missing", async () => {
      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "SecurePassword123!");
      formData.set("displayName", "Test User");
      formData.set("ageConfirmed", "on");

      const result = await signUpAction(null, formData);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("You must accept the Terms of Service and Acceptable Use Policy");
    });

    it("fails when 18+ age confirmation is missing", async () => {
      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "SecurePassword123!");
      formData.set("displayName", "Test User");
      formData.set("termsAccepted", "on");

      const result = await signUpAction(null, formData);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("You must confirm that you are at least 18 years old");
    });

    it("fails when both terms and age confirmation are missing", async () => {
      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "SecurePassword123!");
      formData.set("displayName", "Test User");

      const result = await signUpAction(null, formData);
      expect(result.error).toBeDefined();
    });

    it("passes validation and records legal metadata when all fields are provided", async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const mockSignUp = vi.fn(async () => ({ data: {}, error: null }));
      vi.mocked(createClient).mockResolvedValueOnce({
        auth: { signUp: mockSignUp },
      } as unknown as Awaited<ReturnType<typeof createClient>>);

      const formData = new FormData();
      formData.set("email", "valid@example.com");
      formData.set("password", "SecurePassword123!");
      formData.set("displayName", "Valid User");
      formData.set("termsAccepted", "on");
      formData.set("ageConfirmed", "on");

      await signUpAction(null, formData);

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "valid@example.com",
        password: "SecurePassword123!",
        options: {
          data: {
            display_name: "Valid User",
            terms_accepted: "true",
            terms_version: LEGAL_POLICY.termsVersion,
            privacy_policy_version: LEGAL_POLICY.privacyVersion,
            acceptable_use_version: LEGAL_POLICY.acceptableUseVersion,
            age_confirmed: "true",
            minimum_age_confirmed: LEGAL_POLICY.minimumAge,
          },
          emailRedirectTo: expect.stringContaining("/auth/callback?type=signup&next=/account"),
        },
      });
    });
  });
});
