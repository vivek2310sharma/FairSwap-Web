/**
 * Helper to safely extract 6-digit email OTP from Mailpit email payloads.
 *
 * Avoids extracting CSS color codes such as #111827 from raw HTML.
 */

export function extractOtpFromEmail(email: { html?: string; text?: string }): string {
  // 1. If HTML has element with id="otp-token" or data-testid="otp-token", extract directly
  if (email.html) {
    const elementMatch = email.html.match(/(?:id|data-testid)=["']otp-token["'][^>]*>([\s\S]*?)<\/[a-z0-9]+>/i);
    if (elementMatch) {
      const candidate = elementMatch[1].replace(/\s+/g, "").trim();
      if (/^\d{6}$/.test(candidate)) {
        return candidate;
      }
    }
  }

  // 2. If plain-text version exists, extract 6-digit boundary match
  if (email.text) {
    const textMatch = email.text.match(/\b\d{6}\b/);
    if (textMatch) {
      return textMatch[0];
    }
  }

  // 3. For HTML-only mail, strip style tags, script tags, and attributes to avoid matching CSS hex codes like #111827
  if (email.html) {
    const cleanHtml = email.html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ");

    const match = cleanHtml.match(/\b\d{6}\b/);
    if (match) {
      return match[0];
    }
  }

  throw new Error("Unable to extract 6-digit OTP from email payload");
}
