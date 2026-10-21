import "server-only";

import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";

/**
 * B2c: prepare image bytes in a trusted Node runtime, not in Deno Edge.
 * Does NOT upload, register, seal in Storage, evaluate or publish anything.
 * Backend MODERATION_V2_CONTRACT.md 3.1 remains the source of truth.
 */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_AXIS = 8000;
const MAX_PIXELS = 64_000_000;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const IdentitySchema = z.object({
  listingId: z.string().regex(UUID_V4),
  mediaId: z.string().regex(UUID_V4),
  generationId: z.string().regex(UUID_V4),
  listingRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  displayOrder: z.number().int().min(0).max(7),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

export type V2ImageIdentity = z.infer<typeof IdentitySchema>;
export type V2Variant = "original" | "canonical" | "thumb" | "medium" | "large";
export type V2Bucket = "listing-originals" | "listing-derivatives";
type FailureCode = "UNSUPPORTED_MEDIA" | "DIGEST_MISMATCH" | "SEAL_INVALID" | "TIMEOUT";
type Format = "jpeg" | "png" | "webp";
const VARIANTS: readonly V2Variant[] = ["original", "canonical", "thumb", "medium", "large"];
const MIMES = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export type PreparedV2Object = Readonly<{
  variant: V2Variant;
  objectId: string;
  bucket: V2Bucket;
  key: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  sha256: string;
  byteLength: number;
  width: number;
  height: number;
  upsert: false;
  bytes: Buffer;
}>;
export type PreparedV2Bundle = Readonly<{
  status: "prepared_only";
  recipe: "seal_v1";
  processorProfile: Readonly<{
    runtime: "node";
    implementation: "sharp";
    sharpVersion: string;
    libvipsVersion: string;
    webpCodecVersion: string;
    canonicalWebpQuality: 82;
    derivativeWebpQuality: 80;
    effort: 4;
    alphaBackground: "#ffffff";
  }>;
  listingId: string;
  mediaId: string;
  generationId: string;
  listingRevision: number;
  displayOrder: number;
  assetVersion: string;
  sourceSha256: string;
  objects: Readonly<Record<V2Variant, PreparedV2Object>>;
}>;
export type PreparedV2Result = { ok: true; bundle: PreparedV2Bundle } | { ok: false; code: FailureCode };

class ImagePreparationFailure extends Error {
  constructor(readonly code: FailureCode) { super(code); }
}
function requireImage(ok: unknown, code: FailureCode): asserts ok {
  if (!ok) throw new ImagePreparationFailure(code);
}
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function detectFormat(bytes: Uint8Array): Format | null {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpeg";
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)) return "png";
  if (bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString("ascii") === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString("ascii") === "WEBP") return "webp";
  return null;
}
function validBounds(width: unknown, height: unknown): boolean {
  return typeof width === "number" && typeof height === "number" &&
    Number.isSafeInteger(width) && Number.isSafeInteger(height) &&
    width > 0 && height > 0 && width <= MAX_AXIS && height <= MAX_AXIS &&
    width * height <= MAX_PIXELS;
}
function inside(width: number, height: number, maxEdge: number): [number, number] {
  const factor = Math.min(1, maxEdge / Math.max(width, height));
  return [Math.max(1, Math.round(width * factor)), Math.max(1, Math.round(height * factor))];
}
function notAborted(signal?: AbortSignal) {
  requireImage(!signal?.aborted, "TIMEOUT");
}
function isByteView(value: unknown): value is Uint8Array {
  // Buffer and browser Uint8Array may be created in different JS realms
  // (e.g. Node under Vitest's jsdom). ArrayBuffer.isView is realm-safe;
  // reject DataView and other typed-array element widths.
  return Buffer.isBuffer(value) || (
    ArrayBuffer.isView(value) &&
    Object.prototype.toString.call(value) === "[object Uint8Array]"
  );
}
async function inspectWebp(bytes: Buffer, width: number, height: number) {
  requireImage(bytes.length > 0 && bytes.length <= MAX_BYTES && detectFormat(bytes) === "webp", "UNSUPPORTED_MEDIA");
  const meta = await sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: "error" }).metadata();
  requireImage(meta.format === "webp" && meta.width === width && meta.height === height &&
    (meta.pages ?? 1) === 1 && (meta.orientation ?? 1) === 1 &&
    !meta.exif && !meta.icc && !meta.xmp && !meta.iptc, "SEAL_INVALID");
}

function makeObject(
  identity: V2ImageIdentity,
  assetVersion: string,
  variant: V2Variant,
  bytes: Buffer,
  width: number,
  height: number,
  format: Format,
): PreparedV2Object {
  requireImage(validBounds(width, height) && bytes.length > 0 && bytes.length <= MAX_BYTES, "UNSUPPORTED_MEDIA");
  const digest = sha256(bytes);
  const extension = variant === "original" ? format === "jpeg" ? "jpg" : format : "webp";
  return {
    variant,
    objectId: randomUUID(),
    bucket: variant === "original" || variant === "canonical" ? "listing-originals" : "listing-derivatives",
    key: [identity.listingId, identity.mediaId, "v2", assetVersion, digest, variant + "." + extension].join("/"),
    mimeType: variant === "original" ? MIMES[format] : "image/webp",
    sha256: digest,
    byteLength: bytes.length,
    width,
    height,
    upsert: false,
    bytes: Buffer.from(bytes),
  };
}

/**
 * Input bytes must already have been fetched through a trusted, authorized,
 * bounded private Storage read. Caller identities/hashes must be DB-owned.
 * No public API route should accept this schema directly.
 *
 * Canonical WebP is oriented, metadata-stripped and full-frame (no resizing).
 * ALL three derivatives are rendered exclusively FROM canonical bytes, not
 * independently from mutable original bytes. This is a prepared intent only.
 */
export async function prepareV2ImageObjects(
  untrustedIdentity: V2ImageIdentity,
  untrustedSource: Uint8Array,
  signal?: AbortSignal,
): Promise<PreparedV2Result> {
  try {
    const parsed = IdentitySchema.safeParse(untrustedIdentity);
    requireImage(parsed.success, "SEAL_INVALID");
    const identity = parsed.data;
    requireImage(isByteView(untrustedSource) && untrustedSource.byteLength > 0 &&
      untrustedSource.byteLength <= MAX_BYTES, "UNSUPPORTED_MEDIA");
    notAborted(signal);
    const source = Buffer.from(untrustedSource);
    const format = detectFormat(source);
    requireImage(format, "UNSUPPORTED_MEDIA");
    requireImage(sha256(source) === identity.sourceSha256, "DIGEST_MISMATCH");
    // Inspect headers first, before full decode. Reject animation/multipage.
    const metadata = await sharp(source, {
      limitInputPixels: MAX_PIXELS, failOn: "error", animated: true,
    }).metadata();
    requireImage(metadata.format === format && validBounds(metadata.width, metadata.height) &&
      (metadata.pages ?? 1) === 1 && !(metadata.delay && metadata.delay.length > 0) &&
      (metadata.orientation ?? 1) >= 1 && (metadata.orientation ?? 1) <= 8,
    "UNSUPPORTED_MEDIA");
    notAborted(signal);

    // Preserve exact original separately. Strip orientation, GPS/EXIF/ICC and
    // flatten alpha on the canonical full-frame image only.
    const canonical = await sharp(source, {
      limitInputPixels: MAX_PIXELS, failOn: "error", animated: false,
    }).rotate()
      .flatten({ background: "#ffffff" })
      .toColourspace("srgb")
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const inputWidth = metadata.width!;
    const inputHeight = metadata.height!;
    const swapped = (metadata.orientation ?? 1) >= 5;
    const width = swapped ? inputHeight : inputWidth;
    const height = swapped ? inputWidth : inputHeight;
    await inspectWebp(canonical, width, height);
    notAborted(signal);

    const render = async (w: number, h: number, fit: "cover" | "fill") => {
      notAborted(signal);
      const bytes = await sharp(canonical, { limitInputPixels: MAX_PIXELS, failOn: "error" })
        .resize(w, h, { fit, position: "centre" })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      await inspectWebp(bytes, w, h);
      notAborted(signal);
      return bytes;
    };
    const [mw, mh] = inside(width, height, 800);
    const [lw, lh] = inside(width, height, 1400);
    const thumb = await render(200, 200, "cover");
    const medium = await render(mw, mh, "fill");
    const large = await render(lw, lh, "fill");
    notAborted(signal);

    const assetVersion = randomUUID();
    const objects: Record<V2Variant, PreparedV2Object> = {
      original: makeObject(identity, assetVersion, "original", source, inputWidth, inputHeight, format),
      canonical: makeObject(identity, assetVersion, "canonical", canonical, width, height, format),
      thumb: makeObject(identity, assetVersion, "thumb", thumb, 200, 200, format),
      medium: makeObject(identity, assetVersion, "medium", medium, mw, mh, format),
      large: makeObject(identity, assetVersion, "large", large, lw, lh, format),
    };
    requireImage(VARIANTS.every(variant => objects[variant].sha256 === sha256(objects[variant].bytes)), "SEAL_INVALID");
    requireImage(new Set(VARIANTS.map(variant => objects[variant].objectId)).size === 5, "SEAL_INVALID");
    const webpCodecVersion = sharp.versions.webp;
    requireImage(typeof webpCodecVersion === "string" && webpCodecVersion.length > 0, "SEAL_INVALID");
    return {
      ok: true,
      bundle: {
        status: "prepared_only",
        recipe: "seal_v1",
        processorProfile: {
          runtime: "node",
          implementation: "sharp",
          sharpVersion: sharp.versions.sharp,
          libvipsVersion: sharp.versions.vips,
          webpCodecVersion,
          canonicalWebpQuality: 82,
          derivativeWebpQuality: 80,
          effort: 4,
          alphaBackground: "#ffffff",
        },
        listingId: identity.listingId,
        mediaId: identity.mediaId,
        generationId: identity.generationId,
        listingRevision: identity.listingRevision,
        displayOrder: identity.displayOrder,
        assetVersion,
        sourceSha256: identity.sourceSha256,
        objects,
      },
    };
  } catch (error) {
    return { ok: false, code: error instanceof ImagePreparationFailure ? error.code : "SEAL_INVALID" };
  }
}
