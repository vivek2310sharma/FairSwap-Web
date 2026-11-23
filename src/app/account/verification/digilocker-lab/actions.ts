"use server";

import { consumeLabResult, type LabView } from "@/lib/idv/digilocker-lab";

/** Reads the caller's own sanitized Lab result once (verified for this user + session) and deletes it. */
export async function consumeLabResultAction(): Promise<LabView | null> {
  return consumeLabResult();
}
