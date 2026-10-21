import "server-only";

import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  PreparedV2Bundle,
  PreparedV2Object,
  V2Variant,
} from "@/lib/media/moderation-v2-node-preparation";
import type { V2WriteVerification } from "@/lib/media/moderation-v2-storage-readback";

/**
 * Moderation V2 B2e: pure Registry V2 payload contract compiler.
 *
 * Inputs here, including "DB context" and readback verification, are ordinary
 * JavaScript values, NOT privileged/cryptographically authenticated receipts.
 * A successful result MUST NEVER authorize DB registration or publication.
 *
 * Future isolated registrar must independently establish:
 * - listing-locked DB-owned current source context, seller and generation;
 * - verified sealer-only Storage identity and create-only enforcement;
 * - exact live object bytes/provenance and independently authenticated caller;
 * - authorized DB function execution and privacy/retirement policy.
 *
 * SQL authority: Backend draft PR #29, p3_register_bundle and registry schema.
 */

const UUID = z.string().uuid();
const HASH = z.string().regex(/^[0-9a-f]{64}$/);
const RegistryContextSchema = z.object({
  requestId: UUID,
  generationId: UUID,
  listingId: UUID,
  mediaId: UUID,
  listingRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  sourceSha256: HASH,
  requestLane: z.literal("enforce"),
  phase: z.literal("preparation"),
  status: z.literal("awaiting_media"),
  mediaStatus: z.literal("ready"),
  // The current DB-owned source paths, NOT any signed URL or sealed path.
  sourceOriginalKey: z.string().min(1).max(512),
  sourceThumbKey: z.string().min(1).max(512),
  sourceMediumKey: z.string().min(1).max(512),
  sourceLargeKey: z.string().min(1).max(512),
}).strict();
export type V2CandidateRegistryContext = z.infer<typeof RegistryContextSchema>;

const VARIANTS: readonly V2Variant[] = ["original", "canonical", "thumb", "medium", "large"];

export type CandidateRegistryObject = Readonly<{
  object_id: string;
  variant: V2Variant;
  bucket: "listing-originals" | "listing-derivatives";
  logical_key: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
}>;

/**
 * Names match experimental Backend SQL p3_register_bundle argument contract.
 * This object is intentionally NOT a Supabase RPC client and cannot register.
 */
export type V2RegistrationCandidate = Readonly<{
  authority: "NOT_AUTHORIZED_CANDIDATE_ONLY";
  context_status: "UNTRUSTED_SNAPSHOT";
  storage_scope: "POINT_IN_TIME_READBACK_ONLY";
  p_listing: string;
  p_media: string;
  p_revision: number;
  p_asset: string;
  p_source_sha256: string;
  p_objects: readonly CandidateRegistryObject[];
}>;

export type RegistryCandidateResult =
  | Readonly<{ ok: true; candidate: V2RegistrationCandidate }>
  | Readonly<{ ok: false; code: "INVALID_CONTEXT" | "STALE_OR_FORGED_IDENTITY" | "INVALID_READBACK" | "INVALID_OBJECT" }>;

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function canonicalSourceKeys(x: V2CandidateRegistryContext) {
  const prefix = x.listingId + "/" + x.mediaId + "/";
  const expectedOriginal = [
    prefix + "original.jpg",
    prefix + "original.png",
    prefix + "original.webp",
  ];
  return expectedOriginal.includes(x.sourceOriginalKey) &&
    x.sourceThumbKey === prefix + "thumb.webp" &&
    x.sourceMediumKey === prefix + "medium.webp" &&
    x.sourceLargeKey === prefix + "large.webp";
}

function matchObject(
  bundle: PreparedV2Bundle,
  variant: V2Variant,
  current: PreparedV2Object,
): boolean {
  if (!current || current.variant !== variant || current.upsert !== false ||
    !UUID.safeParse(current.objectId).success || !HASH.safeParse(current.sha256).success ||
    !Buffer.isBuffer(current.bytes) || current.byteLength !== current.bytes.length ||
    current.byteLength < 1 || current.byteLength > 5 * 1024 * 1024 ||
    sha256(current.bytes) !== current.sha256 ||
    !Number.isSafeInteger(current.width) || !Number.isSafeInteger(current.height) ||
    current.width < 1 || current.height < 1 ||
    current.width > 8000 || current.height > 8000 ||
    current.width * current.height > 64_000_000) return false;

  const expectedBucket = variant === "original" || variant === "canonical"
    ? "listing-originals" : "listing-derivatives";
  const expectedMime = variant === "original"
    ? current.mimeType : "image/webp";
  if (variant === "original" &&
      !["image/jpeg", "image/png", "image/webp"].includes(expectedMime)) return false;
  if (current.bucket !== expectedBucket || current.mimeType !== expectedMime) return false;
  const ext = variant === "original"
    ? expectedMime === "image/jpeg" ? "jpg" : expectedMime === "image/png" ? "png" : "webp"
    : "webp";
  const expectedKey = [
    bundle.listingId, bundle.mediaId, "v2", bundle.assetVersion,
    current.sha256, variant + "." + ext,
  ].join("/");
  return current.key === expectedKey;
}

export function compileV2RegistrationCandidate(
  contextUnknown: unknown,
  bundle: PreparedV2Bundle,
  receipt: V2WriteVerification,
): RegistryCandidateResult {
  const ctx = RegistryContextSchema.safeParse(contextUnknown);
  if (!ctx.success || !canonicalSourceKeys(ctx.data)) {
    return { ok: false, code: "INVALID_CONTEXT" };
  }
  const x = ctx.data;
  if (!bundle || bundle.status !== "prepared_only" ||
    bundle.recipe !== "seal_v1" || !UUID.safeParse(bundle.assetVersion).success ||
    bundle.listingId !== x.listingId || bundle.mediaId !== x.mediaId ||
    bundle.generationId !== x.generationId ||
    bundle.listingRevision !== x.listingRevision ||
    bundle.sourceSha256 !== x.sourceSha256 ||
    !HASH.safeParse(bundle.sourceSha256).success ||
    !bundle.objects || bundle.objects.original?.sha256 !== x.sourceSha256 ||
    !bundle.processorProfile || bundle.processorProfile.runtime !== "node") {
    return { ok: false, code: "STALE_OR_FORGED_IDENTITY" };
  }
  // In particular do not treat an ordinary "readback passed" flag as a seal.
  if (!receipt || !receipt.ok ||
    receipt.scope !== "point_in_time_downloaded_bytes_only" ||
    receipt.createOnly !== "requested_not_independently_attested" ||
    receipt.storageImmutability !== "unverified" ||
    receipt.databaseRegistration !== "unverified" ||
    !Array.isArray(receipt.objects) || receipt.objects.length !== 5) {
    return { ok: false, code: "INVALID_READBACK" };
  }
  const expectedKeys = Object.keys(bundle.objects);
  if (expectedKeys.length !== 5 ||
    expectedKeys.some(key => !(VARIANTS as readonly string[]).includes(key))) {
    return { ok: false, code: "INVALID_OBJECT" };
  }

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const payload: CandidateRegistryObject[] = [];
  for (const [i, variant] of VARIANTS.entries()) {
    const object = bundle.objects[variant];
    const verified = receipt.objects[i];
    if (!matchObject(bundle, variant, object) ||
      !verified || verified.variant !== variant ||
      verified.objectId !== object.objectId ||
      verified.sha256 !== object.sha256 ||
      verified.byteLength !== object.byteLength ||
      seenIds.has(object.objectId) || seenKeys.has(object.key)) {
      return { ok: false, code: "INVALID_OBJECT" };
    }
    seenIds.add(object.objectId);
    seenKeys.add(object.key);
    payload.push({
      object_id: object.objectId,
      variant,
      bucket: object.bucket,
      logical_key: object.key,
      sha256: object.sha256,
      bytes: object.byteLength,
      width: object.width,
      height: object.height,
    });
  }
  return {
    ok: true,
    candidate: {
      authority: "NOT_AUTHORIZED_CANDIDATE_ONLY",
      context_status: "UNTRUSTED_SNAPSHOT",
      storage_scope: "POINT_IN_TIME_READBACK_ONLY",
      p_listing: x.listingId,
      p_media: x.mediaId,
      p_revision: x.listingRevision,
      p_asset: bundle.assetVersion,
      p_source_sha256: x.sourceSha256,
      p_objects: payload,
    },
  };
}
