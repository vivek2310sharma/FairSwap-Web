import { z } from "zod";

/**
 * Shared public-profile validation. Mirrors `app_security.validate_public_text`
 * (FairSwap-Backend forward-migrations/profile-onboarding). The database remains the
 * authority; this module gives early, accurate feedback at the application boundary.
 */

export type PublicTextKind = "display_name" | "bio";

export type PublicTextReason =
  | "LENGTH"
  | "CONTROL_CHARS"
  | "CONTACT_INFO"
  | "PHONE_NUMBER"
  | "LINK"
  | "PAYMENT_INSTRUCTION"
  | "IMPERSONATION";

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 50;
export const BIO_MAX = 500;
export const FULL_NAME_MAX = 100;

const INVISIBLE = /[​-‏‪-‮⁠-⁤﻿­]/g;
const DEVANAGARI_DIGITS = "०१२३४५६७८९";

export function normalizePublicText(input: string): string {
  let out = (input ?? "").normalize("NFKC").replace(INVISIBLE, "");
  out = Array.from(out)
    .map((ch) => {
      const idx = DEVANAGARI_DIGITS.indexOf(ch);
      return idx >= 0 ? String(idx) : ch;
    })
    .join("");
  return out.toLowerCase().replace(/\s+/g, " ").trim();
}

const LEET_FROM = "013457$!|";
const LEET_TO = "oleastsil";

function foldLeet(value: string): string {
  return Array.from(value)
    .map((ch) => {
      const idx = LEET_FROM.indexOf(ch);
      return idx >= 0 ? LEET_TO[idx] : ch;
    })
    .join("");
}

// Latin letters + Devanagari block; everything else becomes a separator.
const NON_LETTER = /[^a-zऀ-ॿ]+/g;

const DISPLAY_NAME_IMPERSONATION_WORDS = new RegExp(
  "(?:^| )(?:official|officials|support|helpdesk|helpline|admin|administrator|moderator|staff|verified|army|officer|major|colonel|brigadier|havildar|subedar|jawan|crpf|cisf|bsf|itbp|police|cbi|सेना|फौजी|मेजर|कर्नल|आधिकारिक|सपोर्ट)(?: |$)"
);
const BIO_IMPERSONATION_WORDS = new RegExp(
  "(?:^| )(?:army|military|crpf|cisf|bsf|itbp|jawan|havildar|subedar|colonel|brigadier|सेना|फौजी)(?: |$)"
);

const TLD_LIST = "com|in|org|net|co|io|me|ly|link|xyz|app|site|online|info|biz|page|store|shop|top|club";

/** Returns null when valid, otherwise a reason code (same codes as the database). */
export function validatePublicText(text: string | null | undefined, kind: PublicTextKind): PublicTextReason | null {
  const trimmed = (text ?? "").trim();
  const length = Array.from(trimmed).length;

  if (kind === "display_name" && (length < DISPLAY_NAME_MIN || length > DISPLAY_NAME_MAX)) return "LENGTH";
  if (kind === "bio" && length > BIO_MAX) return "LENGTH";
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(trimmed)) return "CONTROL_CHARS";

  const v = normalizePublicText(trimmed);

  if (/@/.test(v) || /[([{]\s*at\s*[)\]}]/.test(v)) return "CONTACT_INFO";
  if (/(?:\d[\s\-.()+_/]*){8,}/.test(v)) return "PHONE_NUMBER";
  if (
    /(https?:|ftp:|www\.)/.test(v) ||
    new RegExp(`\\.(${TLD_LIST})(\\b|$)`).test(v) ||
    new RegExp(`\\s*[(\\[]?\\s*dot\\s*[)\\]]?\\s*(com|in|org|net|co|io)(\\b|$)`).test(v) ||
    /(\bt\.me|\bwa\.me|bit\.ly|tinyurl|wa\.link)/.test(v)
  ) {
    return "LINK";
  }
  if (
    /(^|[^a-z])(upi|paytm|phonepe|phone pe|gpay|google pay|bhim|ifsc|neft|imps|rtgs|bank account|account number|advance payment|pay advance|send money|western union)([^a-z]|$)/.test(
      v
    )
  ) {
    return "PAYMENT_INSTRUCTION";
  }

  const words = foldLeet(v).replace(NON_LETTER, " ").trim();
  const compact = words.replace(/ /g, "");

  if (kind === "display_name") {
    if (/fairswap/.test(compact) || /customercare/.test(compact)) return "IMPERSONATION";
    if (DISPLAY_NAME_IMPERSONATION_WORDS.test(words)) return "IMPERSONATION";
  } else {
    if (/fairswap(support|official|team|staff|admin|care|helpdesk)/.test(compact)) return "IMPERSONATION";
    if (/(support|official|team|staff|admin)fairswap/.test(compact)) return "IMPERSONATION";
    if (BIO_IMPERSONATION_WORDS.test(words)) return "IMPERSONATION";
  }

  return null;
}

const FIELD_LABEL: Record<PublicTextKind, string> = { display_name: "Display name", bio: "About you" };

export function publicTextReasonMessage(kind: PublicTextKind, reason: string | null | undefined): string {
  const label = FIELD_LABEL[kind];
  switch (reason) {
    case "LENGTH":
      return kind === "display_name"
        ? `${label} must be ${DISPLAY_NAME_MIN}–${DISPLAY_NAME_MAX} characters.`
        : `${label} cannot exceed ${BIO_MAX} characters.`;
    case "CONTROL_CHARS":
      return `${label} contains characters that are not allowed.`;
    case "CONTACT_INFO":
      return `${label} cannot contain email addresses.`;
    case "PHONE_NUMBER":
      return `${label} cannot contain phone numbers.`;
    case "LINK":
      return `${label} cannot contain links or web addresses.`;
    case "PAYMENT_INSTRUCTION":
      return `${label} cannot contain UPI IDs or payment instructions.`;
    case "IMPERSONATION":
      return kind === "display_name"
        ? "Display name cannot suggest that you are FairSwap, official support or an officer."
        : `${label} cannot claim to be FairSwap staff or military personnel.`;
    default:
      return `${label} is not valid.`;
  }
}

function publicTextSchema(kind: PublicTextKind) {
  return z.string().superRefine((value, ctx) => {
    const reason = validatePublicText(value, kind);
    if (reason) ctx.addIssue({ code: z.ZodIssueCode.custom, message: publicTextReasonMessage(kind, reason) });
  });
}

export const DisplayNameSchema = publicTextSchema("display_name").transform((v) => v.trim());

export const BioSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ?? "").trim())
  .superRefine((value, ctx) => {
    if (!value) return;
    const reason = validatePublicText(value, "bio");
    if (reason) ctx.addIssue({ code: z.ZodIssueCode.custom, message: publicTextReasonMessage("bio", reason) });
  });

export const PublicProfileSchema = z.object({
  displayName: DisplayNameSchema,
  bio: BioSchema,
});

const UUID = z.string().uuid();

export const FullNameSchema = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v ?? "").trim().replace(/\s+/g, " "))
  .refine((v) => Array.from(v).length <= FULL_NAME_MAX, `Full name cannot exceed ${FULL_NAME_MAX} characters.`)
  .refine((v) => !/[\u0000-\u001F\u007F]/.test(v), "Full name contains characters that are not allowed.");

export const PrivateDetailsSchema = z.object({
  fullName: FullNameSchema,
  pinCode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, "PIN code must be exactly 6 digits."),
  localityId: UUID.describe("locality"),
  cityId: UUID.optional().nullable(),
  preferredLanguage: z.literal("en").default("en"),
});

export type PublicProfileInput = z.infer<typeof PublicProfileSchema>;
export type PrivateDetailsInput = z.infer<typeof PrivateDetailsSchema>;

/** Maps backend error codes to accurate, user-facing messages. */
export function profileErrorMessage(code: string | undefined, reason?: string): string {
  switch (code) {
    case "NOT_AUTHENTICATED":
      return "Please sign in again to update your profile.";
    case "ACCOUNT_RESTRICTED":
      return "Your account status does not allow profile changes right now.";
    case "INVALID_DISPLAY_NAME":
      return publicTextReasonMessage("display_name", reason);
    case "INVALID_BIO":
      return publicTextReasonMessage("bio", reason);
    case "INVALID_FULL_NAME":
      return "Full name is not valid.";
    case "INVALID_LANGUAGE":
      return "Only English is available right now.";
    case "INVALID_PINCODE":
      return "Enter a valid 6-digit PIN code.";
    case "PINCODE_NOT_FOUND":
      return "We could not find this PIN code.";
    case "PINCODE_ADMIN_DATA_UNAVAILABLE":
      return "Location data for this PIN code is temporarily unavailable. Please try again later.";
    case "CONFLICTING_POSTAL_STATES":
      return "This PIN code is not supported yet because it spans more than one state.";
    case "LOCALITY_REQUIRED":
      return "Select your area or locality.";
    case "PIN_LOCALITY_MISMATCH":
      return "The selected area does not belong to this PIN code. Please pick it again.";
    case "DISTRICT_REQUIRED":
      return "This PIN code covers more than one district. Select your district.";
    case "DISTRICT_MISMATCH":
      return "The selected district does not match this PIN code. Please pick it again.";
    case "PROFILE_NOT_FOUND":
      return "We could not find your profile.";
    default:
      return "We could not save your changes. Please try again.";
  }
}

/** Parse a Postgres trigger error such as `INVALID_BIO:LINK` into code + reason. */
export function parseProfileTriggerError(message: string | undefined): { code?: string; reason?: string } {
  const match = /(INVALID_DISPLAY_NAME|INVALID_BIO):([A-Z_]+)/.exec(message ?? "");
  return match ? { code: match[1], reason: match[2] } : {};
}
