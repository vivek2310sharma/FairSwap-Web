"use client";

import { useSyncExternalStore } from "react";
import { SAVED_IDS_LIMIT } from "./types";

/** Guest ("saved on this device") favourites: listing ids only, never metadata, tokens or identity. */
export const GUEST_FAVOURITES_KEY = "fs.guestFavourites.v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMPTY: readonly string[] = Object.freeze([]);

export type GuestSaveEvent =
  | { kind: "saved" | "removed"; persistent: boolean }
  | { kind: "limit" };

let memoryIds: readonly string[] = EMPTY;
let writeFailed = false;
let cachedRaw: string | null = null;
let cachedIds: readonly string[] = EMPTY;
const listeners = new Set<() => void>();
const eventListeners = new Set<(event: GuestSaveEvent) => void>();
let storageListening = false;

/** Tolerates anything: malformed JSON, wrong shape, bad ids, duplicates, oversize. */
export function parseStoredIds(raw: string | null): readonly string[] {
  if (!raw) return EMPTY;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return EMPTY;
    const seen = new Set<string>();
    for (const item of value) {
      if (typeof item === "string" && UUID.test(item)) seen.add(item.toLowerCase());
      if (seen.size >= SAVED_IDS_LIMIT) break;
    }
    return seen.size ? Object.freeze([...seen]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** `undefined` means storage itself is unavailable (blocked, private mode, SSR). */
function readRaw(): string | null | undefined {
  try {
    return window.localStorage.getItem(GUEST_FAVOURITES_KEY);
  } catch {
    return undefined;
  }
}

/** Stable snapshot: the same array instance is returned until the stored value really changes. */
export function getGuestFavourites(): readonly string[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw();
  if (raw === undefined || writeFailed) return memoryIds;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedIds = parseStoredIds(raw);
  }
  return cachedIds;
}

/** True while saves survive a refresh (localStorage readable and writable). */
export function isGuestStoragePersistent(): boolean {
  return typeof window !== "undefined" && readRaw() !== undefined && !writeFailed;
}

function emit() {
  for (const listener of [...listeners]) listener();
}

function write(ids: readonly string[]) {
  const next = Object.freeze([...ids]);
  memoryIds = next;
  try {
    if (next.length) window.localStorage.setItem(GUEST_FAVOURITES_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(GUEST_FAVOURITES_KEY);
    writeFailed = false;
  } catch {
    writeFailed = true;
  }
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === GUEST_FAVOURITES_KEY) emit();
}

export function subscribeGuestFavourites(listener: () => void): () => void {
  listeners.add(listener);
  if (!storageListening && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    storageListening = true;
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && storageListening) {
      window.removeEventListener("storage", onStorage);
      storageListening = false;
    }
  };
}

export function subscribeGuestSaveEvents(listener: (event: GuestSaveEvent) => void): () => void {
  eventListeners.add(listener);
  return () => void eventListeners.delete(listener);
}
const announce = (event: GuestSaveEvent) => {
  for (const listener of [...eventListeners]) listener(event);
};

export type AddResult = { ok: true } | { ok: false; reason: "invalid" | "limit" };

export function addGuestFavourite(id: string): AddResult {
  if (!UUID.test(id)) return { ok: false, reason: "invalid" };
  const lower = id.toLowerCase();
  const current = getGuestFavourites();
  if (current.includes(lower)) return { ok: true };
  if (current.length >= SAVED_IDS_LIMIT) {
    announce({ kind: "limit" });
    return { ok: false, reason: "limit" };
  }
  write([lower, ...current]);
  announce({ kind: "saved", persistent: isGuestStoragePersistent() });
  return { ok: true };
}

export function removeGuestFavourite(id: string): void {
  const lower = id.toLowerCase();
  const current = getGuestFavourites();
  if (!current.includes(lower)) return;
  write(current.filter((item) => item !== lower));
  announce({ kind: "removed", persistent: isGuestStoragePersistent() });
}

export function removeGuestFavourites(ids: readonly string[]): void {
  const drop = new Set(ids.map((id) => id.toLowerCase()));
  const current = getGuestFavourites();
  const next = current.filter((item) => !drop.has(item));
  if (next.length !== current.length) write(next);
}

export function clearGuestFavourites(): void {
  if (getGuestFavourites().length) write([]);
}

/** Test hook: forget all module state. */
export function resetGuestFavouritesForTests(): void {
  memoryIds = EMPTY;
  writeFailed = false;
  cachedRaw = null;
  cachedIds = EMPTY;
}

export function useGuestFavourites(): readonly string[] {
  return useSyncExternalStore(subscribeGuestFavourites, getGuestFavourites, () => EMPTY);
}

export function useIsGuestFavourite(id: string): boolean {
  return useGuestFavourites().includes(id.toLowerCase());
}
