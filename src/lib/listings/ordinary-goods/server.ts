import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sessionSchema } from "../mobiles/server";
import { sessionErrorCodeSchema, sessionErrors } from "../mobiles/session-errors";
import { goodsDefinition, goodsSlug, uuid } from "./contract";

export const goodsHeaders = { "Cache-Control": "private, no-store" };
const bindingsSchema = z.record(goodsSlug, uuid);
export async function loadGoodsBindings(client: SupabaseClient): Promise<Record<string, string>> {
  try {
    const { data, error } = await client.rpc("ordinary_goods_v3");
    const parsed = bindingsSchema.safeParse(data);
    return !error && parsed.success ? parsed.data : {};
  } catch { return {}; }
}

export async function loadGoodsDefinition(client: SupabaseClient, slug: string) {
  const { data, error } = await client.rpc("ordinary_goods_v3", { slug });
  const parsed = goodsDefinition.safeParse(data);
  return !error && parsed.success && parsed.data.slug === slug ? parsed.data : null;
}

export async function goodsSession(client: SupabaseClient, slug: string, id: string, operation: string, media?: string) {
  const { data, error } = await client.rpc("ordinary_goods_session_v3", {
    slug, session_id: id, operation, media_id: media ?? null,
  });
  if (error) throw error;
  return sessionSchema.parse(data);
}

export function goodsError(error: unknown) {
  const message = error && typeof error === "object" && "message" in error ? error.message : null;
  const code = sessionErrorCodeSchema.safeParse(message);
  if (code.success) return Response.json({ error: sessionErrors[code.data].message, code: code.data }, { status: sessionErrors[code.data].status, headers: goodsHeaders });
  const messages: Record<string, string> = {
    ORDINARY_GOODS_INVALID_DETAILS: "Check the listing details and safety declarations.",
    ORDINARY_GOODS_BLOCKED_CONTENT: "Remove prohibited products, unsafe items and contact or payment requests.",
    ORDINARY_GOODS_INVALID_LOCATION: "Choose a current locality for the PIN code.",
    ORDINARY_GOODS_INVALID_MEDIA: "Upload all selected photos before submitting.",
    ORDINARY_GOODS_FROZEN_CONFLICT: "A submission is in progress with different details. Reopen your saved draft.",
    ORDINARY_GOODS_CONTRACT_UNAVAILABLE: "This category or form version is unavailable.",
  };
  return Response.json({ error: (typeof message === "string" && Object.hasOwn(messages, message) ? messages[message] : null) ??
    "Could not complete this request. Check your account and try again." }, { status: 422, headers: goodsHeaders });
}
