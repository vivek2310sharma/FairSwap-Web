export type ChatLocale = "en" | "hi";
const en = {
  messages: "Messages", all: "All", buying: "Buying", selling: "Selling", search: "Search names or ads", searchButton: "Search", unread: "Unread only", countsHint: "Tab totals count conversations matching search and ad filters, including read conversations.",
  loadMore: "Load more conversations", older: "Load older messages", loading: "Loading…", retry: "Retry", back: "Back to inbox", groupBack: "All selling ads",
  select: "Select a conversation to start reading.", emptyAll: "No conversations yet. Contact a seller or wait for an enquiry on your ad.",
  emptyBuying: "No buying conversations. Browse ads and contact a seller.", emptySelling: "No selling enquiries on your ads yet.", emptyFiltered: "No conversations match these filters.",
  enquiries: "enquiries", buyer: "Buyer", seller: "Seller", deleted: "Deleted user", own: "You: ", unreadMessages: "unread messages", noPreview: "No messages yet",
  safety: "Never share your UPI PIN or OTP. Avoid advance payments before seeing the item.", safetyTitle: "Stay safe", warning: "Potential risk in this received message:",
  forbidden: "You do not have access to this conversation or inbox.", unauthenticated: "Please sign in again to read messages.", disabled: "The new inbox is not available yet.",
  invalid: "This message request is invalid.", unavailable: "Messages could not be loaded. Please retry.",
  send: "Send message", placeholder: "Type your message…", pending: "Sending…", sent: "Sent", failed: "Failed to send", seen: "Seen", readError: "Read status could not be updated.",
  reportUser: "Report user", blockUser: "Block user", reportMessage: "Report message", blocked: "Messaging is unavailable between these participants.",
  closed: "This conversation is closed because the ad was removed or rejected by moderation.", policy: "Review current policies to continue.", viewAd: "View ad", noPhoto: "No photo", emptyThread: "No messages yet. Start the conversation below.",
  OTP_PIN: "Do not share OTPs or UPI PINs.", QR_RECEIVE: "You do not need to scan a QR code to receive money.", ADVANCE_VIEWING: "Avoid paying before viewing the item.",
  IMPERSONATION_FEE: "Be cautious of impersonation and fee requests.", UPI_COLLECT: "A UPI collect request may debit your account.", PAYMENT_LINK: "Be cautious of payment links.",
  ADVANCE_DELIVERY: "Avoid advance delivery or courier payments.", OFF_PLATFORM: "Be cautious when asked to move the conversation off FairSwap.",
} as const;
type Copy = { [K in keyof typeof en]: string };
const hi: Copy = {
  messages: "संदेश", all: "सभी", buying: "खरीदारी", selling: "बिक्री", search: "नाम या विज्ञापन खोजें", searchButton: "खोजें", unread: "केवल अपठित", countsHint: "टैब के कुल में खोज और विज्ञापन फ़िल्टर से मेल खाने वाली सभी बातचीत शामिल हैं, पढ़ी हुई भी।",
  loadMore: "और बातचीत दिखाएँ", older: "पुराने संदेश दिखाएँ", loading: "लोड हो रहा है…", retry: "फिर कोशिश करें", back: "इनबॉक्स पर लौटें", groupBack: "बिक्री के सभी विज्ञापन",
  select: "पढ़ने के लिए बातचीत चुनें।", emptyAll: "अभी कोई बातचीत नहीं है। विक्रेता से संपर्क करें या अपने विज्ञापन पर पूछताछ की प्रतीक्षा करें।",
  emptyBuying: "खरीदारी की कोई बातचीत नहीं है। विज्ञापन देखें और विक्रेता से संपर्क करें।", emptySelling: "आपके विज्ञापनों पर अभी कोई पूछताछ नहीं है।", emptyFiltered: "इन फ़िल्टर से कोई बातचीत नहीं मिली।",
  enquiries: "पूछताछ", buyer: "खरीदार", seller: "विक्रेता", deleted: "हटाया गया उपयोगकर्ता", own: "आप: ", unreadMessages: "अपठित संदेश", noPreview: "अभी कोई संदेश नहीं है",
  safety: "अपना UPI PIN या OTP कभी साझा न करें। सामान देखने से पहले अग्रिम भुगतान से बचें।", safetyTitle: "सुरक्षित रहें", warning: "इस प्राप्त संदेश में संभावित जोखिम:",
  forbidden: "आपको इस बातचीत या इनबॉक्स की अनुमति नहीं है।", unauthenticated: "संदेश पढ़ने के लिए फिर साइन इन करें।", disabled: "नया इनबॉक्स अभी उपलब्ध नहीं है।", invalid: "संदेश का अनुरोध अमान्य है।", unavailable: "संदेश लोड नहीं हुए। फिर कोशिश करें।",
  send: "संदेश भेजें", placeholder: "अपना संदेश लिखें…", pending: "भेजा जा रहा है…", sent: "भेज दिया गया", failed: "संदेश नहीं भेजा गया", seen: "देख लिया गया", readError: "पढ़ने की स्थिति अपडेट नहीं हुई।",
  reportUser: "उपयोगकर्ता की शिकायत करें", blockUser: "उपयोगकर्ता को ब्लॉक करें", reportMessage: "संदेश की शिकायत करें", blocked: "इन उपयोगकर्ताओं के बीच संदेश उपलब्ध नहीं हैं।",
  closed: "मॉडरेशन द्वारा विज्ञापन हटाने या अस्वीकार करने के कारण यह बातचीत बंद है।", policy: "जारी रखने के लिए मौजूदा नीतियाँ देखें।", viewAd: "विज्ञापन देखें", noPhoto: "फ़ोटो नहीं है", emptyThread: "अभी कोई संदेश नहीं है। नीचे बातचीत शुरू करें।",
  OTP_PIN: "OTP या UPI PIN साझा न करें।", QR_RECEIVE: "पैसे पाने के लिए QR कोड स्कैन करना ज़रूरी नहीं है।", ADVANCE_VIEWING: "सामान देखने से पहले भुगतान न करें।", IMPERSONATION_FEE: "फ़र्ज़ी पहचान और शुल्क माँगने वालों से सावधान रहें।",
  UPI_COLLECT: "UPI collect अनुरोध से आपके खाते से पैसे कट सकते हैं।", PAYMENT_LINK: "भुगतान लिंक से सावधान रहें।", ADVANCE_DELIVERY: "डिलीवरी या कूरियर के लिए अग्रिम भुगतान से बचें।", OFF_PLATFORM: "बातचीत FairSwap से बाहर ले जाने के अनुरोध से सावधान रहें।",
};
// The current Web shell has no shared language selector. English is the baseline;
// callers can select this complete Hindi dictionary when that mechanism is wired.
export const chatCopy = (locale: ChatLocale = "en"): Copy => locale === "hi" ? hi : en;
