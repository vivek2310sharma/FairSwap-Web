"use client";

import React, { useState } from "react";
import { Share2, Copy, Check, Link as LinkIcon } from "lucide-react";
import {
  buildWhatsAppShareLink,
  buildListingCanonicalUrl,
  formatListingPrice,
  FormatPriceInput,
} from "@/lib/listings/share";

interface ShareButtonProps extends FormatPriceInput {
  slug: string;
  title: string;
  formattedPrice?: string;
  variant?: "full" | "icon" | "inline";
  className?: string;
  siteUrl?: string;
}

export function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.573-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347zM12 2C6.477 2 2 6.477 2 12c0 2.204.713 4.243 1.924 5.903L2.5 21.5l3.703-1.39A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.95 7.95 0 01-4.225-1.211l-.303-.18-2.203.827.838-2.146-.197-.314A7.956 7.956 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
    </svg>
  );
}

export function ShareButton({
  slug,
  title,
  price_type,
  price_paise,
  formattedPrice: customFormattedPrice,
  variant = "full",
  className = "",
  siteUrl,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const price = formatListingPrice(
    { price_type, price_paise },
    customFormattedPrice
  );
  const whatsappUrl = buildWhatsAppShareLink({ title, price, slug, siteUrl });
  const copyUrl = buildListingCanonicalUrl(slug, siteUrl);

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCopyError(false);

    try {
      if (navigator.clipboard && (window.isSecureContext !== false)) {
        await navigator.clipboard.writeText(copyUrl);
      } else {
        // Fallback for non-HTTPS or legacy environments
        const textArea = document.createElement("textarea");
        textArea.value = copyUrl;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (!successful) {
          throw new Error("Copy command failed");
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  };

  if (variant === "icon") {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={() => setShowMenu((prev) => !prev)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-xs hover:bg-white hover:text-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 dark:bg-gray-800/90 dark:text-gray-200 dark:hover:bg-gray-800 dark:hover:text-emerald-400"
          aria-label="Share listing"
          aria-expanded={showMenu}
        >
          <Share2 className="h-4 w-4" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
              aria-hidden="true"
            />
            <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-black/5 focus:outline-hidden dark:bg-gray-800 dark:ring-white/10">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowMenu(false)}
                className="flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
              >
                <WhatsAppIcon className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Share on WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={(e) => {
                  handleCopyLink(e);
                  setShowMenu(false);
                }}
                className="flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-emerald-600 dark:text-emerald-400" role="status" aria-live="polite">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/80"
          aria-label="Share listing on WhatsApp"
        >
          <WhatsAppIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          aria-label="Copy listing link"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400" role="status" aria-live="polite">Copied</span>
            </>
          ) : copyError ? (
            <span className="text-red-600 dark:text-red-400" role="status" aria-live="polite">Failed to copy</span>
          ) : (
            <>
              <LinkIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2.5 sm:flex-row sm:items-center ${className}`}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-500"
      >
        <WhatsAppIcon className="h-4 w-4" />
        <span>Share on WhatsApp</span>
      </a>

      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-emerald-600 dark:text-emerald-400" role="status" aria-live="polite">Link Copied!</span>
          </>
        ) : copyError ? (
          <span className="text-red-600 dark:text-red-400" role="status" aria-live="polite">Copy Failed</span>
        ) : (
          <>
            <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span>Copy Link</span>
          </>
        )}
      </button>
    </div>
  );
}
