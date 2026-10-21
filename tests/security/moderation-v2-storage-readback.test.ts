import { createHash, randomUUID } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { prepareV2ImageObjects, type PreparedV2Bundle } from "@/lib/media/moderation-v2-node-preparation";
import {
  writeAndVerifyPreparedV2Bundle,
  type RestrictedSealedStorageWriter,
} from "@/lib/media/moderation-v2-storage-readback";

const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

async function bundleFixture(): Promise<PreparedV2Bundle> {
  const source = await sharp({
    create: { width: 40, height: 30, channels: 3, background: { r: 30, g: 140, b: 240 } },
  }).png().toBuffer();
  const result = await prepareV2ImageObjects({
    listingId: randomUUID(),
    mediaId: randomUUID(),
    generationId: randomUUID(),
    listingRevision: 5,
    displayOrder: 0,
    sourceSha256: digest(source),
  }, source);
  expect(result.ok).toBe(true);
  if (!result.ok) throw Error("Expected prepared fixture");
  return result.bundle;
}

function mockTransport() {
  const stored = new Map<string, Buffer>();
  const key = (bucket: string, path: string) => bucket + "/" + path;

  const createNew = vi.fn<RestrictedSealedStorageWriter["createNew"]>(
    async ({ bucket, key: path, bytes, upsert }) => {
      if (upsert !== false || stored.has(key(bucket, path))) return { ok: false };
      stored.set(key(bucket, path), Buffer.from(bytes));
      return { ok: true };
    },
  );
  const readExact = vi.fn<RestrictedSealedStorageWriter["readExact"]>(
    async ({ bucket, key: path }) => {
      const value = stored.get(key(bucket, path));
      return value
        ? { ok: true, bytes: Buffer.from(value) }
        : { ok: false };
    },
  );
  const transport: RestrictedSealedStorageWriter = { createNew, readExact };
  return { transport, stored, createNew, readExact, key };
}

describe("Moderation V2 B2d sealed write intent / point-in-time readback", () => {
  it("creates all five new objects without upsert then verifies every byte", async () => {
    const bundle = await bundleFixture();
    const mocks = mockTransport();
    const result = await writeAndVerifyPreparedV2Bundle(bundle, mocks.transport);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scope).toBe("point_in_time_downloaded_bytes_only");
    expect(result.createOnly).toBe("requested_not_independently_attested");
    expect(result.storageImmutability).toBe("unverified");
    expect(result.databaseRegistration).toBe("unverified");
    expect(result.objects).toHaveLength(5);
    expect(result.objects.map(x => x.variant)).toEqual(["original", "canonical", "thumb", "medium", "large"]);
    expect(mocks.createNew).toHaveBeenCalledTimes(5);
    expect(mocks.readExact).toHaveBeenCalledTimes(5);
    for (const args of mocks.createNew.mock.calls) {
      expect(args[0].upsert).toBe(false);
      const stored = mocks.stored.get(mocks.key(args[0].bucket, args[0].key));
      expect(stored).toEqual(args[0].bytes);
    }
  });

  it("refuses a preexisting key without removing or overwriting existing bytes", async () => {
    const bundle = await bundleFixture();
    const mocks = mockTransport();
    const { original } = bundle.objects;
    const current = Buffer.from("existing-independent-asset");
    mocks.stored.set(mocks.key(original.bucket, original.key), current);

    const result = await writeAndVerifyPreparedV2Bundle(bundle, mocks.transport);
    expect(result).toEqual({ ok: false, code: "WRITE_REJECTED", createdObjectIds: [] });
    expect(mocks.stored.get(mocks.key(original.bucket, original.key))).toEqual(current);
    expect(mocks.readExact).not.toHaveBeenCalled();
  });

  it("fails to attest a changed readback; no registration or cleanup occurs", async () => {
    const bundle = await bundleFixture();
    const mocks = mockTransport();
    const originalCreateNew = mocks.transport.createNew;
    const transport: RestrictedSealedStorageWriter = {
      ...mocks.transport,
      createNew: async args => {
        const result = await originalCreateNew(args);
        if (args.key === bundle.objects.canonical.key) {
          const key = mocks.key(args.bucket, args.key);
          const changed = Buffer.from(mocks.stored.get(key)!);
          changed[changed.length - 1] ^= 1;
          mocks.stored.set(key, changed);
        }
        return result;
      },
    };
    const result = await writeAndVerifyPreparedV2Bundle(bundle, transport);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("DIGEST_MISMATCH");
    expect(result.createdObjectIds).toHaveLength(5);
    // Nothing silently deletes a file during an ambiguous or forged readback.
    expect(mocks.stored.size).toBe(5);
  });

  it("defers incomplete writes and preserves successfully created objects", async () => {
    const bundle = await bundleFixture();
    const mocks = mockTransport();
    let count = 0;
    const transport: RestrictedSealedStorageWriter = {
      ...mocks.transport,
      createNew: async args => {
        count += 1;
        if (count === 3) return { ok: false };
        return mocks.transport.createNew(args);
      },
    };
    const result = await writeAndVerifyPreparedV2Bundle(bundle, transport);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("WRITE_REJECTED");
    expect(result.createdObjectIds).toHaveLength(2);
    expect(mocks.stored.size).toBe(2);
    expect(mocks.readExact).not.toHaveBeenCalled();
  });

  it("refuses path traversal or caller reclassification before any write", async () => {
    const bundle = await bundleFixture();
    const mocks = mockTransport();
    const forged = {
      ...bundle,
      objects: {
        ...bundle.objects,
        medium: {
          ...bundle.objects.medium,
          key: "../another-listing/v2/medium.webp",
        },
      },
    } as PreparedV2Bundle;
    const result = await writeAndVerifyPreparedV2Bundle(forged, mocks.transport);
    expect(result).toEqual({
      ok: false, code: "INVALID_PREPARATION", createdObjectIds: [],
    });
    expect(mocks.createNew).not.toHaveBeenCalled();
    expect(mocks.readExact).not.toHaveBeenCalled();
  });

  it("preserves all source objects on a retry when create-only keys already exist", async () => {
    const bundle = await bundleFixture();
    const mocks = mockTransport();
    const first = await writeAndVerifyPreparedV2Bundle(bundle, mocks.transport);
    expect(first.ok).toBe(true);
    const before = new Map(mocks.stored);
    const second = await writeAndVerifyPreparedV2Bundle(bundle, mocks.transport);
    expect(second).toEqual({ ok: false, code: "WRITE_REJECTED", createdObjectIds: [] });
    expect(mocks.stored).toEqual(before);
  });

  it("fails closed for missing readbacks and honors pre-aborted requests", async () => {
    const bundle = await bundleFixture();
    const mocks = mockTransport();
    const unavailable: RestrictedSealedStorageWriter = {
      ...mocks.transport,
      readExact: async () => ({ ok: false }),
    };
    const result = await writeAndVerifyPreparedV2Bundle(bundle, unavailable);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("READBACK_FAILED");
      expect(result.createdObjectIds).toHaveLength(5);
    }
    const cancel = new AbortController();
    cancel.abort();
    const untouched = mockTransport();
    expect(await writeAndVerifyPreparedV2Bundle(bundle, untouched.transport, cancel.signal)).toEqual({
      ok: false, code: "CANCELLED", createdObjectIds: [],
    });
    expect(untouched.createNew).not.toHaveBeenCalled();
  });
});
