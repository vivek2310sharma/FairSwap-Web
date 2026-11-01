"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { DEFAULT_LOCALE, LOCALES, LOCALE_STORAGE_KEY, isSelectableLocale, resolveLocale } from "@/lib/i18n/locales";

/** Localization-ready language picker. Only enabled locales can be chosen; the preference is independent of the intro's greeting language. */
/** `id` is explicit (not useId) so server-rendered markup is identical on every page. */
export function LanguageSelector({ className = "", id = "language-select" }: { className?: string; id?: string }) {
  // English is the only enabled locale, so the resolved value is deterministic on server and client alike.
  const [value, setValue] = useState(() => resolveLocale(DEFAULT_LOCALE));
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <Globe className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      <label htmlFor={id} className="sr-only">Language</label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          if (!isSelectableLocale(next)) return;
          setValue(next);
          try { window.localStorage.setItem(LOCALE_STORAGE_KEY, next); } catch { /* preference simply isn't remembered */ }
        }}
        className="min-h-[44px] rounded-xl border border-border bg-card px-2 text-sm font-semibold text-foreground"
      >
        {LOCALES.map((locale) => (
          <option key={locale.code} value={locale.code} disabled={!locale.enabled}>
            {locale.enabled ? locale.nativeLabel : `${locale.label} (coming soon)`}
          </option>
        ))}
      </select>
    </div>
  );
}
