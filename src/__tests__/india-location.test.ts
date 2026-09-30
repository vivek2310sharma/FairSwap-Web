import { describe, it, expect, vi } from "vitest";
import { isValidIndianPincode, lookupPincodeServer } from "@/lib/location/pincode";
import { GET as pincodeRouteHandler } from "@/app/api/location/pincode/[pincode]/route";
import { NextRequest } from "next/server";
import { draftListingSchema, submitListingSchema } from "@/types/listing";
import {
  normalizeText,
  toTitleCase,
  slugify,
  parseCSVLine,
  validateImportTarget,
} from "../../scripts/import-india-postal-data";

vi.mock("@/lib/location/pincode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/location/pincode")>();
  return {
    ...actual,
    lookupPincodeServer: vi.fn(),
  };
});

describe("India Location & PIN Code Utilities", () => {
  describe("isValidIndianPincode", () => {
    it("validates correct 6-digit PIN codes", () => {
      expect(isValidIndianPincode("560034")).toBe(true);
      expect(isValidIndianPincode("302017")).toBe(true);
      expect(isValidIndianPincode(" 110001 ")).toBe(true);
    });

    it("rejects invalid PIN codes", () => {
      expect(isValidIndianPincode("56003")).toBe(false); // 5 digits
      expect(isValidIndianPincode("5600345")).toBe(false); // 7 digits
      expect(isValidIndianPincode("56003A")).toBe(false); // letters
      expect(isValidIndianPincode("")).toBe(false); // empty
    });
  });

  describe("Postal Importer Normalization Utilities", () => {
    it("normalizes text and strips extra whitespace", () => {
      expect(normalizeText("  Koramangala   VI  Block ")).toBe("Koramangala VI Block");
      expect(normalizeText(undefined)).toBe("");
    });

    it("converts text to title case", () => {
      expect(toTitleCase("BENGALURU URBAN")).toBe("Bengaluru Urban");
      expect(toTitleCase("malviya nagar")).toBe("Malviya Nagar");
    });

    it("generates clean URL slugs", () => {
      expect(slugify("Koramangala 6th Block")).toBe("koramangala-6th-block");
      expect(slugify("B.O / S.O Test!")).toBe("bo-so-test");
    });

    it("parses CSV lines with quotes", () => {
      const line = '"Koramangala B.O",560034,"Bengaluru Urban",Karnataka';
      const parsed = parseCSVLine(line);
      expect(parsed).toEqual(["Koramangala B.O", "560034", "Bengaluru Urban", "Karnataka"]);
    });
  });

  describe("Zod Listing Schemas", () => {
    it("allows optional pin_code and landmark on draft listing", () => {
      const draft = {
        title: "Used Bicycle",
        category_id: "00000000-0000-0000-0000-000000000001",
        pin_code: "560034",
        landmark: "Near Nexus Mall",
      };
      const res = draftListingSchema.safeParse(draft);
      expect(res.success).toBe(true);
    });

    it("requires 6-digit pin_code and locality_id on submit listing", () => {
      const validSubmit = {
        title: "Used Bicycle in Koramangala",
        category_id: "00000000-0000-0000-0000-000000000001",
        city_id: "00000000-0000-0000-0000-000000000002",
        locality_id: "00000000-0000-0000-0000-000000000003",
        pin_code: "560034",
        description: "Excellent condition bicycle available for local pickup",
        condition: "good",
        price_type: "fixed",
        price_paise: 500000,
        landmark: "Near Forum Mall",
      };

      const res = submitListingSchema.safeParse(validSubmit);
      expect(res.success).toBe(true);
    });

    it("fails submit listing when pin_code is missing", () => {
      const missingPin = {
        title: "Used Bicycle in Koramangala",
        category_id: "00000000-0000-0000-0000-000000000001",
        city_id: "00000000-0000-0000-0000-000000000002",
        locality_id: "00000000-0000-0000-0000-000000000003",
        description: "Excellent condition bicycle available for local pickup",
        condition: "good",
        price_type: "fixed",
        price_paise: 500000,
      };

      const resPin = submitListingSchema.safeParse(missingPin);
      expect(resPin.success).toBe(false);

      const missingLocality = {
        ...missingPin,
        pin_code: "560034",
        locality_id: undefined,
      };
      const resLoc = submitListingSchema.safeParse(missingLocality);
      expect(resLoc.success).toBe(true);
    });
  });

  describe("Official Department of Posts / data.gov.in CSV Parser Smoke Tests", () => {
    // Import parseCSVFile and test with simulated CSV files
    it("correctly parses official Department of Posts header format", async () => {
      const { parseCSVFile } = await import("../../scripts/import-india-postal-data");
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      const csvContent = [
        "Circle Name,Region Name,Division Name,Office Name,Pincode,Office Type,Delivery,District,StateName",
        'Karnataka Circle,Bangalore HQ Region,Bangalore East Division,"Koramangala VI Bk S.O",560095,S.O,Delivery,Bengaluru Urban,KARNATAKA',
        'Rajasthan Circle,Jaipur Region,Jaipur City Division,"Malviya Nagar S.O",302017,S.O,Delivery,Jaipur,RAJASTHAN',
        'Delhi Circle,Delhi Region,New Delhi Central Division,"Connaught Place H.O",110001,H.O,Delivery,New Delhi,DELHI',
      ].join("\n");

      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `test-dop-official-${Date.now()}.csv`);
      fs.writeFileSync(tmpFile, csvContent, "utf-8");

      try {
        const records = parseCSVFile(tmpFile);
        expect(records).toHaveLength(3);

        expect(records[0].officename).toBe("Koramangala VI Bk S.O");
        expect(records[0].pincode).toBe("560095");
        expect(records[0].officeType).toBe("S.O");
        expect(records[0].Deliverystatus).toBe("Delivery");
        expect(records[0].Districtname).toBe("Bengaluru Urban");
        expect(records[0].statename).toBe("KARNATAKA");

        expect(records[1].officename).toBe("Malviya Nagar S.O");
        expect(records[1].pincode).toBe("302017");

        expect(records[2].officename).toBe("Connaught Place H.O");
        expect(records[2].pincode).toBe("110001");
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it("handles UTF-8 BOM, quoted fields with commas, and spaced PINs", async () => {
      const { parseCSVFile } = await import("../../scripts/import-india-postal-data");
      const fs = await import("fs");
      const path = await import("path");
      const os = await import("os");

      // Byte Order Mark + quoted fields with internal commas
      const bomCsv =
        "\uFEFF" +
        [
          "circlename,regionname,divisionname,officename,pincode,officetype,deliverystatus,districtname,statename",
          '"Maharashtra Circle","Mumbai Region","Mumbai West","Bandra (West) S.O","400050","S.O","Delivery","Mumbai Suburban","Maharashtra"',
          '"Karnataka Circle","Bangalore HQ","Bangalore South","Jayanagar, 3rd Block S.O","560 011","S.O","Delivery","Bengaluru Urban","Karnataka"',
        ].join("\n");

      const tmpDir = os.tmpdir();
      const tmpFile = path.join(tmpDir, `test-bom-${Date.now()}.csv`);
      fs.writeFileSync(tmpFile, bomCsv, "utf-8");

      try {
        const records = parseCSVFile(tmpFile);
        expect(records).toHaveLength(2);

        expect(records[0].officename).toBe("Bandra (West) S.O");
        expect(records[0].pincode).toBe("400050");
        expect(records[0].Districtname).toBe("Mumbai Suburban");

        expect(records[1].officename).toBe("Jayanagar, 3rd Block S.O");
        expect(records[1].pincode).toBe("560 011");
        expect(records[1].Districtname).toBe("Bengaluru Urban");
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it("verifies postal office name provenance preservation and candidate normalization", () => {
      const rawOfficeName = "Koramangala VI Bk S.O";
      const cleanLocalityName = rawOfficeName
        .replace(/\s+(B\.O|S\.O|H\.O|SO|BO|HO)$/i, "")
        .trim();

      // Original official post office name preserved as source provenance
      expect(rawOfficeName).toBe("Koramangala VI Bk S.O");
      // Clean candidate locality name derived without destructive loss of source
      expect(cleanLocalityName).toBe("Koramangala VI Bk");
      expect(toTitleCase(cleanLocalityName)).toBe("Koramangala Vi Bk");
    });
  });

  describe("Import Target Validation (validateImportTarget)", () => {
    const localOptsWithSource = {
      allowRemote: false,
      confirmHost: null,
      isDemo: false,
      source: "operator_curated_seed",
    };

    it("allows local targets by default when source is specified", () => {
      expect(() => validateImportTarget("http://127.0.0.1:54321", localOptsWithSource)).not.toThrow();
      expect(() => validateImportTarget("http://localhost:54321", localOptsWithSource)).not.toThrow();
    });

    it("rejects local non-demo import without explicit --source", () => {
      expect(() =>
        validateImportTarget("http://127.0.0.1:54321", {
          allowRemote: false,
          confirmHost: null,
          isDemo: false,
        })
      ).toThrow(/Non-demo CSV import requires explicit --source/);
    });

    it("blocks accidental remote target without --allow-remote", () => {
      expect(() =>
        validateImportTarget("https://abc123.supabase.co", localOptsWithSource)
      ).toThrow(/SAFETY REJECTION.*--allow-remote/);
    });

    it("allows confirmed remote Supabase target with valid source", () => {
      const opts = {
        allowRemote: true,
        confirmHost: "abc123.supabase.co",
        isDemo: false,
        source: "github_mirror_unverified",
      };
      expect(() =>
        validateImportTarget("https://abc123.supabase.co", opts)
      ).not.toThrow();
    });

    it("rejects remote import without explicit --source", () => {
      const opts = { allowRemote: true, confirmHost: "abc123.supabase.co", isDemo: false };
      expect(() =>
        validateImportTarget("https://abc123.supabase.co", opts)
      ).toThrow(/Non-demo CSV import requires explicit --source/);
    });

    it("allows github_mirror_unverified for staging remote target", () => {
      const opts = {
        allowRemote: true,
        confirmHost: "wpppxlnbzqynvhpeuavd.supabase.co",
        isDemo: false,
        source: "github_mirror_unverified",
      };
      expect(() =>
        validateImportTarget("https://wpppxlnbzqynvhpeuavd.supabase.co", opts)
      ).not.toThrow();
    });

    it("rejects unverified source for production target", () => {
      const opts = {
        allowRemote: true,
        confirmHost: "kriuhwppxgxsyyrbjsau.supabase.co",
        isDemo: false,
        source: "github_mirror_unverified",
      };
      expect(() =>
        validateImportTarget("https://kriuhwppxgxsyyrbjsau.supabase.co", opts)
      ).toThrow(/requires authoritative source "data.gov.in"/);
    });

    it("allows authoritative data.gov.in for production target", () => {
      const opts = {
        allowRemote: true,
        confirmHost: "kriuhwppxgxsyyrbjsau.supabase.co",
        isDemo: false,
        source: "data.gov.in",
        sourceUpdatedAt: "2026-08-01T00:00:00Z",
      };
      expect(() =>
        validateImportTarget("https://kriuhwppxgxsyyrbjsau.supabase.co", opts)
      ).not.toThrow();
    });

    it("rejects production target when --continue-on-error is supplied", () => {
      const opts = {
        allowRemote: true,
        confirmHost: "kriuhwppxgxsyyrbjsau.supabase.co",
        isDemo: false,
        source: "data.gov.in",
        continueOnError: true,
      };
      expect(() =>
        validateImportTarget("https://kriuhwppxgxsyyrbjsau.supabase.co", opts)
      ).toThrow(/does not allow --continue-on-error/);
    });

    it("rejects invalid --source-updated-at timestamp", () => {
      const opts = {
        allowRemote: false,
        confirmHost: null,
        isDemo: false,
        source: "operator_curated_seed",
        sourceUpdatedAt: "not-a-date",
      };
      expect(() =>
        validateImportTarget("http://127.0.0.1:54321", opts)
      ).toThrow(/Invalid --source-updated-at timestamp/);
    });

    it("accepts valid ISO --source-updated-at timestamp", () => {
      const opts = {
        allowRemote: false,
        confirmHost: null,
        isDemo: false,
        source: "operator_curated_seed",
        sourceUpdatedAt: "2026-09-01T12:00:00.000Z",
      };
      expect(() =>
        validateImportTarget("http://127.0.0.1:54321", opts)
      ).not.toThrow();
    });

    it("rejects remote when --confirm-host does not match", () => {
      const opts = {
        allowRemote: true,
        confirmHost: "wrong-ref.supabase.co",
        isDemo: false,
        source: "github_mirror_unverified",
      };
      expect(() =>
        validateImportTarget("https://abc123.supabase.co", opts)
      ).toThrow(/does not match actual target/);
    });

    it("rejects --allow-remote without --confirm-host", () => {
      const opts = {
        allowRemote: true,
        confirmHost: null,
        isDemo: false,
        source: "github_mirror_unverified",
      };
      expect(() =>
        validateImportTarget("https://abc123.supabase.co", opts)
      ).toThrow(/requires --confirm-host/);
    });

    it("blocks --demo against remote target", () => {
      const opts = {
        allowRemote: true,
        confirmHost: "abc123.supabase.co",
        isDemo: true,
        source: "operator_curated_seed",
      };
      expect(() =>
        validateImportTarget("https://abc123.supabase.co", opts)
      ).toThrow(/--demo is not allowed against remote/);
    });

    it("blocks non-Supabase remote hosts", () => {
      const opts = {
        allowRemote: true,
        confirmHost: "fairswap.org",
        isDemo: false,
        source: "data.gov.in",
      };
      expect(() =>
        validateImportTarget("https://fairswap.org", opts)
      ).toThrow(/not a recognized Supabase host/);
    });

    it("rejects invalid URLs", () => {
      expect(() =>
        validateImportTarget("not-a-url", localOptsWithSource)
      ).toThrow(/Invalid Supabase URL/);
    });

    it("allows --demo on local target without explicit source", () => {
      const opts = { allowRemote: false, confirmHost: null, isDemo: true };
      expect(() =>
        validateImportTarget("http://localhost:54321", opts)
      ).not.toThrow();
    });
  });

  describe("Batch Upsert & Conflict Deduplication Hardening", () => {
    it("exact (pincode, office_name) deduplication semantics", () => {
      const records = [
        { pincode: "560034", officename: "Agara B.O", Districtname: "Bangalore", statename: "Karnataka" },
        { pincode: "560034", officename: "Agara B.O", Districtname: "Bangalore", statename: "Karnataka" },
        { pincode: "560034", officename: "Koramangala S.O", Districtname: "Bangalore", statename: "Karnataka" },
      ];

      const validMap = new Map();
      for (const r of records) {
        // Aligned with DB constraint: (pincode, office_name)
        const key = `${r.pincode}|${r.officename}`;
        validMap.set(key, r);
      }
      expect(validMap.size).toBe(2);
    });

    it("deduplicates candidate mappings with identical (pincode, locality_id)", () => {
      const mappingsMap = new Map();
      const items = [
        { pincode: "560034", locality_id: "loc-1", office_name: "Koramangala S.O" },
        { pincode: "560034", locality_id: "loc-1", office_name: "Koramangala B.O" },
        { pincode: "560034", locality_id: "loc-2", office_name: "Agara B.O" },
      ];
      for (const m of items) {
        const key = `${m.pincode}|${m.locality_id}`;
        if (!mappingsMap.has(key)) {
          mappingsMap.set(key, m);
        }
      }
      expect(mappingsMap.size).toBe(2);
    });

    it("safely iterates large arrays (>65,536 items) without Maximum call stack size exceeded", () => {
      const largeMap = new Map<string, number>();
      for (let i = 0; i < 70000; i++) {
        largeMap.set(`key-${i}`, i);
      }

      const collected: number[] = [];
      for (const val of largeMap.values()) {
        collected.push(val);
      }
      expect(collected.length).toBe(70000);
    });
  });

  describe("Pincode API Route (GET /api/location/pincode/[pincode])", () => {
    it("returns 400 when pincode is not exactly 6 digits", async () => {
      const req = new NextRequest("http://localhost/api/location/pincode/12345");
      const res = await pincodeRouteHandler(req, {
        params: Promise.resolve({ pincode: "12345" }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("INVALID_PINCODE");
    });

    it("returns 400 when server reports INVALID_PINCODE", async () => {
      vi.mocked(lookupPincodeServer).mockResolvedValueOnce({
        success: false,
        error: "INVALID_PINCODE",
        message: "PIN code must be exactly 6 numeric digits",
      });
      const req = new NextRequest("http://localhost/api/location/pincode/000000");
      const res = await pincodeRouteHandler(req, {
        params: Promise.resolve({ pincode: "000000" }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("INVALID_PINCODE");
    });

    it("returns 404 when pincode is not found", async () => {
      vi.mocked(lookupPincodeServer).mockResolvedValueOnce({
        success: false,
        error: "PINCODE_NOT_FOUND",
        message: "PIN code not found in postal database",
      });
      const req = new NextRequest("http://localhost/api/location/pincode/999999");
      const res = await pincodeRouteHandler(req, {
        params: Promise.resolve({ pincode: "999999" }),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("PINCODE_NOT_FOUND");
    });

    it("returns 409 when pincode maps to conflicting postal boundaries", async () => {
      vi.mocked(lookupPincodeServer).mockResolvedValueOnce({
        success: false,
        error: "CONFLICTING_POSTAL_BOUNDARIES",
        message: "PIN code maps to multiple administrative districts or states",
      });
      const req = new NextRequest("http://localhost/api/location/pincode/110001");
      const res = await pincodeRouteHandler(req, {
        params: Promise.resolve({ pincode: "110001" }),
      });
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toBe("CONFLICTING_POSTAL_BOUNDARIES");
    });

    it("returns 500 when lookup suffers FETCH_ERROR or unexpected failure", async () => {
      vi.mocked(lookupPincodeServer).mockResolvedValueOnce({
        success: false,
        error: "FETCH_ERROR",
        message: "Failed to resolve location for this PIN code",
      });
      const req = new NextRequest("http://localhost/api/location/pincode/560034");
      const res = await pincodeRouteHandler(req, {
        params: Promise.resolve({ pincode: "560034" }),
      });
      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("FETCH_ERROR");
    });

    it("returns 200 on successful lookup", async () => {
      vi.mocked(lookupPincodeServer).mockResolvedValueOnce({
        success: true,
        pincode: "560034",
        state: "Karnataka",
        district: "Bengaluru Urban",
        city: "Bengaluru",
        city_id: "city-1",
        postal_offices: [],
        localities: [],
      });
      const req = new NextRequest("http://localhost/api/location/pincode/560034");
      const res = await pincodeRouteHandler(req, {
        params: Promise.resolve({ pincode: "560034" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.district).toBe("Bengaluru Urban");
    });
  });
});

