import { describe, it, expect } from "vitest";
import {
  BioSchema,
  DisplayNameSchema,
  PrivateDetailsSchema,
  parseProfileTriggerError,
  profileErrorMessage,
  validatePublicText,
} from "@/lib/profile/validation";

describe("display name validation", () => {
  it.each(["Rahul Sharma", "Priya", "अनिल कुमार", "Majorie Dsouza", "S. Venkatesh Iyer", "Member-abcdefgh"])(
    "accepts ordinary name %s",
    (name) => {
      expect(validatePublicText(name, "display_name")).toBeNull();
    }
  );

  it("enforces 2-50 characters", () => {
    expect(validatePublicText("A", "display_name")).toBe("LENGTH");
    expect(validatePublicText("a".repeat(51), "display_name")).toBe("LENGTH");
    expect(validatePublicText("  ", "display_name")).toBe("LENGTH");
  });

  it.each([
    ["rahul@gmail.com", "CONTACT_INFO"],
    ["rahul at gmail", null],
    ["98765 43210", "PHONE_NUMBER"],
    ["९८७६५४३२१०", "PHONE_NUMBER"],
    ["9 8 7 6 5 4 3 2 1 0", "PHONE_NUMBER"],
    ["shop.in", "LINK"],
    ["visit www.x", "LINK"],
    ["pay on rahul@upi", "CONTACT_INFO"],
    ["FairSwap Support", "IMPERSONATION"],
    ["F a i r S w a p", "IMPERSONATION"],
    ["F4irSw4p", "IMPERSONATION"],
    ["Ｆａｉｒｓｗａｐ", "IMPERSONATION"],
    ["Fair​Swap", "IMPERSONATION"],
    ["Official Seller", "IMPERSONATION"],
    ["Major Singh", "IMPERSONATION"],
    ["Army Officer Raj", "IMPERSONATION"],
    ["Customer Care", "IMPERSONATION"],
  ])("rejects %s", (name, reason) => {
    expect(validatePublicText(name, "display_name")).toBe(reason);
  });
});

describe("bio validation", () => {
  it("allows empty and normal text", () => {
    expect(BioSchema.safeParse("").success).toBe(true);
    expect(BioSchema.safeParse(null).success).toBe(true);
    expect(BioSchema.safeParse("Selling books and gadgets in Pune since 2020.").success).toBe(true);
  });

  it("rejects contact info, links, UPI and payment instructions", () => {
    expect(validatePublicText("mail me a@b.co", "bio")).toBe("CONTACT_INFO");
    expect(validatePublicText("call 9876543210", "bio")).toBe("PHONE_NUMBER");
    expect(validatePublicText("see https://x.example", "bio")).toBe("LINK");
    expect(validatePublicText("send advance payment first", "bio")).toBe("PAYMENT_INSTRUCTION");
    expect(validatePublicText("pay via GPay", "bio")).toBe("PAYMENT_INSTRUCTION");
    expect(validatePublicText("I am in the Army", "bio")).toBe("IMPERSONATION");
  });

  it("caps at 500 characters", () => {
    expect(validatePublicText("a".repeat(500), "bio")).toBeNull();
    expect(validatePublicText("a".repeat(501), "bio")).toBe("LENGTH");
  });
});

describe("DisplayNameSchema", () => {
  it("trims accepted values and surfaces a specific message", () => {
    expect(DisplayNameSchema.parse("  Asha Rao ")).toBe("Asha Rao");
    const bad = DisplayNameSchema.safeParse("FairSwap Support");
    expect(bad.success).toBe(false);
    if (!bad.success) expect(bad.error.errors[0].message).toMatch(/FairSwap/);
  });
});

describe("PrivateDetailsSchema", () => {
  const uuid = "123e4567-e89b-42d3-a456-426614174000";

  it("accepts valid input and defaults language to English", () => {
    const parsed = PrivateDetailsSchema.parse({ fullName: " Asha  Rao ", pinCode: "560034", localityId: uuid });
    expect(parsed.fullName).toBe("Asha Rao");
    expect(parsed.preferredLanguage).toBe("en");
  });

  it("rejects malformed PINs and non-English language", () => {
    expect(PrivateDetailsSchema.safeParse({ pinCode: "012345", localityId: uuid }).success).toBe(false);
    expect(PrivateDetailsSchema.safeParse({ pinCode: "56003", localityId: uuid }).success).toBe(false);
    expect(PrivateDetailsSchema.safeParse({ pinCode: "5600ab", localityId: uuid }).success).toBe(false);
    expect(PrivateDetailsSchema.safeParse({ pinCode: "560034", localityId: uuid, preferredLanguage: "hi" }).success).toBe(
      false
    );
  });

  it("requires a locality id (never free text)", () => {
    expect(PrivateDetailsSchema.safeParse({ pinCode: "560034", localityId: "Koramangala" }).success).toBe(false);
  });
});

describe("error mapping", () => {
  it("maps backend codes and trigger messages", () => {
    expect(profileErrorMessage("PIN_LOCALITY_MISMATCH")).toMatch(/does not belong/);
    expect(profileErrorMessage("DISTRICT_REQUIRED")).toMatch(/district/i);
    expect(profileErrorMessage("INVALID_BIO", "LINK")).toMatch(/links/);
    expect(parseProfileTriggerError("INVALID_DISPLAY_NAME:IMPERSONATION")).toEqual({
      code: "INVALID_DISPLAY_NAME",
      reason: "IMPERSONATION",
    });
    expect(parseProfileTriggerError("other")).toEqual({});
  });
});
