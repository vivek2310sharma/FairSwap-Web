import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  prepareV2ImageObjects,
  type PreparedV2Bundle,
} from "@/lib/media/moderation-v2-node-preparation";
import {
  writeAndVerifyPreparedV2Bundle,
  type V2WriteVerification,
  type RestrictedSealedStorageWriter,
} from "@/lib/media/moderation-v2-storage-readback";
import {
  compileV2RegistrationCandidate,
  type V2CandidateRegistryContext,
} from "@/lib/media/moderation-v2-registry-candidate";

const digest = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

async function fixture() {
  const source = await sharp({
    create: {
      width: 120, height: 80, channels: 3,
      background: { r: 19, g: 70, b: 152 },
    },
  }).jpeg().toBuffer();
  const context: V2CandidateRegistryContext = {
    requestId: randomUUID(),
    generationId: randomUUID(),
    listingId: randomUUID(),
    mediaId: randomUUID(),
    listingRevision: 4,
    sourceSha256: digest(source),
    requestLane: "enforce",
    phase: "preparation",
    status: "awaiting_media",
    mediaStatus: "ready",
    sourceOriginalKey: "",
    sourceThumbKey: "",
    sourceMediumKey: "",
    sourceLargeKey: "",
  };
  const prefix = context.listingId + "/" + context.mediaId + "/";
  context.sourceOriginalKey = prefix + "original.jpg";
  context.sourceThumbKey = prefix + "thumb.webp";
  context.sourceMediumKey = prefix + "medium.webp";
  context.sourceLargeKey = prefix + "large.webp";

  const prep = await prepareV2ImageObjects({
    listingId: context.listingId,
    mediaId: context.mediaId,
    generationId: context.generationId,
    listingRevision: context.listingRevision,
    displayOrder: 0,
    sourceSha256: context.sourceSha256,
  }, source);
  expect(prep.ok).toBe(true);
  if (!prep.ok) throw Error("Unexpected image fixture preparation failure");
  const bundle = prep.bundle;
  const store = new Map<string, Buffer>();
  const writer: RestrictedSealedStorageWriter = {
    async createNew({ bucket, key, bytes, upsert }) {
      const storageKey = bucket + "/" + key;
      if (upsert || store.has(storageKey)) return { ok: false };
      store.set(storageKey, Buffer.from(bytes));
      return { ok: true };
    },
    async readExact({ bucket, key }) {
      const bytes = store.get(bucket + "/" + key);
      return bytes ? { ok: true, bytes: Buffer.from(bytes) } : { ok: false };
    },
  };
  const verification = await writeAndVerifyPreparedV2Bundle(bundle, writer);
  expect(verification.ok).toBe(true);
  if (!verification.ok) throw Error("Unexpected fixture readback failure");
  return { context, bundle, verification };
}

describe("V2 B2e pure Backend registration candidate / no DB authority", () => {
  it("maps exactly five real byte identities to Backend p3_register_bundle's eight-field SQL JSON", async () => {
    const { context, bundle, verification } = await fixture();
    const result = compileV2RegistrationCandidate(context, bundle, verification);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { candidate } = result;
    expect(candidate.authority).toBe("NOT_AUTHORIZED_CANDIDATE_ONLY");
    expect(candidate.context_status).toBe("UNTRUSTED_SNAPSHOT");
    expect(candidate.storage_scope).toBe("POINT_IN_TIME_READBACK_ONLY");
    expect(candidate.p_listing).toBe(context.listingId);
    expect(candidate.p_media).toBe(context.mediaId);
    expect(candidate.p_revision).toBe(context.listingRevision);
    expect(candidate.p_asset).toBe(bundle.assetVersion);
    expect(candidate.p_source_sha256).toBe(context.sourceSha256);
    expect(candidate.p_objects).toHaveLength(5);
    expect(candidate.p_objects.map(x => x.variant)).toEqual([
      "original", "canonical", "thumb", "medium", "large",
    ]);
    for (const object of candidate.p_objects) {
      expect(Object.keys(object).sort()).toEqual([
        "object_id", "variant", "bucket", "logical_key", "sha256",
        "bytes", "width", "height",
      ].sort());
      const source = bundle.objects[object.variant];
      expect(object.object_id).toBe(source.objectId);
      expect(object.logical_key).toBe(source.key);
      expect(object.sha256).toBe(digest(source.bytes));
      expect(object.bytes).toBe(source.bytes.byteLength);
      expect(object.bucket).toBe(source.bucket);
      expect(object.width).toBe(source.width);
      expect(object.height).toBe(source.height);
      expect(object.logical_key).toContain(
        "/" + bundle.assetVersion + "/" + object.sha256 + "/",
      );
    }
  });

  it("rejects invalid DB context / incorrect source V1 path", async () => {
    const { context, bundle, verification } = await fixture();
    const spoofed = { ...context, sourceOriginalKey: "../another-listing/original.jpg" };
    expect(compileV2RegistrationCandidate(spoofed, bundle, verification)).toEqual({
      ok: false, code: "INVALID_CONTEXT",
    });
    const fakeSeal = { ...context, sourceMediumKey: context.sourceMediumKey.replace("medium.webp", "v2/medium.webp") };
    expect(compileV2RegistrationCandidate(fakeSeal, bundle, verification)).toEqual({
      ok: false, code: "INVALID_CONTEXT",
    });
    const wrongStatus = { ...context, status: "completed" };
    expect(compileV2RegistrationCandidate(wrongStatus, bundle, verification)).toEqual({
      ok: false, code: "INVALID_CONTEXT",
    });
  });

  it("rejects stale source, listing, generation and revision claims", async () => {
    const { context, bundle, verification } = await fixture();
    for (const forged of [
      { ...context, sourceSha256: "b".repeat(64) },
      { ...context, listingId: randomUUID(), sourceOriginalKey: context.sourceOriginalKey },
      { ...context, generationId: randomUUID() },
      { ...context, listingRevision: context.listingRevision + 1 },
    ]) {
      const result = compileV2RegistrationCandidate(forged, bundle, verification);
      expect(result.ok).toBe(false);
    }
  });

  it("rejects readback omissions, reordering, duplicates and forged object hashes", async () => {
    const { context, bundle, verification } = await fixture();
    const cases: V2WriteVerification[] = [
      { ...verification, objects: verification.objects.slice(1) },
      { ...verification, objects: [...verification.objects].reverse() },
      { ...verification, objects: verification.objects.map((o,i) => i === 2 ? verification.objects[0] : o) },
      { ...verification, objects: verification.objects.map((o,i) => i === 1 ? { ...o, sha256: "f".repeat(64) } : o) },
      { ok: false, code: "READBACK_FAILED", createdObjectIds: [] },
    ];
    for (const readback of cases) {
      const result = compileV2RegistrationCandidate(context, bundle, readback);
      expect(result.ok).toBe(false);
    }
  });

  it("rejects caller-forged object location and doesn't grant database authority", async () => {
    const { context, bundle, verification } = await fixture();
    const modified: PreparedV2Bundle = {
      ...bundle,
      objects: {
        ...bundle.objects,
        original: {
          ...bundle.objects.original,
          key: bundle.objects.original.key.replace("/v2/", "/v3/"),
        },
      },
    };
    expect(compileV2RegistrationCandidate(context, modified, verification)).toEqual({
      ok: false, code: "INVALID_OBJECT",
    });
    const candidate = compileV2RegistrationCandidate(context, bundle, verification);
    expect(candidate.ok).toBe(true);
    if (!candidate.ok) return;
    expect(JSON.stringify(candidate)).not.toMatch(/service_role|jwt|secret|authorization|api_key/i);
    expect("rpc" in candidate).toBe(false);
    expect("registered" in candidate.candidate).toBe(false);
  });
});
