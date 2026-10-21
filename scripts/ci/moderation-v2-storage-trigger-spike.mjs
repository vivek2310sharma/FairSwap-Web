/**
 * Disposable CI spike only: test whether a BEFORE UPDATE/DELETE guard on
 * storage.objects actually prevents Supabase Storage API (service_role)
 * replacement/deletion of V2 sealed keys WITHOUT corrupting stored bytes.
 *
 * This script modifies ONLY an ephemeral local Supabase stack. It is not
 * a production migration or an approved production enforcement mechanism.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import pkg from "pg";
import sharp from "sharp";

const { Client } = pkg;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const localHost = (host) => host === "localhost" || host === "127.0.0.1";

function assertLocalOnly(status) {
  assert.equal(process.env.CI, "true", "CI-only spike: CI must be true");
  assert.equal(process.env.FAIRSWAP_V2_STORAGE_GUARD_SPIKE, "1", "Explicit disposable test opt-in required");
  for (const key of ["DB_URL", "API_URL", "SERVICE_ROLE_KEY"]) {
    assert.equal(typeof status[key], "string", "Missing local Supabase " + key);
  }
  assert.ok(localHost(new URL(status.DB_URL).hostname), "Database must be local");
  assert.ok(localHost(new URL(status.API_URL).hostname), "Storage API must be local");
}

const triggerName = "fairswap_ci_v2_sealed_guard";
const functionName = "app_security.fairswap_ci_guard_v2_storage_objects";

const setupSql = [
  "CREATE OR REPLACE FUNCTION " + functionName + "()",
  "RETURNS trigger",
  "LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''",
  "AS $function$",
  "BEGIN",
  "  IF OLD.bucket_id IN ('listing-originals', 'listing-derivatives')",
  "     AND split_part(OLD.name, '/', 3) = 'v2' THEN",
  "    RAISE EXCEPTION 'FS_V2_SEALED_OBJECT_IMMUTABLE' USING ERRCODE = '23514';",
  "  END IF;",
  "  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;",
  "  RETURN NEW;",
  "END;",
  "$function$;",
  "CREATE TRIGGER " + triggerName,
  "BEFORE UPDATE OR DELETE ON storage.objects",
  "FOR EACH ROW EXECUTE FUNCTION " + functionName + "();",
].join("\n");

/**
 * Use the raw local Storage HTTP API rather than a Supabase client constructor:
 * current Web CI pins Node 20 (no native global WebSocket), and this probe must
 * exercise the physical Storage API irrespective of JS SDK runtime constraints.
 */
function localStorageApi(apiUrl, serviceKey) {
  const root = apiUrl.replace(/\/$/, "") + "/storage/v1/object";
  const auth = {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
  };
  const keyUrl = (path) => root + "/listing-originals/" +
    path.split("/").map(encodeURIComponent).join("/");

  const toResult = (response) => ({
    error: response.ok ? null : { error: "HTTP_" + response.status },
  });

  return {
    upload: async (path, bytes, { contentType, upsert }) => {
      const headers = { ...auth, "Content-Type": contentType };
      if (upsert) headers["x-upsert"] = "true";
      const response = await fetch(keyUrl(path), {
        method: "POST",
        headers,
        body: bytes,
      });
      return toResult(response);
    },
    update: async (path, bytes, { contentType }) => {
      const response = await fetch(keyUrl(path), {
        method: "PUT",
        headers: { ...auth, "Content-Type": contentType },
        body: bytes,
      });
      return toResult(response);
    },
    remove: async (paths) => {
      const response = await fetch(root + "/listing-originals", {
        method: "DELETE",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: paths }),
      });
      return toResult(response);
    },
    download: async (path) => {
      const response = await fetch(root + "/authenticated/listing-originals/" +
        path.split("/").map(encodeURIComponent).join("/"), {
        headers: auth,
      });
      return {
        error: response.ok ? null : { error: "HTTP_" + response.status },
        data: response.ok ? response : null,
      };
    },
    createSignedUrl: async (path, expiresIn) => {
      const response = await fetch(root + "/sign/listing-originals/" +
        path.split("/").map(encodeURIComponent).join("/"), {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn }),
      });
      if (!response.ok) return { error: { error: "HTTP_" + response.status }, data: null };
      const json = await response.json();
      const relative = json.signedURL ?? json.signedUrl;
      if (typeof relative !== "string" || !relative) {
        return { error: { error: "SIGNED_URL_MISSING" }, data: null };
      }
      const signedUrl = relative.startsWith("http")
        ? relative
        : apiUrl.replace(/\/$/, "") + (relative.startsWith("/storage/")
          ? relative
          : "/storage/v1" + (relative.startsWith("/") ? relative : "/" + relative));
      return { data: { signedUrl }, error: null };
    },
  };
}

async function requireUpload(store, path, bytes, upsert, name) {
  const { error } = await store.upload(path, bytes, {
    contentType: "image/png",
    upsert,
    cacheControl: "0",
  });
  if (error) throw Error(name + " failed with Storage code: " + (error.error ?? error.statusCode ?? "unknown"));
}

async function mustReject(promise, description) {
  const result = await promise;
  assert.ok(result.error, description + " unexpectedly succeeded");
}

async function downloadBytes(store, path) {
  const { data, error } = await store.download(path);
  if (error || !data) {
    throw Error("Storage read failed after guard test: " + (error?.error ?? "unknown"));
  }
  return Buffer.from(await data.arrayBuffer());
}

async function main() {
  // The CLI reads only the *running local stack*; secrets never enter logs.
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], { encoding: "utf8" }));
  assertLocalOnly(status);
  const db = new Client({ connectionString: status.DB_URL });
  const store = localStorageApi(status.API_URL, status.SERVICE_ROLE_KEY);
  const listingId = randomUUID(), mediaId = randomUUID(), assetVersion = randomUUID();
  const base = listingId + "/" + mediaId + "/";
  const digest = "a".repeat(64);
  const sealedPath = base + "v2/" + assetVersion + "/" + digest + "/original.png";
  const sealedRace = base + "v2/" + randomUUID() + "/" + digest + "/original.png";
  const legacyPath = base + "original.png";
  const imageA = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 255, g: 0, b: 0 } },
  }).png().toBuffer();
  const imageB = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 0, g: 0, b: 255 } },
  }).png().toBuffer();
  assert.notEqual(sha256(imageA), sha256(imageB));

  await db.connect();
  let triggerInstalled = false;
  try {
    // A normal baseline upload must still work.
    await requireUpload(store, legacyPath, imageA, false, "legacy upload");
    const legacyUpdated = await store.update(legacyPath, imageB, { contentType: "image/png" });
    assert.equal(legacyUpdated.error, null, "Legacy overwrite must remain usable before the trigger");

    await db.query(setupSql);
    triggerInstalled = true;

    // A new sealed key is insertable once, then byte-for-byte immutable.
    await requireUpload(store, sealedPath, imageA, false, "new V2 sealed upload");
    await mustReject(
      store.upload(sealedPath, imageB, { contentType: "image/png", upsert: true }),
      "service_role upsert:true on sealed key",
    );
    await mustReject(
      store.update(sealedPath, imageB, { contentType: "image/png" }),
      "service_role update() on sealed key",
    );
    await mustReject(
      store.remove([sealedPath]),
      "service_role remove() on sealed key",
    );

    const sealedAfter = await downloadBytes(store, sealedPath);
    assert.equal(sha256(sealedAfter), sha256(imageA), "Guard must protect PHYSICAL BYTES, not just Postgres metadata");

    // Verify an API signed URL resolves the original sealed bytes.
    const signed = await store.createSignedUrl(sealedPath, 60);
    assert.equal(signed.error, null, "Signed media delivery failed");
    assert.ok(signed.data?.signedUrl, "Signed URL missing");
    const signedResponse = await fetch(signed.data.signedUrl);
    assert.equal(signedResponse.status, 200, "Signed image URL status");
    assert.equal(sha256(Buffer.from(await signedResponse.arrayBuffer())), sha256(imageA));

    // Concurrent create-only requests for the same new key must not swap bytes.
    const concurrent = await Promise.all([
      store.upload(sealedRace, imageA, { contentType: "image/png", upsert: false }),
      store.upload(sealedRace, imageB, { contentType: "image/png", upsert: false }),
    ]);
    assert.equal(concurrent.filter(x => !x.error).length, 1, "Exactly one concurrent sealed creation must succeed");
    const winnerSha = concurrent[0].error ? sha256(imageB) : sha256(imageA);
    assert.equal(sha256(await downloadBytes(store, sealedRace)), winnerSha);

    // Ordinary V1 image lifecycle must continue to work with the trigger active.
    const legacyAfterUpdate = await store.update(legacyPath, imageA, { contentType: "image/png" });
    assert.equal(legacyAfterUpdate.error, null, "V1 media update failed under guard");
    const legacyRemoved = await store.remove([legacyPath]);
    assert.equal(legacyRemoved.error, null, "V1 media delete failed under guard");

    console.log("PASS: isolated Supabase Storage trigger rejected sealed update/upsert/delete, preserved bytes and signed delivery; V1 update/delete and concurrent insert also passed");
  } finally {
    // Always drop the experimental trigger before cleaning up its test objects.
    if (triggerInstalled) await db.query("DROP TRIGGER IF EXISTS " + triggerName + " ON storage.objects");
    await db.query("DROP FUNCTION IF EXISTS " + functionName + "()");
    await store.remove([sealedPath, sealedRace, legacyPath]);
    await db.end();
  }
}
main().catch((error) => {
  console.error("FAIL: disposable V2 Storage enforcement spike:", error.message);
  process.exitCode = 1;
});
