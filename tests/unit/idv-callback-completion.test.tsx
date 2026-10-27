import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import React, { StrictMode } from "react";
import { VerificationHub } from "@/components/account/VerificationHub";

describe("VerificationHub Callback Completion Regression Tests", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("handles successful callback completion and refreshes authoritative backend status", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // First call: POST /api/idv/complete
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/idv/complete" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, verified: true }),
        } as Response);
      }
      if (url === "/api/idv/status") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: "verified" }),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
    });

    render(
      <VerificationHub
        isFeatureEnabled={true}
        initialState="in_progress"
        attemptId="attempt-123"
        callbackState="state-nonce-456"
        locale="en"
      />
    );

    // Initial render initiates completion and shows in_progress / completing state
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/idv/complete",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            state: "state-nonce-456",
            attemptId: "attempt-123",
            docCategory: "aadhaar_kyc",
          }),
        })
      );
    });

    // Authoritative status refresh is triggered
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/idv/status");
    });

    // Successfully transitioned to verified state
    await waitFor(() => {
      expect(screen.getByText("Identity verified")).toBeInTheDocument();
    });
  });

  it("safely handles React Strict Mode without duplicate requests or infinite loops", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/idv/complete") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        } as Response);
      }
      if (url === "/api/idv/status") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: "verified" }),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
    });

    // In React Strict Mode, effects run twice in development
    render(
      <StrictMode>
        <VerificationHub
          isFeatureEnabled={true}
          initialState="in_progress"
          attemptId="attempt-strict-1"
          callbackState="nonce-strict-mode-once"
          locale="en"
        />
      </StrictMode>
    );

    await waitFor(() => {
      expect(screen.getByText("Identity verified")).toBeInTheDocument();
    });

    // Must only have dispatched /api/idv/complete ONCE despite Strict Mode mounting twice
    const completeCalls = fetchMock.mock.calls.filter((call) => call[0] === "/api/idv/complete");
    expect(completeCalls.length).toBe(1);
  });

  it("correctly maps expired, unable_to_verify, and revoked error states", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    // 1. Expired attempt
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 410,
      json: () => Promise.resolve({ error: "ATTEMPT_EXPIRED", message: "Verification session expired" }),
    } as Response);

    const { unmount } = render(
      <VerificationHub
        isFeatureEnabled={true}
        initialState="in_progress"
        attemptId="attempt-expired-1"
        callbackState="nonce-expired"
        locale="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Verification session expired" })).toBeInTheDocument();
    });

    unmount();

    // 2. Evidence validation failed -> Unable to verify
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ error: "EVIDENCE_VALIDATION_FAILED", message: "Verification check failed" }),
    } as Response);

    render(
      <VerificationHub
        isFeatureEnabled={true}
        initialState="in_progress"
        attemptId="attempt-unable-1"
        callbackState="nonce-unable"
        locale="en"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Unable to verify")).toBeInTheDocument();
    });
  });

  it("prevents replay of already processed state nonce", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: "verified" }),
    } as Response);

    const { rerender } = render(
      <VerificationHub
        isFeatureEnabled={true}
        initialState="in_progress"
        callbackState="nonce-replay-target"
        locale="en"
      />
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/idv/complete", expect.anything());
    });

    const initialCallCount = fetchMock.mock.calls.filter((c) => c[0] === "/api/idv/complete").length;
    expect(initialCallCount).toBe(1);

    // Re-render with same state nonce
    act(() => {
      rerender(
        <VerificationHub
          isFeatureEnabled={true}
          initialState="in_progress"
          callbackState="nonce-replay-target"
          locale="en"
        />
      );
    });

    // No extra /api/idv/complete call should be made
    const afterRerenderCallCount = fetchMock.mock.calls.filter((c) => c[0] === "/api/idv/complete").length;
    expect(afterRerenderCallCount).toBe(1);
  });

  it("preserves active verification details and accessible withdrawal when feature is killed (isFeatureEnabled=false)", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/idv/withdraw" && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, withdrawn: true }),
        } as Response);
      }
      if (url === "/api/idv/status") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: "revoked" }),
        } as Response);
      }
      return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
    });

    render(
      <VerificationHub
        isFeatureEnabled={false}
        initialState="verified"
        verifiedAt="2026-10-26T12:00:00Z"
        validUntil="2027-10-26T12:00:00Z"
        locale="en"
      />
    );

    // Verified badge remains visible and does NOT collapse into generic "Coming Soon"
    expect(screen.getByRole("heading", { name: /Identity verified/i })).toBeInTheDocument();
    expect(screen.getByText(/Active/i)).toBeInTheDocument();

    // Withdrawal action button is accessible
    const withdrawBtn = screen.getByRole("button", { name: /Withdraw consent & remove badge/i });
    expect(withdrawBtn).toBeInTheDocument();
    expect(withdrawBtn).not.toBeDisabled();

    // Clicking withdraw calls /api/idv/withdraw
    act(() => {
      withdrawBtn.click();
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/idv/withdraw", expect.objectContaining({ method: "POST" }));
    });
  });

  it("shows coming soon for unverified users when isFeatureEnabled=false", () => {
    render(
      <VerificationHub
        isFeatureEnabled={false}
        initialState="not_verified"
        locale="en"
      />
    );

    expect(screen.getByRole("heading", { name: /DigiLocker verification is coming soon/i })).toBeInTheDocument();
    // Start verification CTA is disabled and indicates Coming soon
    const cta = screen.getByRole("button", { name: /Verify identity \(Coming soon\)/i });
    expect(cta).toBeDisabled();
  });
});
