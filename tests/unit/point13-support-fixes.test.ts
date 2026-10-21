import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Point 13 Support Ticket Canonical Schema Regression Tests", () => {
  it("account support detail page does not select non-existent resolved_at column", () => {
    const pagePath = path.join(process.cwd(), "src/app/account/support/[id]/page.tsx");
    if (!fs.existsSync(pagePath)) {
      return;
    }
    const content = fs.readFileSync(pagePath, "utf8");

    // Must not query resolved_at from support_tickets table
    expect(content).not.toContain("resolved_at");
  });

  it("support_tickets table definition in migration 13 does not contain resolved_at", () => {
    const migrationPath = path.join(
      process.cwd(),
      "supabase/migrations/20260914000013_create_support_and_appeals.sql"
    );
    if (!fs.existsSync(migrationPath)) {
      return;
    }
    const content = fs.readFileSync(migrationPath, "utf8");

    // Verify canonical schema definition lacks resolved_at
    const tableMatch = content.match(/CREATE TABLE public\.support_tickets \(([\s\S]*?)\);/);
    expect(tableMatch).toBeTruthy();
    expect(tableMatch![1]).not.toContain("resolved_at");
  });
});
