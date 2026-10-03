import { describe, it, expect } from "vitest";
import { extractOtpFromEmail } from "../helpers/extract-otp";

describe("Safe Email OTP Extraction", () => {
  it("extracts 6-digit token from id='otp-token' element even when surrounded by CSS #111827", () => {
    const email = {
      html: `
        <!DOCTYPE html>
        <html>
        <body style="color: #111827; background: #ffffff;">
          <h2 style="color: #111827;">Verification Code</h2>
          <div style="padding: 24px; color: #111827;">
            <span id="otp-token" style="color: #047857; font-size: 32px;">
              849201
            </span>
          </div>
        </body>
        </html>
      `,
    };

    const token = extractOtpFromEmail(email);
    expect(token).toBe("849201");
    expect(token).not.toBe("111827");
  });

  it("extracts token from HTML-only mail without id element by stripping attributes and CSS colors", () => {
    const htmlOnlyEmail = {
      html: `
        <html>
        <head>
          <style>
            .header { color: #111827; margin: 10px; }
            .token-box { color: #111827; border: 1px solid #111827; }
          </style>
        </head>
        <body style="color: #111827;">
          <p>Your one-time password is:</p>
          <p><strong>582319</strong></p>
        </body>
        </html>
      `,
    };

    const token = extractOtpFromEmail(htmlOnlyEmail);
    expect(token).toBe("582319");
    expect(token).not.toBe("111827");
  });

  it("extracts token from plain text when available", () => {
    const email = {
      text: "Use code 993182 to log into your account.",
    };

    const token = extractOtpFromEmail(email);
    expect(token).toBe("993182");
  });

  it("throws clear error when no 6-digit OTP exists in payload", () => {
    const invalidEmail = {
      html: "<p>Welcome to FairSwap, click here to explore listings.</p>",
      text: "Welcome to FairSwap, click here to explore listings.",
    };

    expect(() => extractOtpFromEmail(invalidEmail)).toThrow(
      /Unable to extract 6-digit OTP/
    );
  });
});
