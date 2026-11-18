export type DigiLockerLocale = "en" | "hi";

// Wording states only what is done: the user signed in to their own DigiLocker account. It must not claim the
// provider transmits only the identifier (the token response also carries profile fields); FairSwap uses only the
// identifier and keeps none of the rest (only a keyed HMAC of the identifier is stored). No document, Aadhaar,
// PAN or licence check is performed, and nothing here claims escrow, payment protection or government KYC.
export const digiLockerCopy = {
  en: {
    heading: "Verify with DigiLocker",
    body: "Sign in to your DigiLocker account once to verify your FairSwap account. DigiLocker may share some profile details with us, but FairSwap uses only your DigiLocker account identifier to confirm your account and does not keep the other details. We do not ask for or access your Aadhaar, PAN, driving licence or any other documents.",
    required: "Verify your account to post ads, message other members or make offers. You can still browse and search.",
    consent: "I agree to FairSwap using my DigiLocker sign-in to verify my account.",
    button: "Verify with DigiLocker",
    working: "Please wait…",
    verified: "Your FairSwap account is verified with a DigiLocker sign-in. You will not be asked to verify again.",
    pending: "We could not confirm your verification yet. Refresh this page in a moment; if your account still shows as not verified, please try again.",
    unavailable: "Verification is not available yet.",
    recovery: "Need help with your account? Contact support.",
    results: {
      denied: "You did not give permission in DigiLocker, so nothing was verified. You can try again.",
      already_linked: "This DigiLocker account is already linked to another FairSwap account. Contact support to recover your account.",
      unavailable: "We could not verify this account. Contact support if you need help.",
      expired: "This verification session expired or was already used. Please start again.",
      provider_error: "DigiLocker did not respond in time. Please try again in a few minutes.",
      failed: "Verification could not be completed. Please try again.",
    },
  },
  hi: {
    heading: "DigiLocker से सत्यापित करें",
    body: "अपना FairSwap खाता सत्यापित करने के लिए एक बार अपने DigiLocker खाते में साइन इन करें। DigiLocker हमारे साथ कुछ प्रोफ़ाइल जानकारी साझा कर सकता है, लेकिन FairSwap आपके खाते की पुष्टि के लिए केवल आपके DigiLocker खाता पहचानकर्ता (ID) का उपयोग करता है और बाकी जानकारी नहीं रखता। हम आपका आधार, पैन, ड्राइविंग लाइसेंस या कोई अन्य दस्तावेज़ न माँगते हैं, न देखते हैं।",
    required: "विज्ञापन डालने, अन्य सदस्यों को संदेश भेजने या ऑफ़र करने के लिए खाता सत्यापित करें। ब्राउज़ और खोज पहले की तरह कर सकते हैं।",
    consent: "मैं सहमत हूँ कि FairSwap मेरे खाते को सत्यापित करने के लिए मेरे DigiLocker साइन-इन का उपयोग करे।",
    button: "DigiLocker से सत्यापित करें",
    working: "कृपया प्रतीक्षा करें…",
    verified: "आपका FairSwap खाता DigiLocker साइन-इन से सत्यापित है। दोबारा सत्यापन के लिए नहीं कहा जाएगा।",
    pending: "हम अभी आपके सत्यापन की पुष्टि नहीं कर सके। थोड़ी देर बाद यह पेज रीफ़्रेश करें; अगर खाता अब भी असत्यापित दिखे, तो फिर से प्रयास करें।",
    unavailable: "सत्यापन अभी उपलब्ध नहीं है।",
    recovery: "खाते में मदद चाहिए? सहायता से संपर्क करें।",
    results: {
      denied: "आपने DigiLocker में अनुमति नहीं दी, इसलिए कुछ भी सत्यापित नहीं हुआ। आप फिर से प्रयास कर सकते हैं।",
      already_linked: "यह DigiLocker खाता पहले से किसी अन्य FairSwap खाते से जुड़ा है। खाता पुनः प्राप्त करने के लिए सहायता से संपर्क करें।",
      unavailable: "हम इस खाते को सत्यापित नहीं कर सके। मदद के लिए सहायता से संपर्क करें।",
      expired: "यह सत्यापन सत्र समाप्त हो गया या पहले ही उपयोग हो चुका है। कृपया फिर से शुरू करें।",
      provider_error: "DigiLocker ने समय पर जवाब नहीं दिया। कृपया कुछ मिनट बाद फिर प्रयास करें।",
      failed: "सत्यापन पूरा नहीं हो सका। कृपया फिर प्रयास करें।",
    },
  },
} as const;
