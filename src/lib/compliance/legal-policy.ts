/**
 * Single source of truth for FairSwap public beta legal policies.
 *
 * Version identifiers use the implementation date (YYYY-MM-DD).
 * Production effective date will be confirmed during the staging -> main promotion PR.
 */
export const LEGAL_POLICY = {
  minimumAge: 18,
  termsVersion: "2026-09-18",
  privacyVersion: "2026-09-18",
  acceptableUseVersion: "2026-09-18",
  termsLastUpdated: "14 October 2026 (paid-services clarification)",
  privacyLastUpdated: "14 October 2026 (payment disclosure)",
  acceptableUseLastUpdated: "18 September 2026",
  operatorName: "Vivek Kumar",
  operatorDescription: "FairSwap is operated by Vivek Kumar.",
  grievanceEmail: "grievance@fairswap.in",
  grievanceOfficerTitle: "Grievance Officer — FairSwap",
  grievanceRoute: "/grievance",
} as const;
