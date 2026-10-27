import type { AccountLocale } from "@/lib/account/copy";

const en = {
  title: "Ratings", pending: "To rate", received: "Ratings received", given: "Ratings given", empty: "Nothing here yet.",
  unavailable: "Ratings are unavailable right now. Please try again later.", expired: "The 14-day rating window has closed.",
  loading: "Loading…", more: "Load more", buyer: "Buyer", seller: "Seller", member: "FairSwap member", noScore: "No ratings yet",
  reviews: "Published reviews", completed: "Completed trades", dimensions: "Dimension averages (out of 4)",
  communication: "Communication", item: "Item as described", payment: "Payment", handover: "Meeting/handover", pickup: "Meeting/pickup",
  faces: ["Poor", "Fair", "Good", "Excellent"], rate: "Rate", confirm: "Rate Seller — confirm I bought this", dispute: "I didn't buy this",
  confirmInfo: "Opening Rate Seller confirms your purchase. This confirmation stays even if you leave without writing a review.",
  disputeWarning: "Confirm that you did not buy this item. This opens a private support case and pauses ratings for this trade.",
  selectBuyer: "Select the buyer", notNow: "Not now", none: "None of these people", sold: "Mark as sold", cancel: "Cancel",
  selectionInfo: "Choose a buyer from this ad’s conversations. Selection does not extend the original 14-day window.",
  tags: "Tags (optional, up to 5)", comment: "Written review (optional, 500 characters)", preview: "Preview", submit: "Submit review",
  immutable: "Once submitted, this review cannot be changed.", required: "Choose a face for all three questions.",
  invalidText: "Use up to 500 characters without line breaks, control characters or angle brackets.",
  sealed: "Your review is private until both people submit or the 14-day deadline passes. Publication may take longer while processing or a case is open.",
  submitted: "Review submitted", notRated: "Not rated", reply: "Reply", report: "Report review", reason: "Reason (3–500 characters)",
  replyWarning: "You can leave one permanent reply. It cannot be changed.", saved: "Saved", refresh: "Refresh", deadline: "Deadline", back: "Back to Ratings",
  safety: ["Never pay advance charges to confirm a buyer", "Never scan a QR code to receive money", "Never share OTP or UPI PIN", "Report suspicious payment links"],
  direct: "Buyers and sellers arrange exchange directly. Ratings do not guarantee identity, delivery or payment protection.",
  states: { pending_selection: "Buyer selection pending", pending_buyer: "Buyer confirmation pending", confirmed: "Purchase confirmed", disputed: "Trade under review", unattributed: "No buyer selected", expired_unconfirmed: "Confirmation window closed" },
  events: { buyer_selected: "Seller selected a buyer", pending_buyer: "Waiting for buyer confirmation", confirmed: "Buyer confirmed the purchase", rated_buyer: "Buyer submitted a review", rated_seller: "Seller submitted a review", disputed: "Trade under review", expired: "Rating window closed" },
  tagLabels: { on_time: "On time", polite: "Polite", quick_replies: "Quick replies", did_not_show_up: "Did not show up", sent_payment_link: "Sent payment link", paid_as_agreed: "Paid as agreed", easy_pickup: "Easy pickup", delayed_payment: "Delayed payment", item_as_described: "Item as described", accurate_photos: "Accurate photos", smooth_handover: "Smooth handover", item_not_as_described: "Item not as described", changed_price: "Changed price", asked_advance_payment: "Asked for advance payment" } as Record<string, string>,
};
type Copy = typeof en;
const hi: Copy = {
  title: "रेटिंग", pending: "रेटिंग दें", received: "मिली रेटिंग", given: "दी गई रेटिंग", empty: "अभी कोई रिकॉर्ड नहीं है।",
  unavailable: "रेटिंग अभी उपलब्ध नहीं है। कृपया बाद में कोशिश करें।", expired: "रेटिंग देने की 14 दिन की अवधि समाप्त हो गई है।",
  loading: "लोड हो रहा है…", more: "और दिखाएं", buyer: "खरीदार", seller: "विक्रेता", member: "FairSwap सदस्य", noScore: "अभी कोई रेटिंग नहीं",
  reviews: "प्रकाशित समीक्षाएं", completed: "पूरे हुए लेन-देन", dimensions: "श्रेणी औसत (4 में से)", communication: "बातचीत", item: "वस्तु बताए अनुसार", payment: "भुगतान", handover: "मिलना/वस्तु सौंपना", pickup: "मिलना/वस्तु लेना",
  faces: ["खराब", "ठीक", "अच्छा", "बहुत अच्छा"], rate: "रेटिंग दें", confirm: "विक्रेता को रेटिंग दें — मैंने यह खरीदा है", dispute: "मैंने यह नहीं खरीदा",
  confirmInfo: "विक्रेता को रेटिंग देना खोलने पर खरीद की पुष्टि होती है। समीक्षा लिखे बिना बाहर निकलने पर भी पुष्टि बनी रहेगी।",
  disputeWarning: "पुष्टि करें कि आपने यह वस्तु नहीं खरीदी। एक निजी सहायता मामला खुलेगा और इस लेन-देन की रेटिंग रोक दी जाएगी।",
  selectBuyer: "खरीदार चुनें", notNow: "अभी नहीं", none: "इनमें से कोई नहीं", sold: "बिक गया चिह्नित करें", cancel: "रद्द करें", selectionInfo: "इस विज्ञापन की बातचीत से खरीदार चुनें। चुनने से मूल 14 दिन की अवधि नहीं बढ़ती।",
  tags: "टैग (वैकल्पिक, अधिकतम 5)", comment: "लिखित समीक्षा (वैकल्पिक, 500 अक्षर)", preview: "पूर्वावलोकन", submit: "समीक्षा जमा करें", immutable: "जमा करने के बाद यह समीक्षा बदली नहीं जा सकती।", required: "तीनों सवालों के लिए एक चेहरा चुनें।",
  invalidText: "अधिकतम 500 अक्षर लिखें। नई पंक्ति, नियंत्रण अक्षर या कोण कोष्ठक का उपयोग न करें।",
  sealed: "दोनों के समीक्षा देने या 14 दिन पूरे होने तक आपकी समीक्षा निजी रहेगी। प्रक्रिया या खुले मामले के कारण प्रकाशन में अधिक समय लग सकता है।", submitted: "समीक्षा जमा हो गई", notRated: "रेटिंग नहीं दी", reply: "जवाब दें", report: "समीक्षा की रिपोर्ट करें", reason: "कारण (3–500 अक्षर)", replyWarning: "आप एक स्थायी जवाब दे सकते हैं। इसे बदला नहीं जा सकता।", saved: "सहेजा गया", refresh: "रीफ़्रेश करें", deadline: "अंतिम तिथि", back: "रेटिंग पर वापस जाएं",
  safety: ["खरीदार की पुष्टि के लिए अग्रिम शुल्क कभी न दें", "पैसे पाने के लिए QR कोड कभी स्कैन न करें", "OTP या UPI PIN कभी साझा न करें", "संदिग्ध भुगतान लिंक की रिपोर्ट करें"], direct: "खरीदार और विक्रेता सीधे लेन-देन करते हैं। रेटिंग पहचान, डिलीवरी या भुगतान सुरक्षा की गारंटी नहीं है।",
  states: { pending_selection: "खरीदार चुनना बाकी है", pending_buyer: "खरीदार की पुष्टि बाकी है", confirmed: "खरीद की पुष्टि हुई", disputed: "लेन-देन की समीक्षा जारी है", unattributed: "खरीदार नहीं चुना गया", expired_unconfirmed: "पुष्टि की अवधि समाप्त" },
  events: { buyer_selected: "विक्रेता ने खरीदार चुना", pending_buyer: "खरीदार की पुष्टि बाकी है", confirmed: "खरीदार ने खरीद की पुष्टि की", rated_buyer: "खरीदार ने समीक्षा दी", rated_seller: "विक्रेता ने समीक्षा दी", disputed: "लेन-देन की समीक्षा जारी है", expired: "रेटिंग की अवधि समाप्त" },
  tagLabels: { on_time: "समय पर", polite: "विनम्र", quick_replies: "जल्दी जवाब", did_not_show_up: "नहीं आए", sent_payment_link: "भुगतान लिंक भेजा", paid_as_agreed: "तय भुगतान किया", easy_pickup: "आसान पिकअप", delayed_payment: "भुगतान में देरी", item_as_described: "वस्तु बताए अनुसार", accurate_photos: "सही तस्वीरें", smooth_handover: "आसानी से वस्तु सौंपी", item_not_as_described: "वस्तु बताए अनुसार नहीं", changed_price: "कीमत बदली", asked_advance_payment: "अग्रिम भुगतान मांगा" },
};
export const ratingsCopy = (locale: AccountLocale = "en") => locale === "hi" ? hi : en;
export const ratingsLocale = (value: unknown): AccountLocale => value === "hi" ? "hi" : "en";
