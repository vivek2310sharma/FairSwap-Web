import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  guard: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc, auth: { getUser: vi.fn() } }),
}));
vi.mock("@/lib/compliance/policy-acceptance", () => ({ requireCurrentPolicyAcceptance: mocks.guard }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { saveProfileAction } from "@/app/account/actions";

const LOCALITY = "123e4567-e89b-42d3-a456-426614174000";
const CITY = "223e4567-e89b-42d3-a456-426614174001";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("saveProfileAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.guard.mockResolvedValue({ allowed: true });
  });

  it("stops at the policy guard", async () => {
    mocks.guard.mockResolvedValue({ allowed: false, error: "review", requiresPolicyReview: true, redirectTo: "/x" });
    const res = await saveProfileAction(null, form({ displayName: "Asha Rao" }));
    expect(res.requiresPolicyReview).toBe(true);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects an invalid display name before any RPC", async () => {
    const res = await saveProfileAction(null, form({ displayName: "FairSwap Support" }));
    expect(res.error).toMatch(/FairSwap/);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("lets a legacy user save public fields without PIN/locality", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    const res = await saveProfileAction(null, form({ mode: "edit", displayName: "Asha Rao", bio: "Hello" }));
    expect(res.success).toBe(true);
    expect(res.message).toMatch(/PIN code/);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("save_my_profile_details", { p_display_name: "Asha Rao", p_bio: "Hello" });
  });

  it("clears a saved private name without requiring a PIN", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    const res = await saveProfileAction(
      null,
      form({ mode: "edit", displayName: "Asha Rao", fullName: "", initialFullName: "Asha Kumari Rao" })
    );
    expect(res.success).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("save_my_profile_details", {
      p_display_name: "Asha Rao",
      p_bio: "",
      p_clear_full_name: true,
    });
  });

  it("saves a name-only edit without PIN or locality", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    await saveProfileAction(
      null,
      form({ mode: "edit", displayName: "Asha Rao", fullName: "Asha  Rao ", initialFullName: "Asha" })
    );
    const args = mocks.rpc.mock.calls[0][1];
    expect(args).toMatchObject({ p_full_name: "Asha Rao" });
    expect(args).not.toHaveProperty("p_pin_code");
    expect(args).not.toHaveProperty("p_clear_full_name");
  });

  it("omits the name when it is untouched", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    await saveProfileAction(
      null,
      form({ mode: "edit", displayName: "Asha Rao", fullName: "Asha", initialFullName: "Asha", pinCode: "560034", localityId: LOCALITY })
    );
    const args = mocks.rpc.mock.calls[0][1];
    expect(args).not.toHaveProperty("p_full_name");
    expect(args).not.toHaveProperty("p_clear_full_name");
    expect(args).toMatchObject({ p_pin_code: "560034" });
  });

  it("clears the name together with a location change", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    await saveProfileAction(
      null,
      form({ mode: "edit", displayName: "Asha Rao", fullName: "", initialFullName: "Asha", pinCode: "560034", localityId: LOCALITY })
    );
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_clear_full_name: true, p_pin_code: "560034" });
  });

  it("requires PIN and locality for onboarding", async () => {
    const res = await saveProfileAction(null, form({ mode: "onboarding", displayName: "Asha Rao" }));
    expect(res.error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("rejects free-text locality (must be an id)", async () => {
    const res = await saveProfileAction(
      null,
      form({ mode: "onboarding", displayName: "Asha Rao", pinCode: "560034", localityId: "Koramangala" })
    );
    expect(res.error).toMatch(/area/i);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("completes onboarding then redirects to a sanitized next", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null });
    const res = await saveProfileAction(
      null,
      form({
        mode: "onboarding",
        displayName: "Asha Rao",
        pinCode: "560034",
        localityId: LOCALITY,
        cityId: CITY,
        next: "//evil.example",
      })
    );
    expect(res).toMatchObject({ success: true, redirectTo: "/account" });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc.mock.calls[0][0]).toBe("save_my_profile_details");
    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({ p_pin_code: "560034", p_locality_id: LOCALITY, p_city_id: CITY });
  });

  it("maps a server location error and does not write public fields", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: false, error: "PIN_LOCALITY_MISMATCH" }, error: null });
    const res = await saveProfileAction(
      null,
      form({ mode: "edit", displayName: "Asha Rao", pinCode: "560034", localityId: LOCALITY })
    );
    expect(res.success).toBeUndefined();
    expect(res.error).toMatch(/does not belong/);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it("never reports partial success: a rejected save is a single failed RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: { success: false, error: "INVALID_BIO", reason: "LINK" }, error: null });
    const res = await saveProfileAction(
      null,
      form({ mode: "edit", displayName: "Asha Rao", pinCode: "560034", localityId: LOCALITY })
    );
    expect(res.success).toBeUndefined();
    expect(res.error).not.toMatch(/was saved/i);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("maps trigger errors raised by direct database validation", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "INVALID_DISPLAY_NAME:IMPERSONATION" } });
    const res = await saveProfileAction(null, form({ mode: "edit", displayName: "Asha Rao" }));
    expect(res.error).toMatch(/FairSwap|official/i);
  });
});
