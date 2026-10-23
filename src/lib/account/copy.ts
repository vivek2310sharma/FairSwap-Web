/**
 * User-facing English copy for the Account hub and the scam-report flow.
 *
 * Kept in one place so a future English/Hindi pass can swap strings without
 * touching layout code. ACC-01 intentionally ships English only: Web has no
 * i18n framework, and the Help Centre (help.fairswap.in) owns translated content.
 */
export const ACCOUNT_COPY = {
  pageTitle: "My account",
  signOut: "Sign out",
  viewPublicProfile: "View public profile",
  memberSince: "Member since",
  cards: {
    profile: {
      title: "Profile",
      description: "Edit the name, city and bio buyers see",
      descriptionRestricted: "Review your saved profile details",
    },
    listings: {
      title: "My listings",
      description: "Post, edit and manage your ads",
    },
    chats: {
      title: "Chats",
      description: "Talk to buyers and sellers in FairSwap",
    },
    favourites: {
      title: "Favourites",
      description: "Ads you have saved to revisit",
    },
    settings: {
      title: "Settings",
      description: "Password, sign-in and email preferences",
    },
    privacy: {
      title: "Privacy & your data",
      description: "Download your data, manage consent or delete your account",
    },
    help: {
      title: "Help & safety",
      description: "Support tickets, safety tips and grievance contact",
      titleRestricted: "Appeals & support",
      descriptionRestricted: "Submit a moderation appeal or contact support",
    },
  },
  scamStrip: {
    title: "Report a scam",
    heading: "Something feel wrong?",
    body: "Never pay in advance or send money to “hold” an item. Tell us about suspicious activity so we can review it.",
    examples: [
      "Advance-payment or UPI request scams",
      "Fake courier or delivery links",
      "Fake army officer impersonation",
      "Fraudulent payment links",
    ],
    cta: "Report a scam",
    note: "Creates a safety support ticket reviewed by the FairSwap support team.",
  },
  notices: {
    unavailableTitle: "Account Information Unavailable",
    unavailableBody:
      "Unable to verify account status right now. Profile editing and marketplace actions may be limited.",
    suspendedTitle: "Account Suspended",
    suspendedBody:
      "Your account is currently suspended. Marketplace actions and profile updates are disabled. You retain access to your security overview, support appeals, and privacy rights.",
    deletionPendingTitle: "Account Deletion Pending",
    deletionPendingBody: "Your account deletion request is currently pending processing.",
    deletedTitle: "Account Closed",
    deletedBody: "This account has been closed. Marketplace actions and profile updates are disabled.",
  },
} as const;

export const SCAM_REPORT_COPY = {
  title: "Report a scam",
  intro:
    "Tell us what happened. Your report is sent as a safety support ticket and reviewed by the FairSwap support team through our admin support queue. It is not a police complaint.",
  subjectLabel: "Short summary",
  subjectHint: "For example: “Buyer asked me to pay a delivery fee by UPI”",
  messageLabel: "What happened?",
  messageHint:
    "Describe the ad, the person or message involved, and what they asked you to do. Do not include passwords, OTPs, UPI PINs or card numbers.",
  submit: "Submit report",
  submitting: "Submitting…",
  successTitle: "Report submitted",
  successBody: "Opening your support ticket…",
  uncertainTitle: "We could not confirm your report",
  uncertainBody:
    "We could not confirm that your report was submitted. Please check your tickets in Help & safety before trying again, so you do not send it twice.",
  checkTickets: "Check my tickets",
  restrictedTitle: "Reporting is unavailable",
  restrictedSuspended:
    "Your account is suspended, so only moderation appeals can be submitted. Use Help & safety to file an appeal.",
  restrictedOther: "Your account cannot submit reports right now.",
  financialFraudTitle: "Already lost money?",
  financialFraudBody:
    "Contact your bank or payment app straight away, and report financial cyber fraud on the National Cyber Crime Reporting Portal (cybercrime.gov.in) or call 1930. FairSwap cannot reverse UPI transfers.",
} as const;
