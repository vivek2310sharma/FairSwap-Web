import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SignInPage from "@/app/auth/sign-in/page";

// Mock next/navigation
const mockUsePathname = vi.fn();
const mockUseSearchParams = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
  redirect: vi.fn(),
}));

// Mock Supabase server client
const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      signUp: vi.fn(),
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  })),
}));

describe("FairSwap Email-Only Login Redesign (Issue #82)", () => {
  beforeEach(() => {
    mockUsePathname.mockReset();
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    mockSignInWithPassword.mockReset();
    mockSignInWithOtp.mockReset();
    mockVerifyOtp.mockReset();
    mockGetUser.mockReset();
    mockSignOut.mockReset();

    // Default implementations
    mockSignInWithOtp.mockResolvedValue({ data: { user: null, session: null }, error: null });
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: "test-user", email: "seller@example.com" }, session: { access_token: "tok" } },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: { user: { id: "test-user", email: "seller@example.com" } },
      error: null,
    });
    mockSignInWithPassword.mockResolvedValue({ data: { user: null, session: null }, error: null });
  });

  describe("Layout & Visual Elements", () => {
    it("renders the exact heading 'Sign in to FairSwap'", () => {
      render(<SignInPage />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Sign in to FairSwap");
    });

    it("renders a single email address input with required label and placeholder", () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("id", "email");
      expect(emailInput).toHaveAttribute("name", "email");
      expect(emailInput).toHaveAttribute("placeholder", "you@example.com");
      expect(emailInput).toHaveAttribute("autocomplete", "email");
      expect(emailInput).toBeRequired();
    });

    it("renders full-width Continue primary button with FairSwap green styling", () => {
      render(<SignInPage />);

      const continueBtn = screen.getByRole("button", { name: "Continue" });
      expect(continueBtn).toBeInTheDocument();
      expect(continueBtn).toHaveClass("bg-emerald-700");
      expect(continueBtn).toHaveClass("text-white");
      expect(continueBtn).toHaveClass("w-full");
    });

    it("completely removes Google sign-in UI and references", () => {
      render(<SignInPage />);

      expect(screen.queryByRole("button", { name: /continue with google/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /google/i })).toBeNull();
      expect(screen.queryByText(/use the google account with the same verified email/i)).toBeNull();
      expect(screen.queryByText(/google/i)).toBeNull();
    });

    it("completely removes phone number authentication elements", () => {
      render(<SignInPage />);

      expect(screen.queryByLabelText(/phone/i)).toBeNull();
      expect(screen.queryByLabelText(/mobile/i)).toBeNull();
      expect(screen.queryByPlaceholderText(/phone/i)).toBeNull();
      expect(screen.queryByPlaceholderText(/mobile/i)).toBeNull();
      expect(screen.queryByText(/phone/i)).toBeNull();
    });

    it("completely removes the 'or use email' divider", () => {
      render(<SignInPage />);

      expect(screen.queryByText(/or use email/i)).toBeNull();
    });

    it("preserves close link and create account navigation", () => {
      render(<SignInPage />);

      const closeLink = screen.getByRole("link", { name: "Close" });
      expect(closeLink).toBeInTheDocument();
      expect(closeLink).toHaveAttribute("href", "/");

      const createAccountLink = screen.getByRole("link", { name: /create account/i });
      expect(createAccountLink).toBeInTheDocument();
      expect(createAccountLink).toHaveAttribute("href", "/auth/sign-up");
    });
  });

  describe("Validation & Flow", () => {
    it("shows inline validation error for invalid email address format", () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "invalid-email" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Please provide a valid email address.");
      expect(screen.getByLabelText(/enter your email address/i)).toBeInTheDocument();
    });

    it("proceeds to password step on valid email submission", () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "seller@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Shows entered email with Change button
      expect(screen.getByText("seller@example.com")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();

      // Password input is rendered
      const passwordInput = screen.getByLabelText(/^Password$/i);
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute("type", "password");

      // Sign In button is present
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();

      // OTP alternative option is available
      expect(
        screen.getByRole("button", { name: /email me a one-time code instead/i })
      ).toBeInTheDocument();
    });

    it("allows user to change email and return to Step 1", () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "seller@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      const changeBtn = screen.getByRole("button", { name: "Change" });
      fireEvent.click(changeBtn);

      expect(screen.getByLabelText(/enter your email address/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    });

    it("supports switching to email OTP verification step with 6-digit input", () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "seller@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      const otpOption = screen.getByRole("button", { name: /email me a one-time code instead/i });
      fireEvent.click(otpOption);

      const tokenInput = screen.getByLabelText(/verification code/i);
      expect(tokenInput).toBeInTheDocument();
      expect(tokenInput).toHaveAttribute("pattern", "[0-9]{6}");
      expect(tokenInput).toHaveAttribute("maxLength", "6");
      expect(tokenInput).toHaveAttribute("inputMode", "numeric");
      expect(tokenInput).toHaveAttribute("autoComplete", "one-time-code");

      expect(screen.getByRole("button", { name: /verify & continue/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /sign in with password instead/i })).toBeInTheDocument();
    });

    it("allows switching from OTP step back to password step", () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "seller@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      const otpOption = screen.getByRole("button", { name: /email me a one-time code instead/i });
      fireEvent.click(otpOption);

      const passwordOption = screen.getByRole("button", { name: /sign in with password instead/i });
      fireEvent.click(passwordOption);

      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    });

    it("enforces cooldown on resend and preserves cooldown per email across changes", async () => {
      render(<SignInPage />);

      // Step 1: email A
      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "userA@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Switch to OTP
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      // Resend button should be disabled during send or cooldown
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /(sending code|resend code)/i })).toBeDisabled();
      });

      // Change email to user B
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      const emailInputB = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInputB, { target: { value: "userB@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Send OTP for user B
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /(sending code|resend code)/i })).toBeDisabled();
      });

      // Return to user A: cooldown remains tracked
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      const emailInputA2 = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInputA2, { target: { value: "userA@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      // Cooldown for user A is still active
      expect(screen.getByRole("button", { name: /(sending code|resend code)/i })).toBeDisabled();
    });
  });

  describe("Status & Error Handlers", () => {
    it("renders confirm_continue status banner", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams({ message: "confirm_continue" }));
      render(<SignInPage />);

      expect(
        screen.getByText("Please sign in to continue. If you have just confirmed your email, your account is ready to use.")
      ).toBeInTheDocument();
    });

    it("renders password_reset_success banner", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams({ message: "password_reset_success" }));
      render(<SignInPage />);

      expect(
        screen.getByText("Your password has been successfully updated. You may now sign in.")
      ).toBeInTheDocument();
    });

    it("renders invalid_token error banner", () => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams({ error: "invalid_token" }));
      render(<SignInPage />);

      expect(
        screen.getByText("The confirmation or reset link was invalid or has expired. Please request a new one.")
      ).toBeInTheDocument();
    });
  });

  describe("Attempt & Context Scoped Handling (Issue #82 Addendum)", () => {
    it("does not display OTP acknowledgement notice before the request completes", () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Before clicking OTP send, notice is not present
      expect(
        screen.queryByText(/If this email is associated with an eligible account/i)
      ).toBeNull();
    });

    it("allows method change to password during pending send without being overwritten", async () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Switch to OTP
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();

      // Switch back to password immediately
      fireEvent.click(screen.getByRole("button", { name: /sign in with password instead/i }));
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    });

    it("provides accessible alert semantics on inline errors", () => {
      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "bad-email" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent("Please provide a valid email address.");
    });
  });

  describe("Lifecycle & Timing Controls (Issue #80 & #82 Code Review Fixes)", () => {
    function deferred<T>() {
      let resolve!: (val: T) => void;
      let reject!: (err?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    it("holds OTP send response pending, asserts pending helper/button state, and settles with acknowledgement and cooldown", async () => {
      const def = deferred<{ data: { user: null; session: null }; error: null }>();
      mockSignInWithOtp.mockReturnValueOnce(def.promise);

      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "pending@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Switch to OTP to trigger send
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      // In-flight pending state assertions:
      // 1. Helper text indicates sending in progress, not falsely claiming a code was sent
      expect(screen.getByText("Sending verification code...")).toBeInTheDocument();
      // 2. Resend button indicates in-flight sending
      expect(screen.getByRole("button", { name: /sending code\.\.\./i })).toBeDisabled();
      // 3. No acknowledgement notice shown prematurely
      expect(screen.queryByText(/If this email is associated with an eligible account/i)).toBeNull();

      // Settle response with successful SDK envelope
      def.resolve({ data: { user: null, session: null }, error: null });

      // Settled state assertions:
      await waitFor(() => {
        expect(
          screen.getByText(/If this email is associated with an eligible account/i)
        ).toBeInTheDocument();
      });

      // Neutral helper text
      expect(
        screen.getByText("If you receive a code, enter the 6-digit code here.")
      ).toBeInTheDocument();

      // Cooldown is now actively imposed
      expect(screen.getByRole("button", { name: /resend code/i })).toBeDisabled();
    });

    it("invalidates obsolete send result when user switches from OTP to password during pending send", async () => {
      const def = deferred<{ data: { user: null; session: null }; error: null }>();
      mockSignInWithOtp.mockReturnValueOnce(def.promise);

      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "switch@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Trigger OTP send
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));
      expect(screen.getByText("Sending verification code...")).toBeInTheDocument();

      // While pending, switch to password step
      fireEvent.click(screen.getByRole("button", { name: /sign in with password instead/i }));
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();

      // Settle the delayed send response
      def.resolve({ data: { user: null, session: null }, error: null });

      // Ensure user remains on Password step and the obsolete OTP notice is NOT rendered
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
      expect(screen.queryByText(/If this email is associated with an eligible account/i)).toBeNull();
    });

    it("handles email change A -> B -> A during pending send without leaking results to B or leaving stale notices on A", async () => {
      const defA = deferred<{ data: { user: null; session: null }; error: null }>();
      mockSignInWithOtp.mockReturnValueOnce(defA.promise);

      render(<SignInPage />);

      // Step 1: User A
      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "userA@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Send OTP for User A (held pending)
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));
      expect(screen.getByText("Sending verification code...")).toBeInTheDocument();

      // While pending, change email to User B
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      const emailInputB = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInputB, { target: { value: "userB@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // User B is on Password step
      expect(screen.getByText("userB@example.com")).toBeInTheDocument();
      expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();

      // Settle User A's pending OTP send
      defA.resolve({ data: { user: null, session: null }, error: null });

      // User B must NOT receive User A's acknowledgement notice
      await new Promise((r) => setTimeout(r, 50));
      expect(screen.queryByText(/If this email is associated with an eligible account/i)).toBeNull();
      expect(screen.getByText("userB@example.com")).toBeInTheDocument();

      // Now change back to User A (A -> B -> A)
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      const emailInputA2 = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInputA2, { target: { value: "userA@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      // Cooldown for User A is preserved because the server request succeeded,
      // but no stale notice is lingering
      expect(screen.getByRole("button", { name: /resend code/i })).toBeDisabled();
    });

    it("clears old verification error when starting a resend and displays resend acknowledgement", async () => {
      // First OTP send attempt fails with transport error, allowing immediate resend without cooldown lock
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { status: 500, code: "service_unavailable", message: "Initial send failed" },
      });

      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "verify-retry@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
        expect(
          screen.getByText("Unable to send verification code at this time. Please try again later.")
        ).toBeInTheDocument();
      });

      // Submit an invalid token to produce a verification error
      mockVerifyOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { code: "otp_expired", message: "Code expired" },
      });

      const tokenInput = screen.getByLabelText(/verification code/i);
      fireEvent.change(tokenInput, { target: { value: "000000" } });
      const verifyForm = tokenInput.closest("form")!;
      fireEvent.submit(verifyForm);

      await waitFor(() => {
        expect(
          screen.getByText("The verification code is invalid or has expired. Please check the code and try again.")
        ).toBeInTheDocument();
      });

      // Now trigger resend: the old verification error must be cleared and replaced with resend notice
      mockSignInWithOtp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      // Resend button is enabled because the initial failed send did not impose a cooldown
      const resendBtn = screen.getByRole("button", { name: "Resend code" });
      expect(resendBtn).not.toBeDisabled();
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(
          screen.queryByText("The verification code is invalid or has expired. Please check the code and try again.")
        ).toBeNull();
        expect(
          screen.getByText(/If this email is associated with an eligible account/i)
        ).toBeInTheDocument();
      });
    });

    it("does not impose cooldown on operational send failure and allows immediate retry", async () => {
      // First attempt fails with transport/service error
      mockSignInWithOtp.mockResolvedValueOnce({
        error: { status: 503, code: "service_unavailable", message: "Server error" },
      });

      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "retry@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      await waitFor(() => {
        expect(
          screen.getByText("Unable to send verification code at this time. Please try again later.")
        ).toBeInTheDocument();
      });

      // Helper text must remain strictly neutral and not claim a code was sent
      expect(screen.getByText("If you receive a code, enter the 6-digit code here.")).toBeInTheDocument();

      // Cooldown must NOT be imposed for a failed send: button says "Resend code", not "Resend code (60s)"
      const resendBtn = screen.getByRole("button", { name: "Resend code" });
      expect(resendBtn).not.toBeDisabled();

      // User immediately retries and second attempt succeeds
      mockSignInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      });
      fireEvent.click(resendBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/If this email is associated with an eligible account/i)
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText("If you receive a code, enter the 6-digit code here.")
      ).toBeInTheDocument();
    });

    it("prevents duplicate credential submissions while sign-in request is in-flight", async () => {
      const defLogin = deferred<{ error: { code: string; message: string } }>();
      mockSignInWithPassword.mockReturnValueOnce(defLogin.promise);

      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "user@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      const passwordInput = screen.getByLabelText(/^Password$/i);
      fireEvent.change(passwordInput, { target: { value: "secret123" } });

      const form = passwordInput.closest("form")!;
      fireEvent.submit(form);

      // Submit was dispatched and is pending
      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);
      });
      expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();

      // Attempt duplicate submit while pending
      fireEvent.submit(form);
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1);

      // Settle login with invalid credentials error
      defLogin.resolve({
        error: { code: "invalid_credentials", message: "Invalid credentials" },
      });

      await waitFor(() => {
        expect(
          screen.getByText("We couldn't sign you in with those credentials. Check your email and password and try again.")
        ).toBeInTheDocument();
      });

      // User can recover and submit again
      expect(screen.getByRole("button", { name: "Sign In" })).not.toBeDisabled();
    });

    it("handles simultaneous pending requests for A and B without A's finalizer resetting B's in-flight flag", async () => {
      const defA = deferred<{ data: { user: null; session: null }; error: null }>();
      const defB = deferred<{ data: { user: null; session: null }; error: null }>();
      mockSignInWithOtp.mockReturnValueOnce(defA.promise).mockReturnValueOnce(defB.promise);

      render(<SignInPage />);

      // Start Send A
      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      expect(screen.getByText("Sending verification code...")).toBeInTheDocument();
      await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalledTimes(1));

      // Change to B while A is in flight
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      const emailInputB = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInputB, { target: { value: "bob@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Start Send B while A is still pending
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));
      expect(screen.getByText("Sending verification code...")).toBeInTheDocument();
      await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalledTimes(2));

      // Now resolve Send A while Send B remains pending
      defA.resolve({ data: { user: null, session: null }, error: null });
      await new Promise((r) => setTimeout(r, 50));

      // B must STILL be in flight! A's finalizer must NOT set isSendingOtp to false for B
      expect(screen.getByText("Sending verification code...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sending code..." })).toBeDisabled();

      // Settle Send B
      defB.resolve({ data: { user: null, session: null }, error: null });
      await waitFor(() => {
        expect(
          screen.getByText(/If this email is associated with an eligible account/i)
        ).toBeInTheDocument();
      });
      expect(screen.getByText("If you receive a code, enter the 6-digit code here.")).toBeInTheDocument();
    });

    it("prevents duplicate simultaneous send request if user returns to an email with a send already in-flight", async () => {
      const defA = deferred<{ data: { user: null; session: null }; error: null }>();
      mockSignInWithOtp.mockReturnValueOnce(defA.promise);

      render(<SignInPage />);

      // Start Send A
      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "alice@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      await waitFor(() => expect(mockSignInWithOtp).toHaveBeenCalledTimes(1));

      // Switch to B, then switch back to A while A is STILL in flight
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      const emailInputB = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInputB, { target: { value: "bob@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Return to A
      fireEvent.click(screen.getByRole("button", { name: "Change" }));
      const emailInputA2 = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInputA2, { target: { value: "alice@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));

      // Since send A is still in-flight, returning to A shows the password step with send disabled
      const sendOtpBtn = screen.getByRole("button", { name: "Sending verification code..." });
      expect(sendOtpBtn).toBeDisabled();

      // Attempting to trigger send again while A is pending does not dispatch duplicate request
      fireEvent.click(sendOtpBtn);
      expect(mockSignInWithOtp).toHaveBeenCalledTimes(1);

      // Settle A
      defA.resolve({ data: { user: null, session: null }, error: null });
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /email me a one-time code instead/i })
        ).toBeInTheDocument();
      });
    });

    it("initial countdown correctly returns 60s (not 360s) when page is idle for 5 minutes before send", async () => {
      vi.useFakeTimers();
      try {
        render(<SignInPage />);

        // User sits idle on the sign-in page for 5 minutes (300,000 ms) before entering email
        act(() => {
          vi.advanceTimersByTime(300_000);
        });

        const emailInput = screen.getByLabelText(/enter your email address/i);
        fireEvent.change(emailInput, { target: { value: "idle-user@example.com" } });
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        // Send OTP
        mockSignInWithOtp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: null,
        });

        fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));
        await vi.advanceTimersByTimeAsync(0);

        // The button must display 60s, NOT an inflated 360s!
        expect(screen.getByRole("button", { name: /resend code \(60s\)/i })).toBeInTheDocument();

        // Advance past interval tick -> decrements to 59s
        act(() => {
          vi.advanceTimersByTime(1100);
        });
        expect(screen.getByRole("button", { name: /resend code \((58|59)s\)/i })).toBeInTheDocument();

        // Advance remaining cooldown -> expires, button re-enabled
        act(() => {
          vi.advanceTimersByTime(60_000);
        });
        expect(screen.getByRole("button", { name: "Resend code" })).not.toBeDisabled();
      } finally {
        vi.useRealTimers();
      }
    });

    it("delayed acknowledgement starts 60s countdown from the time of server response, not dispatch", async () => {
      vi.useFakeTimers();
      try {
        const def = deferred<{ data: { user: null; session: null }; error: null }>();
        mockSignInWithOtp.mockReturnValueOnce(def.promise);

        render(<SignInPage />);

        const emailInput = screen.getByLabelText(/enter your email address/i);
        fireEvent.change(emailInput, { target: { value: "delayed@example.com" } });
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

        // Advance 10 seconds while network request is in flight
        act(() => {
          vi.advanceTimersByTime(10_000);
        });

        // Server acknowledges send after 10s
        await act(async () => {
          def.resolve({ data: { user: null, session: null }, error: null });
        });

        // Cooldown starts fresh at 60s from resolution
        expect(screen.getByRole("button", { name: /resend code \(60s\)/i })).toBeInTheDocument();

        act(() => {
          vi.advanceTimersByTime(1100);
        });
        expect(screen.getByRole("button", { name: /resend code \((58|59)s\)/i })).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it("cleans up active interval timers cleanly when component unmounts", () => {
      vi.useFakeTimers();
      try {
        mockSignInWithOtp.mockResolvedValueOnce({
          data: { user: null, session: null },
          error: null,
        });

        const { unmount } = render(<SignInPage />);

        const emailInput = screen.getByLabelText(/enter your email address/i);
        fireEvent.change(emailInput, { target: { value: "unmount@example.com" } });
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));
        fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

        // Unmount component while interval is active
        unmount();

        // Advance time - should not throw any unmounted state update errors
        expect(() => {
          vi.advanceTimersByTime(10_000);
        }).not.toThrow();
      } finally {
        vi.useRealTimers();
      }
    });

    it("respects structured rateLimited flag from server action without English text matching", async () => {
      // Return structured rate-limited response
      mockSignInWithOtp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { status: 429, code: "rate_limit_exceeded", message: "Custom provider backoff" },
      });

      render(<SignInPage />);

      const emailInput = screen.getByLabelText(/enter your email address/i);
      fireEvent.change(emailInput, { target: { value: "ratelimited@example.com" } });
      fireEvent.click(screen.getByRole("button", { name: "Continue" }));
      fireEvent.click(screen.getByRole("button", { name: /email me a one-time code instead/i }));

      await waitFor(() => {
        expect(screen.getByText("Too many requests. Please wait a moment before trying again.")).toBeInTheDocument();
      });

      // Cooldown must be imposed based on structured rate-limit signal
      expect(screen.getByRole("button", { name: /resend code \(\d+s\)/i })).toBeDisabled();
    });

    it("does not catch or swallow Next.js NEXT_REDIRECT errors during password sign-in", async () => {
      const nextRedirectError = {
        digest: "NEXT_REDIRECT;replace;/account;307;",
      };
      mockSignInWithPassword.mockImplementationOnce(() => {
        throw nextRedirectError;
      });

      const originalListeners = process.listeners("unhandledRejection");
      process.removeAllListeners("unhandledRejection");

      let caughtProcessRejection: unknown = null;
      const onUnhandled = (reason: unknown) => {
        caughtProcessRejection = reason;
      };
      process.on("unhandledRejection", onUnhandled);

      try {
        render(<SignInPage />);

        const emailInput = screen.getByLabelText(/enter your email address/i);
        fireEvent.change(emailInput, { target: { value: "redirect@example.com" } });
        fireEvent.click(screen.getByRole("button", { name: "Continue" }));

        const passwordInput = screen.getByLabelText(/^Password$/i);
        fireEvent.change(passwordInput, { target: { value: "Password123!" } });

        const form = passwordInput.closest("form")!;
        fireEvent.submit(form);

        await new Promise((r) => setTimeout(r, 50));

        // Verify the redirect error was re-thrown to the framework (not swallowed)
        expect(caughtProcessRejection).toEqual(nextRedirectError);
        // Verify no failure banner is displayed to the user
        expect(screen.queryByText("An unexpected error occurred. Please try again.")).toBeNull();
      } finally {
        process.removeListener("unhandledRejection", onUnhandled);
        for (const listener of originalListeners) {
          process.on("unhandledRejection", listener);
        }
      }
    });
  });
});
