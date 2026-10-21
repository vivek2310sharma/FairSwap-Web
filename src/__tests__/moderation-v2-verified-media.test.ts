import { createHash, randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  readVerifiedSealedMedia,
  type TrustedSealedObject,
} from "@/lib/media/verified-media";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

function fixture(): { bytes: Buffer; evidence: TrustedSealedObject } {
  // This is a byte-identity test, not an image decoder test. Only exact keys
  // backed by a separately trusted DB registry may be passed in production.
  const bytes = Buffer.from([82, 73, 70, 70, 8, 0, 0, 0, 87, 69, 66, 80, 0, 1, 2]);
  const listingId = randomUUID();
  const mediaId = randomUUID();
  const assetVersion = randomUUID();
  const digest = sha256(bytes);
  return {
    bytes,
    evidence: {
      listingId,
      mediaId,
      assetVersion,
      sha256: digest,
      byteLength: bytes.byteLength,
      variant: "thumb",
      bucket: "listing-derivatives",
      mimeType: "image/webp",
      key: [listingId, mediaId, "v2", assetVersion, digest, "thumb.webp"].join("/"),
    },
  };
}

describe("Moderation V2 single-project verified-media helper (not wired to live delivery)", () => {
  it("returns only a verified, independently copied byte buffer with no-store intent", async () => {
    const { bytes, evidence } = fixture();
    const download = vi.fn(async (bucket: string, key: string) => {
      expect(bucket).toBe("listing-derivatives");
      expect(key).toBe(evidence.key);
      return bytes;
    });

    const result = await readVerifiedSealedMedia(evidence, { download });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mimeType).toBe("image/webp");
    expect(result.cacheControl).toBe("private, no-store");
    expect(Buffer.from(result.bytes)).toEqual(bytes);
    expect(result.bytes).not.toBe(bytes);

    bytes[bytes.length - 1] ^= 1;
    expect(sha256(result.bytes)).toBe(evidence.sha256);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it("fails closed on changed bytes and mismatched reported length", async () => {
    const { bytes, evidence } = fixture();
    const tampered = Buffer.from(bytes);
    tampered[0] ^= 1;
    expect(await readVerifiedSealedMedia(evidence, {
      download: async () => tampered,
    })).toEqual({ ok: false, reason: "TAMPERED" });

    expect(await readVerifiedSealedMedia({
      ...evidence, byteLength: evidence.byteLength + 1,
    }, { download: async () => bytes })).toEqual({ ok: false, reason: "TAMPERED" });
  });

  it("never reads from Storage for a mismatched or forged object key", async () => {
    const { evidence, bytes } = fixture();
    const download = vi.fn(async () => bytes);

    for (const fake of [
      { ...evidence, key: "another-listing/some-media/thumb.webp" },
      { ...evidence, key: evidence.key.replace("/v2/", "/v3/") },
      { ...evidence, key: evidence.key.replace(evidence.mediaId, randomUUID()) },
      { ...evidence, key: evidence.key + "/unexpected" },
      { ...evidence, bucket: "listing-originals" as const },
    ]) {
      expect(await readVerifiedSealedMedia(fake, { download })).toEqual({
        ok: false, reason: "BAD_EVIDENCE",
      });
    }
    expect(download).not.toHaveBeenCalled();
  });

  it("rejects missing Storage bytes and invalid byte view; no signed URL fallback", async () => {
    const { evidence } = fixture();
    expect(await readVerifiedSealedMedia(evidence, {
      download: async () => { throw Error("object not found"); },
    })).toEqual({ ok: false, reason: "MISSING_BYTES" });

    expect(await readVerifiedSealedMedia(evidence, {
      download: async () => new DataView(new ArrayBuffer(16)) as unknown as Uint8Array,
    })).toEqual({ ok: false, reason: "TAMPERED" });
  });
});
