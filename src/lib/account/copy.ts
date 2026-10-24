export type AccountLocale = "en" | "hi";

export type PreviewKey = "verification" | "ratings" | "fairseeds" | "savedSearches";

export interface PreviewCopy {
  title: string;
  body: string;
}

export interface SellerProfileCopy {
  memberSince: string; // "{date}" placeholder
  share: string;
  shareTitle: string;
  linkCopied: string;
  shareFailed: string;
  backToListings: string;
  tabsLabel: string;
  listingsTab: string;
  ratingsTab: string;
  comingSoon: string;
  aboutSeller: string;
  searchLabel: string;
  searchPlaceholder: string;
  category: string;
  allCategories: string;
  condition: string;
  anyCondition: string;
  conditions: Record<"new" | "like_new" | "good" | "fair" | "poor", string>;
  priceMin: string;
  priceMax: string;
  sort: string;
  sorts: Record<"newest" | "oldest" | "price_asc" | "price_desc", string>;
  apply: string;
  clear: string;
  emptyTitle: string;
  emptyBody: string;
  noMatchTitle: string;
  noMatchBody: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  previous: string;
  next: string;
  pageOf: string; // "{page}" "{total}"
  ratingsTitle: string;
  ratingsBody: string;
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
    "profile" | "listings" | "trades" | "chats" | "favourites" | "savedSearches" | "ratings" | "fairseeds" | "settings" | "privacy" | "help",
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
  trades: { title: string; subtitle: string; tabsLabel: string; sold: string; bought: string; soldTitle: string; soldBody: string; boughtTitle: string; boughtBody: string; unavailable: string; };
  seller: SellerProfileCopy;
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
    listings: { title: "My ads", description: "Manage the ads you've posted on FairSwap." },
    trades: { title: "My trades", description: "Track items you have sold and bought on FairSwap." },
    chats: { title: "Chats", description: "Your conversations with buyers and sellers." },
    favourites: { title: "Favourites", description: "Ads you have saved for later." },
    savedSearches: { title: "Saved searches & alerts", description: "Get notified when new ads match what you're looking for." },
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
    savedSearches: {
      title: "Saved searches & alerts",
      body: "Saved searches & alerts are coming soon.",
    },
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
  trades: {
    title: "My trades",
    subtitle: "Your history of sales and purchases confirmed on FairSwap.",
    tabsLabel: "Trade history sections",
    sold: "Sold",
    bought: "Bought",
    soldTitle: "Your completed sales will appear here",
    soldBody: "Once a buyer confirms a transaction, its record will appear in this section.",
    boughtTitle: "Your completed purchases will appear here",
    boughtBody: "Once you and a seller confirm a transaction, its record will appear in this section.",
    unavailable: "Trade confirmation has not launched yet. You cannot confirm trades on FairSwap yet.",
  },
  seller: {
    memberSince: "FairSwap member since {date}",
    share: "Share profile",
    shareTitle: "Seller profile on FairSwap",
    linkCopied: "Profile link copied",
    shareFailed: "Could not share. Copy the link from the address bar.",
    backToListings: "Back to ads",
    tabsLabel: "Seller profile sections",
    listingsTab: "Ads",
    ratingsTab: "Ratings",
    comingSoon: "Coming soon",
    aboutSeller: "About this seller",
    searchLabel: "Search this seller's ads",
    searchPlaceholder: "Search ads",
    category: "Category",
    allCategories: "All categories",
    condition: "Condition",
    anyCondition: "Any condition",
    conditions: { new: "Brand New", like_new: "Like New", good: "Good Condition", fair: "Fair", poor: "For Parts" },
    priceMin: "Min price (₹)",
    priceMax: "Max price (₹)",
    sort: "Sort by",
    sorts: { newest: "Newest first", oldest: "Oldest first", price_asc: "Price: low to high", price_desc: "Price: high to low" },
    apply: "Apply",
    clear: "Clear filters",
    emptyTitle: "No active ads",
    emptyBody: "This seller does not have any ads available right now.",
    noMatchTitle: "No ads match",
    noMatchBody: "Try a different search or clear the filters.",
    errorTitle: "Could not load ads",
    errorBody: "Something went wrong while loading this seller's ads. Please try again.",
    retry: "Try again",
    previous: "Previous",
    next: "Next",
    pageOf: "Page {page} of {total}",
    ratingsTitle: "Ratings & Reviews",
    ratingsBody: "Soon, FairSwap members will be able to share feedback about completed exchanges.",
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
    listings: { title: "मेरे विज्ञापन", description: "FairSwap पर आपके द्वारा पोस्ट किए गए विज्ञापनों को प्रबंधित करें।" },
    trades: { title: "मेरे लेन-देन", description: "FairSwap पर बेची और खरीदी गई वस्तुओं का रिकॉर्ड देखें।" },
    chats: { title: "चैट", description: "खरीदारों और विक्रेताओं के साथ आपकी बातचीत।" },
    favourites: { title: "पसंदीदा", description: "बाद के लिए सहेजे गए विज्ञापन।" },
    savedSearches: { title: "सेव की गई खोजें और अलर्ट", description: "आपकी खोज से मेल खाने वाले नए विज्ञापनों की सूचना पाएँ।" },
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
    savedSearches: {
      title: "सेव की गई खोजें और अलर्ट",
      body: "सेव की गई खोजें और अलर्ट जल्द आ रहे हैं।",
    },
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
  trades: {
    title: "मेरे लेन-देन",
    subtitle: "FairSwap पर पुष्टि की गई आपकी बिक्री और खरीद का इतिहास।",
    tabsLabel: "लेन-देन के इतिहास के अनुभाग",
    sold: "बेची गई",
    bought: "खरीदी गई",
    soldTitle: "आपकी पूरी हुई बिक्री यहां दिखाई देंगी",
    soldBody: "जब कोई खरीदार लेन-देन की पुष्टि करेगा, तो उसका रिकॉर्ड इस अनुभाग में दिखाई देगा।",
    boughtTitle: "आपकी पूरी हुई खरीद यहां दिखाई देंगी",
    boughtBody: "जब आप और विक्रेता लेन-देन की पुष्टि करेंगे, तो उसका रिकॉर्ड इस अनुभाग में दिखाई देगा।",
    unavailable: "लेन-देन की पुष्टि की सुविधा अभी शुरू नहीं हुई है। आप अभी FairSwap पर लेन-देन की पुष्टि नहीं कर सकते।",
  },
  seller: {
    memberSince: "FairSwap सदस्य {date} से",
    share: "प्रोफ़ाइल साझा करें",
    shareTitle: "FairSwap पर विक्रेता प्रोफ़ाइल",
    linkCopied: "प्रोफ़ाइल लिंक कॉपी हो गया",
    shareFailed: "साझा नहीं हो सका। एड्रेस बार से लिंक कॉपी करें।",
    backToListings: "विज्ञापनों पर वापस जाएं",
    tabsLabel: "विक्रेता प्रोफ़ाइल अनुभाग",
    listingsTab: "विज्ञापन",
    ratingsTab: "रेटिंग",
    comingSoon: "जल्द आ रहा है",
    aboutSeller: "इस विक्रेता के बारे में",
    searchLabel: "इस विक्रेता के विज्ञापन खोजें",
    searchPlaceholder: "विज्ञापन खोजें",
    category: "श्रेणी",
    allCategories: "सभी श्रेणियां",
    condition: "स्थिति",
    anyCondition: "कोई भी स्थिति",
    conditions: { new: "बिल्कुल नया", like_new: "नए जैसा", good: "अच्छी स्थिति", fair: "ठीक-ठाक", poor: "पुर्ज़ों के लिए" },
    priceMin: "न्यूनतम कीमत (₹)",
    priceMax: "अधिकतम कीमत (₹)",
    sort: "क्रमबद्ध करें",
    sorts: { newest: "नवीनतम पहले", oldest: "सबसे पुराना पहले", price_asc: "कीमत: कम से ज़्यादा", price_desc: "कीमत: ज़्यादा से कम" },
    apply: "लागू करें",
    clear: "फ़िल्टर हटाएं",
    emptyTitle: "कोई सक्रिय विज्ञापन नहीं",
    emptyBody: "इस विक्रेता का कोई विज्ञापन अभी उपलब्ध नहीं है।",
    noMatchTitle: "कोई विज्ञापन नहीं मिला",
    noMatchBody: "कोई दूसरी खोज आज़माएं या फ़िल्टर हटाएं।",
    errorTitle: "विज्ञापन लोड नहीं हो सके",
    errorBody: "इस विक्रेता के विज्ञापन लोड करते समय कुछ गलत हो गया। कृपया फिर कोशिश करें।",
    retry: "फिर कोशिश करें",
    previous: "पिछला",
    next: "अगला",
    pageOf: "पृष्ठ {page} / {total}",
    ratingsTitle: "रेटिंग और समीक्षाएं",
    ratingsBody: "जल्द ही FairSwap सदस्य पूर्ण हुए लेन-देन के बारे में प्रतिक्रिया साझा कर सकेंगे।",
  },
};

const COPY: Record<AccountLocale, AccountCopy> = { en, hi };

/** The Web baseline has no locale mechanism yet, so callers default to English. */
export function getAccountCopy(locale: AccountLocale = "en"): AccountCopy {
  return COPY[locale];
}

/** "FairSwap member since September 2026", from the real registration date. */
export function formatMemberSince(createdAt: string, locale: AccountLocale = "en"): string {
  const date = new Date(createdAt);
  const label = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
        year: "numeric",
        month: "long",
        timeZone: "Asia/Kolkata",
      });
  return label ? COPY[locale].seller.memberSince.replace("{date}", label) : COPY[locale].memberFallback;
}
