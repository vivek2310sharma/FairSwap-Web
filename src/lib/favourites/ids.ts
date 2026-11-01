import { z } from "zod";
import { SAVED_IDS_LIMIT } from "./types";

const idsSchema = z.array(z.string().uuid("Invalid saved item.")).max(SAVED_IDS_LIMIT, `You can save up to ${SAVED_IDS_LIMIT} ads.`);

/** Validates untrusted input: an array of at most 50 UUIDs. Returns lower-cased, de-duplicated ids in first-seen order. */
export function parseSavedIds(input: unknown): { ok: true; ids: string[] } | { ok: false; error: string } {
  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid saved items." };
  return { ok: true, ids: [...new Set(parsed.data.map((id) => id.toLowerCase()))] };
}
