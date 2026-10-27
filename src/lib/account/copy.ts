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
  locationLabel: string;
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
  profileCompletion: { title: string; body: string; action: string };
  notificationPreferences: { title: string; body: string };
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
    status: string;
    cta: string;
    states: {
      comingSoon: { title: string; body: string };
      notVerified: { title: string; body: string };
      consentRequired: { title: string; body: string };
      redirecting: { title: string; body: string };
      inProgress: { title: string; body: string };
      verified: { title: string; body: string };
      failed: { title: string; body: string };
      cancelled: { title: string; body: string };
      expired: { title: string; body: string };
      revoked: { title: string; body: string };
      unableToVerify: { title: string; body: string };
    };
    badges: {
      verified: string;
      notVerified: string;
    };
    consent: {
      notice: string;
      terms: string;
      withdrawCta: string;
      withdrawing: string;
    };
    actions: {
      tryAgain: string;
      activeBadge: string;
      verifiedOn: string;
      reasonLabel: string;
      preparingNotice: string;
    };
  };
  previews: Record<PreviewKey, PreviewCopy>;
  trades: {
    title: string;
    subtitle: string;
    tabsLabel: string;
    sold: string;
    bought: string;
    soldTitle: string;
    soldBody: string;
    boughtTitle: string;
    boughtBody: string;
    unavailable: string;
  };
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
  profileCompletion: {
    title: "Complete your profile",
    body: "Add your PIN code and area so buyers and sellers know roughly where you are. Your PIN is never shown publicly.",
    action: "Complete profile",
  },
  notificationPreferences: {
    title: "Notification preferences",
    body: "Choose which updates you receive. Coming soon.",
  },
  viewPublicProfile: "View public profile",
  memberSince: "Member since",
  ratings: "Ratings",
  backToAccount: "Back to Account",
  readSafetyTips: "Read safety tips",
  tiles: {
    profile: { title: "My profile", description: "Manage your name, location and profile details." },
    listings: { title: "My ads", description: "Manage the ads you've posted on FairSwap." },
    trades: {title: "My trades",description: "Track items you have sold and bought on FairSwap."},
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
    heading: "Identity verification",
    body: "DigiLocker verification helps confirm real community members and build confidence when buying and selling.",
    status: "Coming soon",
    cta: "Verify identity",
    states: {
      comingSoon: {
        title: "DigiLocker verification is coming soon",
        body: "We are currently completing technical integrations and compliance reviews before launching verification in your region. Verification initiation is temporarily disabled.",
      },
      notVerified: {
        title: "Account not verified",
        body: "Verify your identity through DigiLocker to earn a verified member badge on your public listings.",
      },
      consentRequired: {
        title: "Consent required",
        body: "To initiate verification, you must authorize FairSwap to request government-issued identity confirmation via DigiLocker. You can withdraw your consent at any time.",
      },
      redirecting: {
        title: "Redirecting to DigiLocker…",
        body: "Please wait while we transfer you to the secure DigiLocker portal to complete authorization.",
      },
      inProgress: {
        title: "Verification in progress",
        body: "Your verification request is currently being confirmed by the provider. This typically takes only a few moments.",
      },
      verified: {
        title: "Identity verified",
        body: "Your identity has been verified via DigiLocker. A verified badge is now displayed on your public seller profile.",
      },
      failed: {
        title: "Verification failed",
        body: "The identity verification process could not be completed. Please ensure your official DigiLocker documents are valid and retry.",
      },
      cancelled: {
        title: "Verification cancelled",
        body: "The DigiLocker authorization session was cancelled before completion. No identity details were recorded.",
      },
      expired: {
        title: "Verification session expired",
        body: "Your verification session has timed out. Please initiate a new verification request to continue.",
      },
      revoked: {
        title: "Verification revoked",
        body: "Your identity verification has been revoked or withdrawn. Your public verified badge is no longer active.",
      },
      unableToVerify: {
        title: "Unable to verify",
        body: "We could not verify the document evidence provided. If you believe this is an error, please contact FairSwap support.",
      },
    },
    badges: {
      verified: "Verified Identity",
      notVerified: "Not Verified",
    },
    consent: {
      notice: "By proceeding, you authorize FairSwap to verify your government identity credentials via DigiLocker. FairSwap never stores your original identity documents.",
      terms: "Verification confirms member authenticity; it is not a guarantee of goods or financial safety.",
      withdrawCta: "Withdraw consent & remove badge",
      withdrawing: "Withdrawing…",
    },
    actions: {
      tryAgain: "Try again",
      activeBadge: "Active",
      verifiedOn: "Verified on {date}",
      reasonLabel: "Reason: {reason}",
      preparingNotice: "Identity verification will be released once regulatory and integration steps are finalized. Both staging and production environments currently display this status.",
    },
  },
  previews: {
    savedSearches: {
      title: "Saved searches & alerts",
      body: "Saved searches & alerts are coming soon.",
    },
    verification: {
      title: "Identity verification is coming soon.",
      body: "DigiLocker verification will help buyers and sellers trade with more trust. The feature is currently in preparation.",
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
    unavailable: "Trade confirmation has not launched yet. You cannot confirm trades on FairSwap yet."
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
    locationLabel: "Location",
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
  profileCompletion: {
    title: "अपनी प्रोफ़ाइल पूरी करें",
    body: "अपना पिन कोड और इलाका जोड़ें ताकि खरीदार और विक्रेता मोटे तौर पर आपका स्थान जान सकें। आपका पिन कभी सार्वजनिक नहीं दिखता।",
    action: "प्रोफ़ाइल पूरी करें",
  },
  notificationPreferences: {
    title: "सूचना प्राथमिकताएं",
    body: "चुनें कि आपको कौन से अपडेट मिलें। जल्द आ रहा है।",
  },
  viewPublicProfile: "सार्वजनिक प्रोफ़ाइल देखें",
  memberSince: "सदस्य बने",
  ratings: "रेटिंग",
  backToAccount: "खाते पर वापस जाएं",
  readSafetyTips: "सुरक्षा सुझाव पढ़ें",
  tiles: {
    profile: { title: "मेरी प्रोफ़ाइल", description: "अपना नाम, स्थान और प्रोफ़ाइल विवरण प्रबंधित करें।" },
    listings: { title: "मेरे विज्ञापन", description: "FairSwap पर आपके द्वारा पोस्ट किए गए विज्ञापनों को प्रबंधित करें।" },
    trades: {title: "मेरे लेन-देन",description: "FairSwap पर बेची और खरीदी गई वस्तुओं का रिकॉर्ड देखें।"},
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
    heading: "पहचान सत्यापन",
    body: "DigiLocker सत्यापन वास्तविक समुदाय के सदस्यों की पुष्टि करने और सुरक्षित लेन-देन को बढ़ावा देने में मदद करता है।",
    status: "जल्द आ रहा है",
    cta: "पहचान सत्यापित करें",
    states: {
      comingSoon: {
        title: "DigiLocker सत्यापन जल्द आ रहा है",
        body: "हम वर्तमान में तकनीकी एकीकरण और कानूनी समीक्षा पूरी कर रहे हैं। सत्यापन शुरू करने की सुविधा अभी अक्षम है।",
      },
      notVerified: {
        title: "खाता सत्यापित नहीं है",
        body: "अपने सार्वजनिक विज्ञापनों पर सत्यापित सदस्य बैज प्राप्त करने के लिए DigiLocker के माध्यम से अपनी पहचान सत्यापित करें।",
      },
      consentRequired: {
        title: "सहमति आवश्यक है",
        body: "सत्यापन शुरू करने के लिए, आपको FairSwap को DigiLocker के माध्यम से सरकारी पहचान की पुष्टि करने की अनुमति देनी होगी। आप किसी भी समय अपनी सहमति वापस ले सकते हैं।",
      },
      redirecting: {
        title: "DigiLocker पर भेजा जा रहा है…",
        body: "कृपया प्रतीक्षा करें जब तक हम आपको प्रमाणीकरण पूरा करने के लिए सुरक्षित DigiLocker पोर्टल पर स्थानांतरित करते हैं।",
      },
      inProgress: {
        title: "सत्यापन प्रगति पर है",
        body: "आपके सत्यापन अनुरोध की जांच की जा रही है। इसमें आमतौर पर कुछ ही क्षण लगते हैं।",
      },
      verified: {
        title: "पहचान सत्यापित हो गई",
        body: "आपकी पहचान DigiLocker के माध्यम से सत्यापित हो गई है। आपकी सार्वजनिक प्रोफ़ाइल पर एक सत्यापित बैज प्रदर्शित हो गया है।",
      },
      failed: {
        title: "सत्यापन विफल रहा",
        body: "पहचान सत्यापन प्रक्रिया पूरी नहीं हो सकी। कृपया सुनिश्चित करें कि आपके DigiLocker दस्तावेज़ मान्य हैं और पुनः प्रयास करें।",
      },
      cancelled: {
        title: "सत्यापन रद्द किया गया",
        body: "DigiLocker सत्र पूरा होने से पहले रद्द कर दिया गया था। कोई पहचान विवरण दर्ज नहीं किया गया।",
      },
      expired: {
        title: "सत्यापन सत्र समाप्त हो गया",
        body: "आपके सत्यापन सत्र का समय समाप्त हो गया है। जारी रखने के लिए कृपया एक नया अनुरोध शुरू करें।",
      },
      revoked: {
        title: "सत्यापन निरस्त कर दिया गया",
        body: "आपकी पहचान का सत्यापन निरस्त या वापस ले लिया गया है। आपका सत्यापित बैज अब सक्रिय नहीं है।",
      },
      unableToVerify: {
        title: "सत्यापित करने में असमर्थ",
        body: "प्रदान किए गए दस्तावेज़ साक्ष्य को सत्यापित नहीं किया जा सका। यदि आपको लगता है कि यह कोई त्रुटि है, तो सहायता से संपर्क करें।",
      },
    },
    badges: {
      verified: "सत्यापित पहचान",
      notVerified: "सत्यापित नहीं",
    },
    consent: {
      notice: "आगे बढ़कर, आप FairSwap को DigiLocker के माध्यम से आपकी सरकारी पहचान की पुष्टि करने के लिए अधिकृत करते हैं। FairSwap कभी भी आपके मूल पहचान दस्तावेज़ संग्रहीत नहीं करता है।",
      terms: "सत्यापन सदस्य की प्रामाणिकता की पुष्टि करता है; यह सामान या वित्तीय सुरक्षा की गारंटी नहीं है।",
      withdrawCta: "सहमति वापस लें और बैज हटाएं",
      withdrawing: "वापस लिया जा रहा है…",
    },
    actions: {
      tryAgain: "पुनः प्रयास करें",
      activeBadge: "सक्रिय",
      verifiedOn: "सत्यापित तिथि: {date}",
      reasonLabel: "कारण: {reason}",
      preparingNotice: "नियामकीय और एकीकरण प्रक्रिया पूरी होने के बाद पहचान सत्यापन जारी किया जाएगा। वर्तमान में दोनों वातावरण में यही स्थिति दिखती है।",
    },
  },
  previews: {
    savedSearches: {
      title: "सेव की गई खोजें और अलर्ट",
      body: "सेव की गई खोजें और अलर्ट जल्द आ रहे हैं।",
    },
    verification: {
      title: "पहचान सत्यापन जल्द आ रहा है।",
      body: "DigiLocker सत्यापन खरीदारों और विक्रेताओं को अधिक भरोसे के साथ लेन-देन करने में मदद करेगा। यह सुविधा अभी तैयार की जा रही है।",
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
    unavailable: "लेन-देन की पुष्टि की सुविधा अभी शुरू नहीं हुई है। आप अभी FairSwap पर लेन-देन की पुष्टि नहीं कर सकते।"
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
    locationLabel: "स्थान",
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
