export type AccountLocale = "en" | "hi";

export type PreviewKey = "verification" | "ratings" | "fairseeds";

export interface PreviewCopy {
  title: string;
  body: string;
}

export interface AccountCopy {
  accountTitle: string;
  memberFallback: string;
  comingSoon: string;
  gotIt: string;
  close: string;
  signOut: string;
  signingOut: string;
  signOutFailed: string;
  editProfile: string;
  viewPublicProfile: string;
  memberSince: string;
  ratings: string;
  backToAccount: string;
  readSafetyTips: string;
  tiles: Record<
    "profile" | "listings" | "chats" | "favourites" | "ratings" | "fairseeds" | "settings" | "privacy" | "help",
    { title: string; description: string }
  >;
  helpRestrictedDescription: string;
  verification: {
    heading: string;
    body: string;
    regularLabel: string;
    regularSr: string;
    offerSr: string;
    terms: string;
    status: string;
    cta: string;
  };
  previews: Record<PreviewKey, PreviewCopy>;
}

const en: AccountCopy = {
  accountTitle: "Account",
  memberFallback: "FairSwap member",
  comingSoon: "Coming soon",
  gotIt: "Got it",
  close: "Close",
  signOut: "Sign out",
  signingOut: "Signing out…",
  signOutFailed: "Sign out failed. Please try again.",
  editProfile: "Edit profile",
  viewPublicProfile: "View public profile",
  memberSince: "Member since",
  ratings: "Ratings",
  backToAccount: "Back to Account",
  readSafetyTips: "Read safety tips",
  tiles: {
    profile: { title: "My profile", description: "Manage your name, location and profile details." },
    listings: { title: "My listings", description: "Manage the items you have listed." },
    chats: { title: "Chats", description: "Your conversations with buyers and sellers." },
    favourites: { title: "Favourites", description: "Listings you have saved for later." },
    ratings: { title: "Ratings", description: "Feedback from your FairSwap trades." },
    fairseeds: { title: "FairSeeds", description: "A new way to celebrate successful trades." },
    settings: { title: "Settings", description: "Manage account and security preferences." },
    privacy: { title: "Privacy & your data", description: "Manage your data requests and privacy choices." },
    help: { title: "Help & safety", description: "Get support and help with safer trading." },
  },
  helpRestrictedDescription: "Submit a moderation appeal and get support.",
  verification: {
    heading: "Help us make FairSwap secure",
    body: "We are preparing account verification to help buyers and sellers trade with more confidence.",
    regularLabel: "Planned regular price",
    regularSr: "Planned regular price: 99 rupees",
    offerSr: "Planned launch offer: 10 rupees",
    terms: "One-time payment. Lifetime validation.",
    status: "Planned launch offer - Coming soon",
    cta: "Verify account",
  },
  previews: {
    verification: {
      title: "Lifetime verification is coming soon.",
      body: "Planned launch price: ₹10 instead of ₹99, as a one-time payment for lifetime validation. No payment is collected at this stage.",
    },
    ratings: {
      title: "Ratings",
      body: "Ratings are coming soon. You will be able to share feedback about your FairSwap trades when this feature launches.",
    },
    fairseeds: {
      title: "FairSeeds",
      body: "FairSeeds are coming soon. When the feature launches, buyers and sellers will each earn 5 FairSeeds for a completed trade.",
    },
  },
};

const hi: AccountCopy = {
  accountTitle: "खाता",
  memberFallback: "FairSwap सदस्य",
  comingSoon: "जल्द आ रहा है",
  gotIt: "समझ गया",
  close: "बंद करें",
  signOut: "साइन आउट",
  signingOut: "साइन आउट हो रहा है…",
  signOutFailed: "साइन आउट नहीं हो सका। कृपया फिर कोशिश करें।",
  editProfile: "प्रोफ़ाइल संपादित करें",
  viewPublicProfile: "सार्वजनिक प्रोफ़ाइल देखें",
  memberSince: "सदस्य बने",
  ratings: "रेटिंग",
  backToAccount: "खाते पर वापस जाएं",
  readSafetyTips: "सुरक्षा सुझाव पढ़ें",
  tiles: {
    profile: { title: "मेरी प्रोफ़ाइल", description: "अपना नाम, स्थान और प्रोफ़ाइल विवरण प्रबंधित करें।" },
    listings: { title: "मेरी लिस्टिंग", description: "आपके द्वारा सूचीबद्ध वस्तुओं को प्रबंधित करें।" },
    chats: { title: "चैट", description: "खरीदारों और विक्रेताओं के साथ आपकी बातचीत।" },
    favourites: { title: "पसंदीदा", description: "बाद के लिए सहेजी गई लिस्टिंग।" },
    ratings: { title: "रेटिंग", description: "आपके FairSwap लेन-देन से मिली प्रतिक्रिया।" },
    fairseeds: { title: "FairSeeds", description: "सफल लेन-देन का जश्न मनाने का एक नया तरीका।" },
    settings: { title: "सेटिंग्स", description: "खाते और सुरक्षा प्राथमिकताएं प्रबंधित करें।" },
    privacy: { title: "गोपनीयता और आपका डेटा", description: "अपने डेटा अनुरोध और गोपनीयता विकल्प प्रबंधित करें।" },
    help: { title: "सहायता और सुरक्षा", description: "सहायता पाएं और सुरक्षित लेन-देन में मदद लें।" },
  },
  helpRestrictedDescription: "मॉडरेशन अपील जमा करें और सहायता पाएं।",
  verification: {
    heading: "FairSwap को सुरक्षित बनाने में हमारी मदद करें",
    body: "हम खाता सत्यापन तैयार कर रहे हैं ताकि खरीदार और विक्रेता अधिक भरोसे के साथ लेन-देन कर सकें।",
    regularLabel: "प्रस्तावित सामान्य मूल्य",
    regularSr: "प्रस्तावित सामान्य मूल्य: 99 रुपये",
    offerSr: "प्रस्तावित लॉन्च ऑफ़र: 10 रुपये",
    terms: "एकमुश्त भुगतान। आजीवन सत्यापन।",
    status: "प्रस्तावित लॉन्च ऑफ़र - जल्द आ रहा है",
    cta: "खाता सत्यापित करें",
  },
  previews: {
    verification: {
      title: "आजीवन सत्यापन जल्द आ रहा है।",
      body: "प्रस्तावित लॉन्च मूल्य: ₹99 के बजाय ₹10, आजीवन सत्यापन के लिए एकमुश्त भुगतान। इस चरण में कोई भुगतान नहीं लिया जाता।",
    },
    ratings: {
      title: "रेटिंग",
      body: "रेटिंग जल्द आ रही है। यह सुविधा शुरू होने पर आप अपने FairSwap लेन-देन के बारे में प्रतिक्रिया साझा कर सकेंगे।",
    },
    fairseeds: {
      title: "FairSeeds",
      body: "FairSeeds जल्द आ रहे हैं। यह सुविधा शुरू होने पर खरीदार और विक्रेता, दोनों को पूर्ण हुए लेन-देन पर 5-5 FairSeeds मिलेंगे।",
    },
  },
};

const COPY: Record<AccountLocale, AccountCopy> = { en, hi };

/** The Web baseline has no locale mechanism yet, so callers default to English. */
export function getAccountCopy(locale: AccountLocale = "en"): AccountCopy {
  return COPY[locale];
}
