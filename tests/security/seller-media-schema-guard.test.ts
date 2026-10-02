/**
 * Deterministic source-level guard test: ensures the media mutation guard
 * queries `account_status` (the actual column) and never the legacy `status`
 * column from `user_accounts`.
 *
 * This is a regression guard for the iOS-4.1 compatibility fix.
 */
import { describe, it, expect } from "vitest";
import { mediaApiError } from "@/lib/media/api-contract";
import fs from "fs";
import path from "path";

describe("Media Contract Schema Guards (#103 blocker)", () => {
  const contractSource = fs
    .readFileSync(
      path.join(process.cwd(), "src/lib/media/api-contract.ts"),
      "utf8"
    )
    .replace(/\r\n/g, "\n");

  const databaseTypesSource = fs
    .readFileSync(
      path.join(process.cwd(), "src/types/database.ts"),
      "utf8"
    )
    .replace(/\r\n/g, "\n");

  it("user_accounts table has account_status column (not status) in generated types", () => {
    // Extract the user_accounts Row type block
    const userAccountsMatch = databaseTypesSource.match(
      /user_accounts:\s*\{[\s\S]*?Row:\s*\{([\s\S]*?)\}/
    );
    expect(userAccountsMatch).not.toBeNull();

    const rowBlock = userAccountsMatch![1];
    expect(rowBlock).toContain("account_status:");
    expect(rowBlock).not.toMatch(/^\s+status:/m);
  });

  it("verifySellerMediaMutationGuard selects account_status from user_accounts", () => {
    // Find the user_accounts select statement
    const userAccountsSelect = contractSource.match(
      /\.from\(["']user_accounts["']\)\s*\n\s*\.select\(["']([^"']+)["']\)/
    );
    expect(userAccountsSelect).not.toBeNull();
    expect(userAccountsSelect![1]).toBe("account_status");
  });

  it("verifySellerMediaMutationGuard never selects bare 'status' from user_accounts", () => {
    // Ensure no .from("user_accounts").select("status") pattern exists
    expect(contractSource).not.toMatch(
      /\.from\(["']user_accounts["']\)\s*\n\s*\.select\(["']status["']\)/
    );
  });

  it("verifySellerMediaMutationGuard compares account_status (not status) to 'active'", () => {
    // The active check must reference account_status, not status
    expect(contractSource).toMatch(/account_status[^}]*!==\s*["']active["']/);
  });

  it("sanitizer regex uses precise SQLSTATE pattern, not greedy 5-char uppercase", () => {
    // The old regex [0-9A-Z]{5} would false-positive on codes like PHOTO, COVER, MEDIA
    // The new regex should use anchored patterns
    expect(contractSource).not.toContain("[0-9A-Z]{5}");
    // Should use word-boundary anchored SQLSTATE pattern
    expect(contractSource).toMatch(/\\b\[0-9\]\{2\}\[A-Z0-9\]\{3\}\\b/);
  });

  it("listing lookup separates DB error (503) from missing entity (404)", () => {
    // Ensure listingError is checked separately from !listing
    // The guard function should have two distinct if blocks for these cases
    const guardFunction = contractSource.match(
      /async function verifySellerMediaMutationGuard[\s\S]*?^}/m
    );
    expect(guardFunction).not.toBeNull();

    const guardBody = guardFunction![0];

    // DB error -> MEDIA_SERVICE_UNAVAILABLE (503)
    expect(guardBody).toContain('if (listingError)');
    expect(guardBody).toMatch(
      /if \(listingError\)[\s\S]*?MEDIA_SERVICE_UNAVAILABLE/
    );

    // Missing/non-owner -> LISTING_NOT_FOUND (404)
    expect(guardBody).toContain('if (!listing || listing.seller_id !== user.id)');
  });
});

describe("Runtime Sanitizer Behavior Invariants (Section 11)", () => {
  it("SAFE CUSTOM MESSAGE: 'Failed to parse form data.' remains unchanged", async () => {
    const res = mediaApiError("INVALID_MEDIA_REQUEST", "Failed to parse form data.");
    const json = await res.json();
    expect(json.message).toBe("Failed to parse form data.");
    expect(json.code).toBe("INVALID_MEDIA_REQUEST");
  });

  it("SAFE CUSTOM MESSAGE: 'Cannot reorder pending photos.' remains unchanged", async () => {
    const res = mediaApiError("MEDIA_REORDER_FAILED", "Cannot reorder pending photos.");
    const json = await res.json();
    expect(json.message).toBe("Cannot reorder pending photos.");
    expect(json.code).toBe("MEDIA_REORDER_FAILED");
  });

  it("INTERNAL: 'SQLSTATE 42501 public.listing_media' is replaced by canonical safe message", async () => {
    const res = mediaApiError("MEDIA_DELETE_FAILED", "SQLSTATE 42501 public.listing_media permission denied");
    const json = await res.json();
    expect(json.message).not.toContain("SQLSTATE");
    expect(json.message).not.toContain("public.listing_media");
    expect(json.message).toBe("Failed to delete media asset. Please try again.");
  });

  it("INTERNAL: 'Bearer secret-marker' is replaced by canonical safe message", async () => {
    const res = mediaApiError("MEDIA_SERVICE_UNAVAILABLE", "Upstream returned Bearer secret-marker-token-123");
    const json = await res.json();
    expect(json.message).not.toContain("Bearer");
    expect(json.message).not.toContain("secret-marker");
    expect(json.message).toBe("Media service is temporarily unavailable. Please try again later.");
  });

  it("INTERNAL: 'listing-originals/private/object.jpg' is replaced by canonical safe message", async () => {
    const res = mediaApiError("MEDIA_UPLOAD_FAILED", "Upload failed at listing-originals/private/object.jpg");
    const json = await res.json();
    expect(json.message).not.toContain("listing-originals");
    expect(json.message).not.toContain("private/object.jpg");
    expect(json.message).toBe("Failed to upload image. Please try again.");
  });
});
