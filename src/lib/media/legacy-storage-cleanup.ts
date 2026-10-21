/**
 * Legacy-only Storage cleanup authorization.
 *
 * V2 sealed objects use an immutable versioned namespace:
 * <listing>/<media>/v2/<asset_version>/<sha256>/<variant>.<ext>.
 * They MUST be retired by a separately authorized, listing-locked workflow,
 * never by ordinary service-role media cleanup.
 *
 * This is a fail-closed application fence, NOT an independent Storage
 * immutability guarantee. Other privileged writers still require B2 controls.
 */

export interface LegacyMediaPathColumns {
  original_storage_path?: string | null;
  thumbnail_storage_path?: string | null;
  medium_storage_path?: string | null;
  large_storage_path?: string | null;
}

export type LegacyMediaCleanupPlan =
  | { kind: "legacy"; originals: string[]; derivatives: string[] }
  | { kind: "deferred" };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authorize ALL paths or NONE. This prevents partial cleanup of a media
 * record whose Storage paths have been switched to an immutable V2 bundle,
 * and prevents an unexpected DB path from turning into a service-role delete.
 */
export function planLegacyMediaStorageCleanup(
  listingId: string,
  mediaId: string,
  paths: LegacyMediaPathColumns,
): LegacyMediaCleanupPlan {
  if (!UUID_PATTERN.test(listingId) || !UUID_PATTERN.test(mediaId)) {
    return { kind: "deferred" };
  }

  const prefix = `${listingId}/${mediaId}/`;
  const original = paths.original_storage_path;
  const thumb = paths.thumbnail_storage_path;
  const medium = paths.medium_storage_path;
  const large = paths.large_storage_path;

  const originals =
    original === null || original === undefined
      ? []
      : [original];
  const derivatives = [thumb, medium, large].filter(
    (path): path is string => path !== null && path !== undefined,
  );

  // A familiar suffix alone is insufficient: the entire object key must
  // belong to this exact listing/media identity with no extra segments.
  if (
    originals.some(
      (path) =>
        typeof path !== "string" ||
        !(
          path === `${prefix}original.jpg` ||
          path === `${prefix}original.png` ||
          path === `${prefix}original.webp`
        ),
    ) ||
    (thumb !== null && thumb !== undefined && thumb !== `${prefix}thumb.webp`) ||
    (medium !== null && medium !== undefined && medium !== `${prefix}medium.webp`) ||
    (large !== null && large !== undefined && large !== `${prefix}large.webp`)
  ) {
    return { kind: "deferred" };
  }

  return { kind: "legacy", originals, derivatives };
}
