import { describe, expect, it } from "vitest";
import {
  planLegacyMediaStorageCleanup,
} from "@/lib/media/legacy-storage-cleanup";

const listingId = "11111111-1111-4111-8111-111111111111";
const mediaId = "22222222-2222-4222-8222-222222222222";
const prefix = `${listingId}/${mediaId}/`;

describe("B2b legacy-only media Storage cleanup planner", () => {
  it("allows exact legacy object paths in their expected buckets", () => {
    const result = planLegacyMediaStorageCleanup(listingId, mediaId, {
      original_storage_path: `${prefix}original.jpg`,
      thumbnail_storage_path: `${prefix}thumb.webp`,
      medium_storage_path: `${prefix}medium.webp`,
      large_storage_path: `${prefix}large.webp`,
    });
    expect(result).toEqual({
      kind: "legacy",
      originals: [`${prefix}original.jpg`],
      derivatives: [
        `${prefix}thumb.webp`,
        `${prefix}medium.webp`,
        `${prefix}large.webp`,
      ],
    });
  });

  it.each(["jpg", "png", "webp"])("permits legacy original.%s with optional derivatives", (ext) => {
    expect(planLegacyMediaStorageCleanup(listingId, mediaId, {
      original_storage_path: `${prefix}original.${ext}`,
      thumbnail_storage_path: null,
      medium_storage_path: undefined,
      large_storage_path: null,
    })).toEqual({
      kind: "legacy",
      originals: [`${prefix}original.${ext}`],
      derivatives: [],
    });
  });

  it("handles unpopulated non-ready legacy records without deleting Storage", () => {
    expect(planLegacyMediaStorageCleanup(listingId, mediaId, {})).toEqual({
      kind: "legacy",
      originals: [],
      derivatives: [],
    });
  });

  it.each([
    "v2/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/original.jpg",
    "v2/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/canonical.webp",
    "v2/33333333-3333-4333-8333-333333333333/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/medium.webp",
  ])("defers every sealed V2 object key: %s", (sealedSuffix) => {
    const result = planLegacyMediaStorageCleanup(listingId, mediaId, {
      original_storage_path: `${prefix}original.png`,
      medium_storage_path: `${prefix}${sealedSuffix}`,
      thumbnail_storage_path: `${prefix}thumb.webp`,
    });
    // Entire record is deferred, even when other paths are ordinary V1 keys.
    expect(result).toEqual({ kind: "deferred" });
  });

  it.each([
    `other-listing/${mediaId}/original.jpg`,
    `${listingId}/different-media/original.jpg`,
    `${prefix}../../media/original.jpg`,
    `${prefix}v2/canonical.webp`,
    `${prefix}original.jpg/extra`,
    `${prefix}original.jpeg`,
    "",
  ])("rejects unexpected original key %j", (original) => {
    expect(planLegacyMediaStorageCleanup(listingId, mediaId, {
      original_storage_path: original,
      thumbnail_storage_path: `${prefix}thumb.webp`,
    })).toEqual({ kind: "deferred" });
  });

  it.each([
    `${prefix}original.webp`,
    `${prefix}thumb.jpeg`,
    `${prefix}v2/thumb.webp`,
    `elsewhere/${mediaId}/thumb.webp`,
    `${prefix}../thumb.webp`,
  ])("rejects non-canonical thumbnail %j", (thumbnail) => {
    expect(planLegacyMediaStorageCleanup(listingId, mediaId, {
      original_storage_path: `${prefix}original.jpg`,
      thumbnail_storage_path: thumbnail,
    })).toEqual({ kind: "deferred" });
  });

  it("rejects malformed identifiers and never constructs a deletion prefix from them", () => {
    expect(planLegacyMediaStorageCleanup("../other", mediaId, {
      original_storage_path: "../other/original.jpg",
    })).toEqual({ kind: "deferred" });

    expect(planLegacyMediaStorageCleanup(listingId, "not-a-uuid", {
      original_storage_path: `${prefix}original.jpg`,
    })).toEqual({ kind: "deferred" });
  });
});
