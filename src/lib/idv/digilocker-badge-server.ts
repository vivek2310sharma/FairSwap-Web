import "server-only";

/**
 * Server-authoritative "Verified with DigiLocker" badge lookups.
 *
 * The badge is shown only when the Backend RPC `get_digilocker_badges` confirms the user currently holds an active,
 * authoritative DigiLocker (OIDC V2 provenance) badge. It is never derived from `user_identity_verifications` rows,
 * query parameters or client state. Every failure path fails CLOSED (no badge) and never throws.
 */

/** Backend limit for one `get_digilocker_badges` call; more ids raise an SQL error. */
export const DIGILOCKER_BADGE_MAX_IDS = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RpcCapable = { rpc?: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

function extractId(row: unknown): string | null {
  if (typeof row === "string") return row;
  if (row && typeof row === "object" && typeof (row as { get_digilocker_badges?: unknown }).get_digilocker_badges === "string") {
    return (row as { get_digilocker_badges: string }).get_digilocker_badges;
  }
  return null;
}

/** Returns the subset of `userIds` the Backend confirms hold the DigiLocker badge. Empty Set on any failure. */
export async function getDigiLockerBadgeUserIds(client: unknown, userIds: readonly string[]): Promise<Set<string>> {
  const requested = new Set<string>();
  for (const id of Array.isArray(userIds) ? userIds : []) {
    if (typeof id !== "string") continue;
    const normalized = id.toLowerCase();
    if (!UUID_PATTERN.test(normalized)) continue;
    requested.add(normalized);
    if (requested.size >= DIGILOCKER_BADGE_MAX_IDS) break;
  }
  const confirmed = new Set<string>();
  if (requested.size === 0) return confirmed;
  try {
    const c = client as RpcCapable;
    if (typeof c?.rpc !== "function") return confirmed;
    const { data, error } = await c.rpc("get_digilocker_badges", { p_user_ids: [...requested] });
    if (error || !Array.isArray(data)) return confirmed;
    for (const row of data) {
      const id = extractId(row);
      if (id === null) return new Set<string>(); // malformed shape: fail closed for the whole response
      const normalized = id.toLowerCase();
      if (requested.has(normalized)) confirmed.add(normalized);
    }
    return confirmed;
  } catch {
    return new Set<string>();
  }
}

/** Convenience for a single user. False on any failure. */
export async function hasDigiLockerBadge(client: unknown, userId: string | null | undefined): Promise<boolean> {
  if (typeof userId !== "string") return false;
  const ids = await getDigiLockerBadgeUserIds(client, [userId]);
  return ids.has(userId.toLowerCase());
}

export type MyDigiLockerStatus = "verified" | "unverified" | "unknown";

/**
 * Tri-state status from `get_my_marketplace_access().digilocker_verified`. "unknown" means the Backend could not be
 * read (RPC error, throw or malformed shape); callers must never render the badge for it.
 */
export async function getMyDigiLockerStatus(client: unknown): Promise<MyDigiLockerStatus> {
  try {
    const c = client as RpcCapable;
    if (typeof c?.rpc !== "function") return "unknown";
    const { data, error } = await c.rpc("get_my_marketplace_access");
    if (error || !data || typeof data !== "object" || Array.isArray(data)) return "unknown";
    return (data as { digilocker_verified?: unknown }).digilocker_verified === true ? "verified" : "unverified";
  } catch {
    return "unknown";
  }
}

/** Whether the signed-in user is DigiLocker-verified. False on any failure. */
export async function isMyDigiLockerVerified(client: unknown): Promise<boolean> {
  return (await getMyDigiLockerStatus(client)) === "verified";
}
