import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { Constants } from "@/types/database";
import {
  CUSTOMER_SELECTABLE_CATEGORIES,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_TICKET_CATEGORIES,
  createSupportTicketInputSchema,
  formatTicketReference,
  isDefinitiveRpcFailure,
  mapSupportRpcError,
  scamReportInputSchema,
  supportTicketCategorySchema,
} from "@/lib/support/tickets";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

describe("ACC-01 support-ticket contract", () => {
  it("matches the Backend enum in the generated database types", () => {
    expect([...SUPPORT_TICKET_CATEGORIES]).toEqual([
      ...Constants.public.Enums.support_ticket_category_enum,
    ]);
    expect([...SUPPORT_TICKET_CATEGORIES]).toEqual([
      "general",
      "account",
      "moderation_appeal",
      "safety",
      "bug",
    ]);
  });

  it("labels every category and offers only canonical values in the form", () => {
    for (const category of SUPPORT_TICKET_CATEGORIES) {
      expect(SUPPORT_CATEGORY_LABELS[category]).toBeTruthy();
    }
    expect(new Set(CUSTOMER_SELECTABLE_CATEGORIES)).toEqual(new Set(SUPPORT_TICKET_CATEGORIES));
  });

  it("rejects the legacy Web-only category values that the database enum does not contain", () => {
    for (const legacy of ["listing_issue", "safety_concern", "other", "", "GENERAL"]) {
      expect(supportTicketCategorySchema.safeParse(legacy).success, legacy).toBe(false);
      expect(
        createSupportTicketInputSchema.safeParse({ category: legacy, subject: "Hello there", message: "Body" })
          .success,
        legacy
      ).toBe(false);
    }
  });

  it("accepts every canonical category", () => {
    for (const category of SUPPORT_TICKET_CATEGORIES) {
      expect(
        createSupportTicketInputSchema.safeParse({ category, subject: "Hello there", message: "Body" }).success
      ).toBe(true);
    }
  });

  it("enforces the database length limits and trims input", () => {
    const base = { category: "general", subject: "Valid subject", message: "Valid message" };
    expect(createSupportTicketInputSchema.safeParse({ ...base, subject: "ab" }).success).toBe(false);
    expect(createSupportTicketInputSchema.safeParse({ ...base, subject: "x".repeat(151) }).success).toBe(false);
    expect(createSupportTicketInputSchema.safeParse({ ...base, subject: "x".repeat(150) }).success).toBe(true);
    expect(createSupportTicketInputSchema.safeParse({ ...base, message: "   " }).success).toBe(false);
    expect(createSupportTicketInputSchema.safeParse({ ...base, message: "x".repeat(3001) }).success).toBe(false);
    expect(createSupportTicketInputSchema.safeParse({ ...base, message: "x".repeat(3000) }).success).toBe(true);

    const parsed = createSupportTicketInputSchema.parse({ ...base, subject: "  padded  " });
    expect(parsed.subject).toBe("padded");
  });

  it("scam-report schema has no category and requires a meaningful description", () => {
    const parsed = scamReportInputSchema.parse({
      subject: "Fake courier link",
      message: "Someone sent me a delivery link asking for UPI.",
      category: "general",
    });
    expect(parsed).not.toHaveProperty("category");
    expect(scamReportInputSchema.safeParse({ subject: "Fake courier", message: "too short" }).success).toBe(false);
  });

  it("derives a short ticket reference from the UUID instead of a ticket_number column", () => {
    expect(formatTicketReference("9b2f6f1e-1234-4abc-8def-0123456789ab")).toBe("9B2F6F1E");
  });

  it("maps raw RPC errors to safe customer messages", () => {
    expect(mapSupportRpcError("RATE_LIMIT_EXCEEDED: Maximum 3 support tickets allowed per 24 hours")).toMatch(
      /limit of 3 support tickets in 24 hours/
    );
    expect(mapSupportRpcError("Suspended accounts may only submit moderation appeals")).toMatch(/suspended/i);
    expect(mapSupportRpcError("Account restricted")).toMatch(/cannot create support tickets/i);
    const unknown = mapSupportRpcError('duplicate key value violates unique constraint "support_tickets_pkey"');
    expect(unknown).not.toMatch(/duplicate key|constraint|pkey/i);
  });
});

describe("isDefinitiveRpcFailure", () => {
  it("accepts SQLSTATE and PostgREST codes only", () => {
    for (const code of ["P0001", "42501", "23505", "PGRST202"]) {
      expect(isDefinitiveRpcFailure({ code }), code).toBe(true);
    }
    for (const code of [undefined, null, "", "ECONNRESET", "FetchError", "500"]) {
      expect(isDefinitiveRpcFailure({ code }), String(code)).toBe(false);
    }
    expect(isDefinitiveRpcFailure(null)).toBe(false);
  });
});

describe("ACC-01 support source regression", () => {
  const supportSources = [
    "src/app/account/support/page.tsx",
    "src/app/account/support/[id]/page.tsx",
    "src/app/account/support/actions.ts",
    "src/app/account/support/report-scam/page.tsx",
    "src/app/account/support/report-scam/actions.ts",
    "src/components/communication/CreateTicketDialog.tsx",
    "src/types/communication.ts",
  ];

  it("no support source uses non-canonical categories", () => {
    for (const file of supportSources) {
      const content = read(file);
      expect(content, file).not.toMatch(/listing_issue|safety_concern/);
    }
  });

  it("no support source references columns that do not exist in the canonical schema", () => {
    for (const file of supportSources) {
      const content = read(file);
      expect(content, file).not.toContain("ticket_number");
      expect(content, file).not.toContain("is_staff_reply");
      // `resolved_at` is a real column on reports, so only check files that deal with tickets alone.
      if (!file.endsWith("types/communication.ts")) {
        expect(content, file).not.toContain("resolved_at");
      }
      expect(content, file).not.toContain("waiting_customer");
    }
  });

  it("support pages do not read account_status from profiles or embed profiles into messages", () => {
    const list = read("src/app/account/support/page.tsx");
    const detail = read("src/app/account/support/[id]/page.tsx");
    expect(list).toContain('.from("user_accounts")');
    expect(list).not.toMatch(/from\("profiles"\)/);
    expect(detail).not.toMatch(/profiles/);
    expect(detail).not.toMatch(/sender:\s*profiles/);
  });

  it("the scam-report action never writes to reports or uses a client category", () => {
    const action = read("src/app/account/support/report-scam/actions.ts");
    expect(action).not.toMatch(/from\("reports"\)/);
    expect(action).not.toMatch(/rpc\("create_report"/);
    expect(action).toContain('category: "safety"');
    expect(action).not.toMatch(/formData\.get\("category"\)/);
  });

  it("the dialog makes no unverified response-time promise", () => {
    const dialog = read("src/components/communication/CreateTicketDialog.tsx");
    expect(dialog).not.toMatch(/24[–-]48|typically responds|business hours/i);
  });
});
