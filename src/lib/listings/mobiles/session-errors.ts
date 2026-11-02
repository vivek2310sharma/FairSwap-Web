import { z } from "zod";

export const sessionErrors = {
  UPLOAD_SESSION_LIMIT: { status: 429, message: "Your five active photo sessions contain protected or unknown work. Review the recovery choices below, finish an existing listing, or wait for expiry. No draft will be automatically discarded." },
  UPLOAD_SESSION_EXPIRED: { status: 410, message: "This photo session has expired. Your saved details are retained. Start a new photo session and upload your photos again." },
  UPLOAD_SESSION_PROTECTED: { status: 409, message: "This session now has photo history or is being submitted. It cannot be released. Refresh the list or finish that listing on its original device." },
  UPLOAD_SESSION_BUSY: { status: 409, message: "An upload or submission is already in progress. Keep this draft open and retry in two minutes." },
  UPLOAD_SESSION_UNAVAILABLE: { status: 503, message: "The photo session could not be opened. Retry with this saved draft; your details are safe." },
} as const;
export const sessionErrorCodeSchema = z.enum(["UPLOAD_SESSION_LIMIT", "UPLOAD_SESSION_EXPIRED", "UPLOAD_SESSION_PROTECTED", "UPLOAD_SESSION_BUSY", "UPLOAD_SESSION_UNAVAILABLE"]);
export type SessionErrorCode = z.infer<typeof sessionErrorCodeSchema>;
export class PostingSessionError extends Error {
  constructor(readonly code: SessionErrorCode) { super(sessionErrors[code].message); }
}
export function sessionFailure(value: unknown) {
  const parsed = z.object({ code: sessionErrorCodeSchema }).safeParse(value);
  return new PostingSessionError(parsed.success ? parsed.data.code : "UPLOAD_SESSION_UNAVAILABLE");
}
export const sessionRecoveryChoicesSchema = z.object({ limit: z.literal(5), sessions: z.array(z.object({
  id: z.string().uuid(), state: z.enum(["open", "finalizing"]), created_at: z.string().datetime({offset:true}),
  expires_at: z.string().datetime({offset:true}), can_abandon: z.boolean(),
  draft_protected: z.boolean().default(true), can_rotate: z.boolean().default(false),
})).max(5) });
export type SessionRecoveryChoice = z.infer<typeof sessionRecoveryChoicesSchema>["sessions"][number];
