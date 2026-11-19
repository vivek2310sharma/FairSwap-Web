"use server";

import { consumeDiagResult, type DiagView } from "@/lib/idv/digilocker-diagnostic";

/** Reads the caller's own sealed diagnostic result once (verified for this user + session) and deletes it. */
export async function consumeDiagnosticResult(): Promise<DiagView | null> {
  return consumeDiagResult();
}
