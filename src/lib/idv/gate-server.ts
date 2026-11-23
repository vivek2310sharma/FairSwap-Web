import "server-only";
import { IDENTITY_REQUIRED_CODE, IDENTITY_REQUIRED_MESSAGE, IDENTITY_VERIFY_URL, isIdentityRequired } from "./gate";

/**
 * UX only. The Backend triggers are the enforcement and fail closed on every write; this pre-flight exists so users
 * get an actionable screen/message instead of a generic failure. Status is read from the authenticated database.
 */
export class IdentityVerificationRequiredError extends Error {
  readonly code = IDENTITY_REQUIRED_CODE;
  constructor() {
    super(IDENTITY_REQUIRED_MESSAGE);
  }
}

type RpcCapable = { rpc?: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

export type IdentityGateState = "required" | "clear" | "unknown";

/**
 * UX state from the authenticated RPC `get_my_marketplace_access()`. "required" only when the server setting is ON
 * (`verification_required === true`) and the strict `digilocker_verified` flag is not exactly `true`. The generic
 * legacy `identity_verified`, query parameters and client claims are never consulted. "unknown" (RPC error, throw or
 * malformed shape) is not proof of anything: it never renders a verified badge, and the Backend triggers still
 * refuse every gated write.
 */
export async function getIdentityGate(client: unknown): Promise<IdentityGateState> {
  try {
    const c = client as RpcCapable;
    if (typeof c?.rpc !== "function") return "unknown";
    const { data, error } = await c.rpc("get_my_marketplace_access");
    if (error || !data || typeof data !== "object" || Array.isArray(data)) return "unknown";
    const a = data as { digilocker_verified?: unknown; verification_required?: unknown };
    if (typeof a.verification_required !== "boolean") return "unknown";
    return a.verification_required && a.digilocker_verified !== true ? "required" : "clear";
  } catch {
    return "unknown";
  }
}

/** Pre-flight for UX. Unknown status is not blocked here (no global hiding on RPC failure); the DB refuses the write. */
export async function needsIdentityVerification(client: unknown): Promise<boolean> {
  return (await getIdentityGate(client)) === "required";
}

export async function assertIdentityVerified(client: unknown): Promise<void> {
  if (await needsIdentityVerification(client)) throw new IdentityVerificationRequiredError();
}

/** DigiLocker verification currently ships English-only. */
export async function identityGateLocale(): Promise<"en"> {
  return "en";
}

/** Maps the gate error (pre-flight or Backend) to a 403 JSON response; null for anything else. */
export function identityErrorResponse(error: unknown): Response | null {
  if (!(error instanceof IdentityVerificationRequiredError) && !isIdentityRequired(error)) return null;
  return Response.json(
    { error: IDENTITY_REQUIRED_MESSAGE, code: IDENTITY_REQUIRED_CODE, verifyUrl: IDENTITY_VERIFY_URL },
    { status: 403, headers: { "Cache-Control": "private, no-store" } },
  );
}
