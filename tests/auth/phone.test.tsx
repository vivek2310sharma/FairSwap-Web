import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { PhoneVerificationForm } from "@/components/account/PhoneVerificationForm";
import { isE164PhoneNumber, normalizePhoneNumber } from "@/lib/auth/phone";

const mocks = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  updateUser: vi.fn(),
  verifyOtp: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mocks.signInWithOtp,
      updateUser: mocks.updateUser,
      verifyOtp: mocks.verifyOtp,
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}));

describe("phone auth helpers", () => {
  it("normalizes common phone separators", () => {
    expect(normalizePhoneNumber(" +45 12-34 56 78 ")).toBe("+4512345678");
  });

  it("requires an international E.164-style number", () => {
    expect(isE164PhoneNumber("+4512345678")).toBe(true);
    expect(isE164PhoneNumber("4512345678")).toBe(false);
    expect(isE164PhoneNumber("+0123456789")).toBe(false);
  });
});

describe("PhoneAuthForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithOtp.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
  });

  it("requests an OTP without allowing account creation", async () => {
    render(<PhoneAuthForm next="/account" />);

    fireEvent.change(screen.getByLabelText("Verified Phone Number"), {
      target: { value: "+45 12 34 56 78" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue with phone" }));

    await waitFor(() => {
      expect(mocks.signInWithOtp).toHaveBeenCalledWith({
        phone: "+4512345678",
        options: {
          shouldCreateUser: false,
        },
      });
    });
  });

  it("rejects a phone number without a country code", () => {
    render(<PhoneAuthForm />);

    fireEvent.change(screen.getByLabelText("Verified Phone Number"), {
      target: { value: "12345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue with phone" }));

    expect(screen.getByRole("alert")).toHaveTextContent("international phone number");
    expect(mocks.signInWithOtp).not.toHaveBeenCalled();
  });
});

describe("PhoneVerificationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateUser.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
  });

  it("verifies a phone change with the phone_change OTP type", async () => {
    render(<PhoneVerificationForm />);

    fireEvent.change(screen.getByLabelText("Phone number"), {
      target: { value: "+45 12 34 56 78" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify phone number" }));

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({
        phone: "+4512345678",
      });
    });

    fireEvent.change(await screen.findByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify phone" }));

    await waitFor(() => {
      expect(mocks.verifyOtp).toHaveBeenCalledWith({
        phone: "+4512345678",
        token: "123456",
        type: "phone_change",
      });
    });
  });
});
