import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import type {
  PreparedV2Bundle,
  PreparedV2Object,
  V2Bucket,
  V2Variant,
} from "@/lib/media/moderation-v2-node-preparation";

/**
 * Moderation V2 B2d: create-only write intent and point-in-time byte readback.
 * This is NOT an immutable Storage authority, a registered DB seal, an upload
 * endpoint, or a permission to publish. No service-role secrets live here.
 */
export interface RestrictedSealedStorageWriter {
  createNew(args: Readonly<{
    bucket: V2Bucket;
    key: string;
    contentType: PreparedV2Object["mimeType"];
    bytes: Uint8Array;
    upsert: false;
  }>): Promise<Readonly<{ ok: boolean }>>;

  readExact(args: Readonly<{
    bucket: V2Bucket;
    key: string;
  }>): Promise<Readonly<
    { ok: true; bytes: Uint8Array }
    | { ok: false }
  >>;
}

export type V2WriteVerification =
  | Readonly<{
      ok: true;
      scope: "point_in_time_downloaded_bytes_only";
      createOnly: "requested_not_independently_attested";
      storageImmutability: "unverified";
      databaseRegistration: "unverified";
      objects: readonly Readonly<{
        variant: V2Variant;
        objectId: string;
        sha256: string;
        byteLength: number;
      }>[];
    }>
  | Readonly<{
      ok: false;
      code: "INVALID_PREPARATION" | "WRITE_REJECTED" | "READBACK_FAILED" | "DIGEST_MISMATCH" | "CANCELLED";
      /** Opaque object IDs only; no Storage keys/URLs are returned. */
      createdObjectIds: readonly string[];
    }>;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH = /^[0-9a-f]{64}$/;
const VARIANTS: readonly V2Variant[] = ["original", "canonical", "thumb", "medium", "large"];
const MAX_BYTES = 5 * 1024 * 1024;

function hash(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function isByteView(value: unknown): value is Uint8Array {
  return Buffer.isBuffer(value) || (ArrayBuffer.isView(value) &&
    Object.prototype.toString.call(value) === "[object Uint8Array]");
}

function strictPrepareCheck(bundle: PreparedV2Bundle): boolean {
  if (!bundle || bundle.status !== "prepared_only" || bundle.recipe !== "seal_v1" ||
    !UUID_V4.test(bundle.listingId) || !UUID_V4.test(bundle.mediaId) ||
    !UUID_V4.test(bundle.generationId) || !UUID_V4.test(bundle.assetVersion) ||
    !Number.isSafeInteger(bundle.listingRevision) || bundle.listingRevision < 0 ||
    !Number.isInteger(bundle.displayOrder) || bundle.displayOrder < 0 ||
    bundle.displayOrder > 7 || !HASH.test(bundle.sourceSha256) ||
    !bundle.objects || Object.keys(bundle.objects).length !== 5 ||
    !bundle.processorProfile || bundle.processorProfile.runtime !== "node" ||
    bundle.processorProfile.implementation !== "sharp" ||
    typeof bundle.processorProfile.webpCodecVersion !== "string" ||
    !bundle.processorProfile.webpCodecVersion) {
    return false;
  }
  const objectIds: string[] = [];
  const keys: string[] = [];
  for (const variant of VARIANTS) {
    const object = bundle.objects[variant];
    if (!object || object.variant !== variant || object.upsert !== false ||
      !UUID_V4.test(object.objectId) || !HASH.test(object.sha256) ||
      !isByteView(object.bytes) || object.bytes.byteLength === 0 ||
      object.bytes.byteLength > MAX_BYTES ||
      object.byteLength !== object.bytes.byteLength ||
      object.sha256 !== hash(object.bytes) ||
      !Number.isSafeInteger(object.width) || !Number.isSafeInteger(object.height) ||
      object.width < 1 || object.height < 1 ||
      object.width > 8000 || object.height > 8000 ||
      object.width * object.height > 64_000_000) return false;

    const original = variant === "original";
    const expectedBucket: V2Bucket = original || variant === "canonical"
      ? "listing-originals" : "listing-derivatives";
    const expectedMime = original ? (
      object.mimeType === "image/jpeg" || object.mimeType === "image/png" ||
      object.mimeType === "image/webp" ? object.mimeType : null
    ) : "image/webp";
    if (object.bucket !== expectedBucket || !expectedMime ||
      object.mimeType !== expectedMime) return false;
    const extension = original ? expectedMime === "image/jpeg" ? "jpg"
      : expectedMime === "image/png" ? "png" : "webp" : "webp";
    const expectedKey = [
      bundle.listingId, bundle.mediaId, "v2", bundle.assetVersion,
      object.sha256, variant + "." + extension,
    ].join("/");
    if (object.key !== expectedKey) return false;
    objectIds.push(object.objectId);
    keys.push(object.bucket + "/" + object.key);
  }
  return new Set(objectIds).size === 5 &&
    new Set(keys).size === 5 &&
    bundle.objects.original.sha256 === bundle.sourceSha256;
}

/**
 * Call only inside the future approved, isolated sealer runtime. It must pass
 * an independently access-controlled transport with create-only authority.
 *
 * Any failed/ambiguous write or mismatched readback returns failure. Deliberately
 * NEVER delete objects on failure: an existing key may belong to another writer.
 * Trusted reconciliation/retirement owns orphan cleanup and DPDP erasure.
 */
export async function writeAndVerifyPreparedV2Bundle(
  bundle: PreparedV2Bundle,
  storage: RestrictedSealedStorageWriter,
  signal?: AbortSignal,
): Promise<V2WriteVerification> {
  const createdObjectIds: string[] = [];
  let stage: "validation" | "write" | "readback" = "validation";
  const fail = (code: Extract<V2WriteVerification, { ok: false }>["code"]): V2WriteVerification =>
    ({ ok: false, code, createdObjectIds: [...createdObjectIds] });

  try {
    if (!strictPrepareCheck(bundle)) return fail("INVALID_PREPARATION");
    if (signal?.aborted) return fail("CANCELLED");

    stage = "write";
    for (const variant of VARIANTS) {
      const object = bundle.objects[variant];
      if (signal?.aborted) return fail("CANCELLED");

      // Fresh buffer copies prevent the transport from modifying the verified
      // preparation artifact through an aliased Uint8Array.
      const result = await storage.createNew({
        bucket: object.bucket,
        key: object.key,
        contentType: object.mimeType,
        bytes: Buffer.from(object.bytes),
        upsert: false,
      });
      if (!result || result.ok !== true) return fail("WRITE_REJECTED");
      createdObjectIds.push(object.objectId);
      if (signal?.aborted) return fail("CANCELLED");
    }

    stage = "readback";
    const verified: Array<{
      variant: V2Variant;
      objectId: string;
      sha256: string;
      byteLength: number;
    }> = [];
    for (const variant of VARIANTS) {
      if (signal?.aborted) return fail("CANCELLED");
      const expected = bundle.objects[variant];
      const readback = await storage.readExact({
        bucket: expected.bucket,
        key: expected.key,
      });
      if (!readback || readback.ok !== true || !isByteView(readback.bytes)) {
        return fail("READBACK_FAILED");
      }
      const bytes = Buffer.from(readback.bytes);
      if (bytes.byteLength !== expected.byteLength ||
        hash(bytes) !== expected.sha256 ||
        !timingSafeEqual(bytes, expected.bytes)) {
        return fail("DIGEST_MISMATCH");
      }
      verified.push({
        variant,
        objectId: expected.objectId,
        sha256: expected.sha256,
        byteLength: expected.byteLength,
      });
    }

    if (signal?.aborted) return fail("CANCELLED");
    return {
      ok: true,
      scope: "point_in_time_downloaded_bytes_only",
      createOnly: "requested_not_independently_attested",
      storageImmutability: "unverified",
      databaseRegistration: "unverified",
      objects: verified,
    };
  } catch {
    // Never disclose Storage errors, path names, credentials, or internal URLs.
    if (signal?.aborted) return fail("CANCELLED");
    return fail(stage === "write" ? "WRITE_REJECTED" :
      stage === "readback" ? "READBACK_FAILED" : "INVALID_PREPARATION");
  }
}
