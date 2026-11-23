/** Backend triggers raise this message (SQLSTATE 42501) when an unverified user attempts a gated mutation. */
export const IDENTITY_REQUIRED_CODE = "IDENTITY_VERIFICATION_REQUIRED";
export const IDENTITY_REQUIRED_MESSAGE =
  "Verify your account with DigiLocker to post ads or send messages. Go to Account › Verify account. Your saved details are safe.";
export const IDENTITY_VERIFY_URL = "/account/verification?required=1";

/** True for the Backend gate error in any shape we receive it (PostgREST error object, Error, or plain string). */
export function isIdentityRequired(error: unknown): boolean {
  if (!error) return false;
  if (typeof error === "string") return error.includes(IDENTITY_REQUIRED_CODE);
  if (typeof error === "object") {
    const e = error as { message?: unknown; code?: unknown };
    return (typeof e.message === "string" && e.message.includes(IDENTITY_REQUIRED_CODE)) || e.code === IDENTITY_REQUIRED_CODE;
  }
  return false;
}

export function friendlyIdentityError(message: string | undefined | null): string | null {
  return isIdentityRequired(message) ? IDENTITY_REQUIRED_MESSAGE : null;
}
