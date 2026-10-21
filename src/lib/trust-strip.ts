export interface TrustStripItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface TrustStripContent {
  heading: string;
  subheading: string;
  ctaText: string;
  items: TrustStripItem[];
}

export const trustStripEn: TrustStripContent = {
  heading: "Stay Safe on FairSwap",
  subheading: "Peer-to-peer safety guidance for Indian marketplace buyers and sellers.",
  ctaText: "Read Safety Guidelines →",
  items: [
    {
      id: "otp-pin",
      icon: "ShieldAlert",
      title: "Protect your OTP and UPI PIN",
      description: "Never share OTPs, passwords, or UPI PINs with buyers or sellers.",
    },
    {
      id: "fake-payment",
      icon: "QrCode",
      title: "Beware of fake payment requests",
      description:
        "Receiving money does not require entering a UPI PIN or scanning another person's QR code. Beware of fake buyer payment links.",
    },
    {
      id: "impersonation",
      icon: "UserCheck",
      title: "Watch for identity impersonation",
      description:
        "Scammers may claim to be Army or CRPF officers. Uniforms and ID photos alone do not establish identity.",
    },
    {
      id: "advance-payment",
      icon: "Banknote",
      title: "Avoid advance-payment scams",
      description:
        "Never send money to strangers for courier, delivery, booking, or release fees before inspecting the item.",
    },
  ],
};

export const trustStripHi: TrustStripContent = {
  heading: "FairSwap पर सुरक्षित रहें",
  subheading: "भारतीय मार्केटप्लेस खरीदारों और विक्रेताओं के लिए सुरक्षा मार्गदर्शन।",
  ctaText: "सुरक्षा दिशानिर्देश पढ़ें →",
  items: [
    {
      id: "otp-pin",
      icon: "ShieldAlert",
      title: "अपना OTP और UPI PIN सुरक्षित रखें",
      description: "खरीदारों या विक्रेताओं के साथ कभी भी OTP, पासवर्ड या UPI PIN साझा न करें।",
    },
    {
      id: "fake-payment",
      icon: "QrCode",
      title: "नकली भुगतान अनुरोधों से सावधान रहें",
      description:
        "पैसे प्राप्त करने के लिए UPI PIN दर्ज करने या किसी अन्य व्यक्ति का QR कोड स्कैन करने की आवश्यकता नहीं होती है। नकली खरीदार भुगतान लिंक से सावधान रहें।",
    },
    {
      id: "impersonation",
      icon: "UserCheck",
      title: "पहचान के फर्जीवाड़े से बचें",
      description:
        "स्कैमर्स सेना या सीआरपीएफ अधिकारी होने का दावा कर सकते हैं। केवल वर्दी और आईडी फोटो से पहचान साबित नहीं होती है।",
    },
    {
      id: "advance-payment",
      icon: "Banknote",
      title: "अग्रिम भुगतान घोटालों से बचें",
      description:
        "सामान की जांच करने से पहले कूरियर, डिलीवरी, बुकिंग या रिलीज शुल्क के लिए अनजान लोगों को पैसे न भेजें।",
    },
  ],
};
