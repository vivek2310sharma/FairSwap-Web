import Link from "next/link";
import { ShieldCheck, AlertTriangle, ExternalLink, PhoneCall, ChevronDown } from "lucide-react";

/**
 * Compact safety warning box displayed immediately above action buttons (e.g., Contact Seller button).
 */
export function CompactSafetyNotice() {
  return (
    <div
      role="region"
      aria-label="Safety Alert"
      className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-2xs dark:border-amber-800/80 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-950 dark:text-amber-100">
            Safety First — Avoid Scams
          </p>
          <p className="text-[11px] leading-relaxed text-amber-900/90 dark:text-amber-200/90">
            Never scan a QR code or enter a UPI PIN to receive money. Approving a payment request with a PIN authorizes money leaving your account. Do not share OTPs, click unknown payment links, or pay advance tokens.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Comprehensive India-specific scam prevention card.
 */
export function IndiaSafetyCard() {
  return (
    <section
      aria-labelledby="india-safety-title"
      className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-2xs dark:border-emerald-800/80 dark:bg-emerald-950/70"
    >
      <div className="flex items-center gap-2 text-emerald-950 dark:text-emerald-100">
        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
        <h2 id="india-safety-title" className="text-sm font-bold tracking-tight">
          FairSwap Safety &amp; Scam Advice
        </h2>
      </div>

      <p className="mt-2 text-xs text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
        FairSwap is a direct buyer-to-seller marketplace. Protect yourself against common online scams in India:
      </p>

      {/* English Core Safety Advice */}
      <ul className="mt-4 space-y-3 text-xs text-emerald-950 dark:text-emerald-100">
        <li className="flex items-start gap-2">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
          <div>
            <strong>OTP &amp; UPI PIN Security:</strong> Never share OTPs, passwords, or banking credentials. Receiving money does not require entering a UPI PIN. Approving a payment request with a PIN authorizes money leaving your account.
          </div>
        </li>

        <li className="flex items-start gap-2">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
          <div>
            <strong>QR Codes &amp; Collect Requests:</strong> Never scan a stranger&apos;s QR code or accept a UPI collect request to receive payment.
          </div>
        </li>

        <li className="flex items-start gap-2">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
          <div>
            <strong>Fake Links &amp; App Installs:</strong> Avoid unknown payment-verification links, suspicious WhatsApp links, or requests to install screen-sharing apps (e.g. AnyDesk or TeamViewer).
          </div>
        </li>

        <li className="flex items-start gap-2">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
          <div>
            <strong>No Advance Fees or Tokens:</strong> Never pay advance booking deposits, holding tokens, or courier fees before physically inspecting the item.
          </div>
        </li>

        <li className="flex items-start gap-2">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
          <div>
            <strong>Identity &amp; Impersonation:</strong> Military uniforms, official identity cards, or government claims do not guarantee trustworthiness. Fraudsters frequently use stolen credentials.
          </div>
        </li>

        <li className="flex items-start gap-2">
          <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
          <div>
            <strong>Fake Delivery &amp; Screenshots:</strong> FairSwap does not offer delivery or escrow. Do not rely on payment screenshots; always verify received funds in your bank or UPI app history.
          </div>
        </li>
      </ul>

      {/* Hindi Disclosure */}
      <details className="group mt-5 rounded-xl border border-emerald-300/80 bg-white/60 p-3.5 dark:border-emerald-800 dark:bg-emerald-900/40">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-bold text-emerald-950 hover:text-emerald-700 dark:text-emerald-100 dark:hover:text-emerald-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 rounded-md">
          <span>हिंदी में सुरक्षा सलाह (Hindi Safety Guidance)</span>
          <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
        </summary>

        <ul className="mt-3 space-y-2.5 text-xs text-emerald-950 dark:text-emerald-100 border-t border-emerald-200/80 dark:border-emerald-800/80 pt-3">
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
            <div>
              <strong>ओटीपी और यूपीआई पिन:</strong> पैसे प्राप्त करने के लिए कभी भी यूपीआई पिन दर्ज न करें और न ही ओटीपी साझा करें। यूपीआई पिन से भुगतान अनुरोध स्वीकृत करने पर आपके खाते से पैसे कटते हैं।
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
            <div>
              <strong>क्यूआर कोड व कलेक्ट रिक्वेस्ट:</strong> पैसे प्राप्त करने के लिए किसी अनजान व्यक्ति का क्यूआर कोड स्कैन न करें और न ही यूपीआई कलेक्ट रिक्वेस्ट स्वीकार करें।
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
            <div>
              <strong>नक़ली लिंक और ऐप इंस्टॉल:</strong> अज्ञात पेमेंट-वेरीफिकेशन लिंक, संदिग्ध व्हाट्सएप लिंक पर क्लिक न करें और न ही कोई अज्ञात ऐप (जैसे AnyDesk) इंस्टॉल करें।
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
            <div>
              <strong>अग्रिम भुगतान / टोकन मनी:</strong> सामान को प्रत्यक्ष रूप से देखने और जांचने से पहले कोई एडवांस, टोकन मनी या कूरियर शुल्क न दें।
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
            <div>
              <strong>सैन्य/सरकारी पहचान पत्र का धोखा:</strong> सैन्य वर्दी या सरकारी आईडी कार्ड किसी व्यक्ति के विश्वसनीय होने का प्रमाण नहीं हैं; जालसाज अक्सर चोरी की आईडी का उपयोग करते हैं।
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 shrink-0">&bull;</span>
            <div>
              <strong>नक़ली स्क्रीनशॉट और डिलीवरी:</strong> भुगतान के स्क्रीनशॉट पर भरोसा न करें। अपने बैंक/यूपीआई ऐप में जाकर प्राप्त राशि की जांच करें। फेयरस्वैप कूरियर या एस्क्रो सेवा प्रदान नहीं करता है।
            </div>
          </li>
        </ul>
      </details>

      {/* Cybercrime Helpline Information & Links */}
      <div className="mt-5 border-t border-emerald-200/80 pt-4 dark:border-emerald-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-950 dark:text-emerald-100">
          <PhoneCall className="h-4 w-4 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <span>National Cybercrime Helpline:</span>
          <a
            href="tel:1930"
            className="font-bold text-emerald-800 underline hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
          >
            1930
          </a>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
          >
            <span>cybercrime.gov.in</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>

          <Link
            href="/safety"
            className="font-semibold text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 dark:hover:text-emerald-100"
          >
            In-person safety tips &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
