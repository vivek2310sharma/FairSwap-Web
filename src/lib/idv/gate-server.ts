import "server-only";
import { IDENTITY_REQUIRED_CODE, IDENTITY_REQUIRED_MESSAGE, IDENTITY_VERIFY_URL, isIdentityRequired } from "./gate";

/**
 * UX only. The Backend triggers are the enforcement and fail closed on every write; this pre-flight exists so users
 * get an actionable message instead of a generic failure. It therefore fails OPEN on errors or unknown shapes.
 */
export class IdentityVerificationRequiredError extends Error {
  readonly code = IDENTITY_REQUIRED_CODE;
  constructor() {
    super(IDENTITY_REQUIRED_MESSAGE);
  }
}

type RpcCapable = { rpc?: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

/** Web-side switch for the pre-flight (default OFF). Turn it on together with the Backend gate setting
 *  `identity_verification_required`; when OFF no extra round trip is made and the DB error mapping still applies. */
export function identityPreflightEnabled(): boolean {
  return process.env.FAIRSWAP_IDENTITY_GATE_ENABLED === "true";
}

export async function needsIdentityVerification(client: unknown): Promise<boolean> {
  if (!identityPreflightEnabled()) return false;
  try {
    const c = client as RpcCapable;
    if (typeof c?.rpc !== "function") return false;
    const { data, error } = await c.rpc("get_my_marketplace_access");
    if (error || !data || typeof data !== "object") return false;
    const a = data as { identity_verified?: unknown; verification_required?: unknown };
    return a.verification_required === true && a.identity_verified !== true;
  } catch {
    return false;
  }
}

export async function assertIdentityVerified(client: unknown): Promise<void> {
  if (await needsIdentityVerification(client)) throw new IdentityVerificationRequiredError();
}

/** Maps the gate error (pre-flight or Backend) to a 403 JSON response; null for anything else. */
export function identityErrorResponse(error: unknown): Response | null {
  if (!(error instanceof IdentityVerificationRequiredError) && !isIdentityRequired(error)) return null;
  return Response.json(
    { error: IDENTITY_REQUIRED_MESSAGE, code: IDENTITY_REQUIRED_CODE, verifyUrl: IDENTITY_VERIFY_URL },
    { status: 403, headers: { "Cache-Control": "private, no-store" } },
  );
}
