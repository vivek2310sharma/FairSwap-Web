/**
 * Locale registry. English is the only production language. Other entries are listed so the selector is ready,
 * but stay unselectable until their public, account, error, legal and safety copy is fully translated and reviewed.
 */
export interface LocaleOption {
  code: string;
  label: string;
  nativeLabel: string;
  enabled: boolean;
}

export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "fs.locale";

export const LOCALES: readonly LocaleOption[] = [
  { code: "en", label: "English", nativeLabel: "English", enabled: true },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी", enabled: false },
  { code: "ta", label: "Tamil", nativeLabel: "தமிழ்", enabled: false },
  { code: "te", label: "Telugu", nativeLabel: "తెలుగు", enabled: false },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা", enabled: false },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी", enabled: false },
  { code: "kn", label: "Kannada", nativeLabel: "ಕನ್ನಡ", enabled: false },
  { code: "ml", label: "Malayalam", nativeLabel: "മലയാളം", enabled: false },
];

/** Locales shown in the user-facing header/footer selector. The rest stay in the registry, hidden until translated. */
export const USER_FACING_LOCALE_CODES: readonly string[] = ["en", "hi"];
export const USER_FACING_LOCALES: readonly LocaleOption[] = LOCALES.filter((locale) => USER_FACING_LOCALE_CODES.includes(locale.code));

export function isSelectableLocale(code: string): boolean {
  return LOCALES.some((locale) => locale.code === code && locale.enabled);
}

/** Never returns a locale that is not enabled, whatever is stored or requested. */
export function resolveLocale(code: string | null | undefined): string {
  return code && isSelectableLocale(code) ? code : DEFAULT_LOCALE;
}
