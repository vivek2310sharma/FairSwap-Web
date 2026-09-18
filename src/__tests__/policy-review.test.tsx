import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PolicyReviewForm } from "@/app/account/policy-review/policy-review-form";
import { recordPolicyReacceptanceAction } from "@/app/account/policy-review/actions";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";
import { redirect } from "next/navigation";

// Mock next/navigation redirect
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRpc = vi.fn();
const mockGetUser = vi.fn();

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      signOut: vi.fn(),
    },
    rpc: mockRpc,
  })),
}));

describe("Policy Review UI and Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "pilot-user-id" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: { success: true },
      error: null,
    });
  });

  describe("PolicyReviewForm Component", () => {
    it("renders versioned Terms, Acceptable Use, and Privacy links without draft labels", () => {
      render(<PolicyReviewForm nextTarget="/account" />);
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

    it("renders required Terms and 18+ checkboxes unchecked by default", () => {
      render(<PolicyReviewForm nextTarget="/account" />);

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

    it("renders a sign out button allowing user to exit without accepting", () => {
      render(<PolicyReviewForm nextTarget="/account" />);
      const signOutButton = screen.getByRole("button", { name: /Sign out of FairSwap/i });
      expect(signOutButton).toBeInTheDocument();
    });
  });

  describe("recordPolicyReacceptanceAction Validation", () => {
    it("fails when terms acceptance is missing", async () => {
      const formData = new FormData();
      formData.set("ageConfirmed", "on");
      formData.set("next", "/account");

      const result = await recordPolicyReacceptanceAction(null, formData);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("You must accept the Terms of Service and Acceptable Use Policy");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("fails when 18+ age confirmation is missing", async () => {
      const formData = new FormData();
      formData.set("termsAccepted", "on");
      formData.set("next", "/account");

      const result = await recordPolicyReacceptanceAction(null, formData);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("You must confirm that you are at least 18 years of age");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("successfully records acceptance via database RPC with server-derived booleans", async () => {
      const formData = new FormData();
      formData.set("termsAccepted", "on");
      formData.set("ageConfirmed", "on");
      formData.set("next", "/account/listings");

      await expect(recordPolicyReacceptanceAction(null, formData)).rejects.toThrow(
        "REDIRECT:/account/listings"
      );

      expect(mockRpc).toHaveBeenCalledWith("record_policy_reacceptance", {
        terms_and_privacy_accepted: true,
        age_confirmed: true,
      });
      expect(redirect).toHaveBeenCalledWith("/account/listings");
    });

    it("sanitizes open redirect targets and falls back to /account", async () => {
      const formData = new FormData();
      formData.set("termsAccepted", "on");
      formData.set("ageConfirmed", "on");
      formData.set("next", "https://evil.com/phishing");

      await expect(recordPolicyReacceptanceAction(null, formData)).rejects.toThrow(
        "REDIRECT:/account"
      );
      expect(redirect).toHaveBeenCalledWith("/account");
    });

    it("preserves internal protected routes such as /admin/reports", async () => {
      const formData = new FormData();
      formData.set("termsAccepted", "on");
      formData.set("ageConfirmed", "on");
      formData.set("next", "/admin/reports");

      await expect(recordPolicyReacceptanceAction(null, formData)).rejects.toThrow(
        "REDIRECT:/admin/reports"
      );
      expect(redirect).toHaveBeenCalledWith("/admin/reports");
    });

    it("handles RPC error safely without crashing", async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: "DB_ERROR", message: "Database failure" },
      });

      const formData = new FormData();
      formData.set("termsAccepted", "on");
      formData.set("ageConfirmed", "on");
      formData.set("next", "/account");

      const result = await recordPolicyReacceptanceAction(null, formData);
      expect(result.error).toBe("Failed to record policy re-acceptance. Please try again.");
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("PolicyReviewPage Server Component", () => {
    it("renders factual preserved pilot notice and not immutable audit log claim", async () => {
      const PolicyReviewPage = (await import("@/app/account/policy-review/page")).default;
      mockRpc.mockResolvedValueOnce({ data: false, error: null }); // stale user

      const pageJsx = await PolicyReviewPage({ searchParams: Promise.resolve({ next: "/account" }) });
      render(pageJsx);

      expect(
        screen.getByText(
          /Your original pilot policy acceptance record remains preserved. This re-acceptance will be recorded separately as versioned policy evidence./i
        )
      ).toBeInTheDocument();
      expect(screen.queryByText(/immutable audit log/i)).not.toBeInTheDocument();
    });

    it("renders restrained temporary service notice and sign-out when policy check returns error", async () => {
      const PolicyReviewPage = (await import("@/app/account/policy-review/page")).default;
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { code: "PGRST_ERROR", message: "RPC failure" },
      });

      const pageJsx = await PolicyReviewPage({ searchParams: Promise.resolve({ next: "/account" }) });
      render(pageJsx);

      expect(screen.getByText(/Unable to Verify Policy Status/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Retry/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Browse Public Listings/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument();
      // Must NOT render the acceptance checkboxes when in error state
      expect(screen.queryByLabelText(/I accept the/i)).not.toBeInTheDocument();
    });
  });
});
