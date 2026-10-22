import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { fetchMyListingCounts } from "@/lib/listings/my-ads";

describe("Security & Cross-User Isolation: get_my_listing_counts RPC Contract", () => {
  it("verifies the SQL contract definition file exists with SECURITY INVOKER and required security enforcement", () => {
    const sqlPath = path.resolve(process.cwd(), "tests/security/sql/get_my_listing_counts.sql");
    expect(fs.existsSync(sqlPath)).toBe(true);

    const sql = fs.readFileSync(sqlPath, "utf8");
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.get_my_listing_counts()");
    expect(sql).toContain("SECURITY INVOKER");
    expect(sql).not.toContain("SECURITY DEFINER");
    expect(sql).toContain("SET search_path = public, pg_temp");
    expect(sql).toContain("auth.uid()");
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.get_my_listing_counts() FROM PUBLIC;");
    expect(sql).toContain("GRANT EXECUTE ON FUNCTION public.get_my_listing_counts() TO authenticated;");
  });

  it("restricts counts strictly to authenticated caller's listings and prevents cross-user leakage", async () => {
    const userAListings = [
      { seller_id: "user-A", status: "active" },
      { seller_id: "user-A", status: "reserved" },
      { seller_id: "user-A", status: "draft" },
      { seller_id: "user-A", status: "rejected" },
    ];

    const mockSupabaseForUserA = {
      rpc: vi.fn(async () => {
        // Simulates RPC executing with auth.uid() = 'user-A'
        return {
          data: {
            all: userAListings.length,
            active: userAListings.filter((l) => l.status === "active" || l.status === "reserved").length,
            pending_review: 0,
            draft: userAListings.filter((l) => l.status === "draft").length,
            rejected: userAListings.filter((l) => l.status === "rejected").length,
            paused: 0,
            sold: 0,
            expired: 0,
          },
          error: null,
        };
      }),
      from: vi.fn(),
    };

    const countsUserA = await fetchMyListingCounts(
      mockSupabaseForUserA as unknown as SupabaseClient<Database>,
      "user-A"
    );

    expect(mockSupabaseForUserA.rpc).toHaveBeenCalledWith("get_my_listing_counts");
    expect(countsUserA.all).toBe(4);
    expect(countsUserA.active).toBe(2); // active + reserved
    expect(countsUserA.draft).toBe(1);
    expect(countsUserA.rejected).toBe(1);
  });

  it("handles unauthenticated or anonymous access safely without leaking data", async () => {
    const mockSupabaseAnon = {
      rpc: vi.fn(async () => {
        // Simulates RPC executing for unauthenticated caller where auth.uid() IS NULL
        return {
          data: {
            all: 0,
            active: 0,
            pending_review: 0,
            draft: 0,
            rejected: 0,
            paused: 0,
            sold: 0,
            expired: 0,
          },
          error: null,
        };
      }),
      from: vi.fn(),
    };

    const countsAnon = await fetchMyListingCounts(
      mockSupabaseAnon as unknown as SupabaseClient<Database>,
      "anon-id"
    );

    expect(countsAnon.all).toBe(0);
    expect(countsAnon.active).toBe(0);
    expect(countsAnon.draft).toBe(0);
    expect(countsAnon.rejected).toBe(0);
  });
});
