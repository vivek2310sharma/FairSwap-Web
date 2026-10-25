"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

interface AvatarUploaderProps {
  initialUrl: string | null;
  displayName: string;
}

function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "FS";
}

/**
 * Uploads go to /api/account/avatar, which authenticates the user, re-encodes to a small
 * WebP with metadata removed and stores it server-side. The browser never writes storage.
 */
export function AvatarUploader({ initialUrl, displayName }: AvatarUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "ok"; text: string } | null>(null);

  async function send(init: RequestInit, okText: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/account/avatar", init);
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        avatarUrl?: string | null;
        redirectTo?: string;
      };
      if (!res.ok) {
        if (body.redirectTo) {
          router.push(body.redirectTo);
          return;
        }
        setMessage({ type: "error", text: body.error ?? "We could not update your photo." });
        return;
      }
      setUrl(body.avatarUrl ?? null);
      setMessage({ type: "ok", text: okText });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setMessage({ type: "error", text: "Image must be 5 MB or smaller." });
      event.target.value = "";
      return;
    }
    const body = new FormData();
    body.set("file", file);
    void send({ method: "POST", body }, "Profile photo updated.");
  }

  const buttonClass =
    "inline-flex min-h-[44px] items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-action-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-500 disabled:opacity-50 dark:text-action-300 dark:hover:bg-brand-800";

  return (
    <div className="flex items-center gap-4">
      <div
        aria-hidden="true"
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-brand-50 text-2xl font-bold text-brand-700 dark:bg-brand-800 dark:text-brand-100"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- small sanitized WebP from the public avatars bucket
          <img src={url} alt="" width={80} height={80} className="h-full w-full object-cover" />
        ) : (
          initialOf(displayName)
        )}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id="avatarFile"
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={onPick}
            disabled={busy}
            aria-label="Choose profile photo"
          />
          <button type="button" className={buttonClass} disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Working…" : url ? "Replace photo" : "Upload photo"}
          </button>
          {url && (
            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => void send({ method: "DELETE" }, "Profile photo removed.")}
            >
              Remove photo
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">
          Optional. JPEG, PNG or WebP up to 5 MB. We resize it and remove location data. A photo does not make you a
          verified member.
        </p>
        {message && (
          <p
            role={message.type === "error" ? "alert" : "status"}
            className={`mt-1 text-sm ${message.type === "error" ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
