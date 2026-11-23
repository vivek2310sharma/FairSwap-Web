export type DigiLockerLocale = "en";

// Wording states only what is done: the user signed in to their own DigiLocker account. It must not claim the
// provider transmits only the identifier (the token response also carries profile fields); FairSwap uses only the
// identifier and keeps none of the rest (only a keyed HMAC of the identifier is stored). No document, Aadhaar,
// PAN or licence check is performed, and nothing here claims escrow, payment protection or government KYC.
export const digiLockerCopy = {
  en: {
    heading: "Verify with DigiLocker",
    body: "Sign in to your DigiLocker account once to verify your FairSwap account. DigiLocker may share some profile details with us, but FairSwap uses only your DigiLocker account identifier to confirm your account and does not keep the other details. We do not ask for or access your Aadhaar, PAN, driving licence or any other documents.",
    required: "Verifying with DigiLocker adds a Verified with DigiLocker badge to your account.",
    bannerBody: "",
    bannerUnavailable: "DigiLocker verification is not available right now. Please check back later.",
    bannerUnknown: "We could not check your verification status right now. Please try again later.",
    consent: "I agree to FairSwap using my DigiLocker sign-in to verify my account.",
    button: "Verify with DigiLocker",
    working: "Please wait…",
    verified: "Verified with DigiLocker",
    pending: "We could not confirm your verification yet. Refresh this page in a moment; if your account still shows as not verified, please try again.",
    unavailable: "Verification is not available yet.",
    recovery: "Need help with your account? Contact support.",
    gate: {
      post: { title: "Verify to post an ad", body: "Verify your FairSwap account with DigiLocker before posting an ad. This helps reduce fake listings and impersonation." },
      messages: { title: "Verify to send messages", body: "Verify your FairSwap account with DigiLocker before contacting a seller or sending messages. This helps reduce fake accounts and fraud." },
    },
    continue: "Continue",
    results: {
      denied: "You did not give permission in DigiLocker, so nothing was verified. You can try again.",
      already_linked: "This DigiLocker account is already linked to another FairSwap account. Contact support to recover your account.",
      unavailable: "We could not verify this account. Contact support if you need help.",
      expired: "This verification session expired or was already used. Please start again.",
      provider_error: "DigiLocker did not respond in time. Please try again in a few minutes.",
      not_confirmed: "We could not confirm your DigiLocker sign-in, so nothing was verified and no badge was added. Please try again.",
      failed: "Verification could not be completed. Please try again.",
    },
  },
} as const;
