import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { prepareV2ImageObjects, type V2ImageIdentity } from "@/lib/media/moderation-v2-node-preparation";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const image = (format: "jpeg" | "png" | "webp", width = 240, height = 160) => {
  const instance = sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 120, g: 55, b: 210, alpha: 0.4 },
    },
  });
  if (format === "jpeg") return instance.jpeg({ quality: 90 }).toBuffer();
  if (format === "png") return instance.png().toBuffer();
  return instance.webp({ quality: 88 }).toBuffer();
};
const identity = (bytes: Uint8Array): V2ImageIdentity => ({
  listingId: randomUUID(),
  mediaId: randomUUID(),
  generationId: randomUUID(),
  listingRevision: 3,
  displayOrder: 0,
  sourceSha256: sha256(bytes),
});

describe("Moderation V2 B2c Node image preparation — no Storage or publication", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "%s source produces five create-only, versioned, content-addressed objects",
    async format => {
      const original = await image(format);
      const input = identity(original);
      const result = await prepareV2ImageObjects(input, original);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const { bundle } = result;
      expect(bundle.status).toBe("prepared_only");
      expect(bundle.recipe).toBe("seal_v1");
      expect(bundle.processorProfile.runtime).toBe("node");
      expect(bundle.processorProfile.implementation).toBe("sharp");
      expect(bundle.listingId).toBe(input.listingId);
      expect(bundle.generationId).toBe(input.generationId);
      expect(bundle.sourceSha256).toBe(input.sourceSha256);
      const variants = ["original", "canonical", "thumb", "medium", "large"] as const;
      const objects = variants.map(variant => bundle.objects[variant]);
      expect(objects).toHaveLength(5);
      expect(new Set(objects.map(o => o.objectId)).size).toBe(5);
      expect(new Set(objects.map(o => o.key)).size).toBe(5);
      for (const entry of objects) {
        expect(entry.upsert).toBe(false);
        expect(entry.byteLength).toBe(entry.bytes.byteLength);
        expect(entry.sha256).toBe(sha256(entry.bytes));
        expect(entry.key).toBe(
          [
            input.listingId, input.mediaId, "v2", bundle.assetVersion,
            entry.sha256,
            entry.variant + "." + (entry.variant === "original" ? format === "jpeg" ? "jpg" : format : "webp"),
          ].join("/")
        );
        expect(entry.bucket).toBe(entry.variant === "original" || entry.variant === "canonical"
          ? "listing-originals" : "listing-derivatives");
      }
      expect(bundle.objects.original.bytes).toEqual(original);
      expect(bundle.objects.original.bytes).not.toBe(original);
      expect(bundle.objects.original.sha256).toBe(input.sourceSha256);
      expect(bundle.objects.canonical.mimeType).toBe("image/webp");
      expect(bundle.objects.canonical.width).toBe(240);
      expect(bundle.objects.canonical.height).toBe(160);
      expect(bundle.objects.thumb.width).toBe(200);
      expect(bundle.objects.thumb.height).toBe(200);
      expect(bundle.objects.medium.width).toBe(240);
      expect(bundle.objects.medium.height).toBe(160);
      expect(bundle.objects.large.width).toBe(240);
      expect(bundle.objects.large.height).toBe(160);
      const canonical = await sharp(bundle.objects.canonical.bytes).metadata();
      expect(canonical.width).toBe(240);
      expect(canonical.height).toBe(160);
      expect(canonical.exif).toBeUndefined();
      expect(canonical.icc).toBeUndefined();
      expect(canonical.orientation).toBeUndefined();
    }
  );

  it("renders public variants only from the exact generated canonical image", async () => {
    const source = await image("png", 1600, 900);
    const result = await prepareV2ImageObjects(identity(source), source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { canonical, thumb, medium, large } = result.bundle.objects;
    expect([canonical.width, canonical.height]).toEqual([1600, 900]);
    expect([medium.width, medium.height]).toEqual([800, 450]);
    expect([large.width, large.height]).toEqual([1400, 788]);
    const verify = async (
      item: typeof thumb, w: number, h: number, fit: "cover" | "fill",
    ) => {
      const fromCanonical = await sharp(canonical.bytes)
        .resize(w, h, { fit, position: "centre" })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      expect(item.sha256).toBe(sha256(fromCanonical));
      expect(item.bytes).toEqual(fromCanonical);
    };
    await verify(thumb, 200, 200, "cover");
    await verify(medium, 800, 450, "fill");
    await verify(large, 1400, 788, "fill");
  });

  it("applies EXIF orientation and strips metadata from canonical, preserves raw original", async () => {
    const original = await sharp({
      create: { width: 180, height: 80, channels: 3, background: { r: 90, g: 25, b: 45 } },
    }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const before = await sharp(original).metadata();
    expect(before.orientation).toBe(6);
    const result = await prepareV2ImageObjects(identity(original), original);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { canonical } = result.bundle.objects;
    expect([canonical.width, canonical.height]).toEqual([80, 180]);
    const after = await sharp(canonical.bytes).metadata();
    expect(after.exif).toBeUndefined();
    expect(after.icc).toBeUndefined();
    expect(after.orientation).toBeUndefined();
    expect(result.bundle.objects.original.bytes).toEqual(original);
  });

  it("refuses a caller-provided hash that differs from the actual input bytes", async () => {
    const source = await image("jpeg");
    const input = { ...identity(source), sourceSha256: "0".repeat(64) };
    const result = await prepareV2ImageObjects(input, source);
    expect(result).toEqual({ ok: false, code: "DIGEST_MISMATCH" });
  });

  it("rejects non-image inputs, GIF and oversized buffers before processing", async () => {
    const invalid = Buffer.from("not an image");
    expect(await prepareV2ImageObjects(identity(invalid), invalid)).toEqual({
      ok: false, code: "UNSUPPORTED_MEDIA",
    });
    const gif = Buffer.from("GIF89a", "ascii");
    expect(await prepareV2ImageObjects(identity(gif), gif)).toEqual({
      ok: false, code: "UNSUPPORTED_MEDIA",
    });
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    expect(await prepareV2ImageObjects(identity(oversized), oversized)).toEqual({
      ok: false, code: "UNSUPPORTED_MEDIA",
    });
  });

  it("rejects invalid identities and unexpected additional fields", async () => {
    const source = await image("png");
    const correct = identity(source);
    expect(await prepareV2ImageObjects({ ...correct, listingId: "not-a-uuid" }, source)).toEqual({
      ok: false, code: "SEAL_INVALID",
    });
    const extra = { ...correct, trustedSeal: true } as V2ImageIdentity;
    expect(await prepareV2ImageObjects(extra, source)).toEqual({
      ok: false, code: "SEAL_INVALID",
    });
  });

  it("cancels on an already-aborted signal before decoding pixels", async () => {
    const source = await image("png");
    const controller = new AbortController();
    controller.abort();
    expect(await prepareV2ImageObjects(identity(source), source, controller.signal)).toEqual({
      ok: false, code: "TIMEOUT",
    });
  });
});
