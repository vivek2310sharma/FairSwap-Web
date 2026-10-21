import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CompactSafetyNotice, IndiaSafetyCard } from "@/components/listings/IndiaSafetyAdvice";

describe("IndiaSafetyAdvice components (LIST-04)", () => {
  describe("CompactSafetyNotice", () => {
    it("renders compact safety warning with accessible alert region", () => {
      render(<CompactSafetyNotice />);

      const alertRegion = screen.getByRole("region", { name: /safety alert/i });
      expect(alertRegion).toBeInTheDocument();

      expect(screen.getByText(/Safety First — Avoid Scams/i)).toBeInTheDocument();
      expect(screen.getByText(/never scan a qr code or enter a upi pin/i)).toBeInTheDocument();
      expect(screen.getByText(/do not share otps, click unknown whatsapp payment links/i)).toBeInTheDocument();
    });
  });

  describe("IndiaSafetyCard", () => {
    it("renders headline and all required English scam prevention guidance", () => {
      render(<IndiaSafetyCard />);

      // Section title
      expect(
        screen.getByRole("heading", { name: /fairswap safety & scam advice/i })
      ).toBeInTheDocument();

      // Scam Category 1: OTP & UPI PIN Security
      expect(screen.getByText(/OTP & UPI PIN Security:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/receiving money does not require entering a upi pin/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/if asked to enter a pin, you are authorizing a payment out of your account/i)
      ).toBeInTheDocument();

      // Scam Category 2: QR Codes & Collect Requests
      expect(screen.getByText(/QR Codes & Collect Requests:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/never scan a stranger's qr code or accept a upi collect request/i)
      ).toBeInTheDocument();

      // Scam Category 3: Fake Links & App Installs
      expect(screen.getByText(/Fake Links & App Installs:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/suspicious whatsapp links, or requests to install screen-sharing apps/i)
      ).toBeInTheDocument();

      // Scam Category 4: No Advance Fees or Tokens
      expect(screen.getByText(/No Advance Fees or Tokens:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/never pay advance booking deposits, holding tokens, or courier fees/i)
      ).toBeInTheDocument();

      // Scam Category 5: Identity & Impersonation (Army / Govt)
      expect(screen.getByText(/Identity & Impersonation:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/military uniforms, official identity cards, or government claims do not guarantee trustworthiness/i)
      ).toBeInTheDocument();

      // Scam Category 6: Fake Delivery & Screenshots
      expect(screen.getByText(/Fake Delivery & Screenshots:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/always verify received funds in your bank or upi app history/i)
      ).toBeInTheDocument();
    });

    it("includes Hindi safety advice disclosure with accurate translations", () => {
      render(<IndiaSafetyCard />);

      // Hindi disclosure summary
      const summaryText = screen.getByText(/हिंदी में सुरक्षा सलाह \(Hindi Safety Guidance\)/i);
      expect(summaryText).toBeInTheDocument();

      // Hindi scam points
      expect(screen.getByText(/ओटीपी और यूपीआई पिन:/i)).toBeInTheDocument();
      expect(screen.getByText(/क्यूआर कोड व कलेक्ट रिक्वेस्ट:/i)).toBeInTheDocument();
      expect(screen.getByText(/नक़ली लिंक और ऐप इंस्टॉल:/i)).toBeInTheDocument();
      expect(screen.getByText(/अग्रिम भुगतान \/ टोकन मनी:/i)).toBeInTheDocument();
      expect(screen.getByText(/सैन्य\/सरकारी पहचान पत्र का धोखा:/i)).toBeInTheDocument();
      expect(screen.getByText(/नक़ली स्क्रीनशॉट और डिलीवरी:/i)).toBeInTheDocument();
    });

    it("renders official Indian Cybercrime Helpline 1930 and verified website links", () => {
      render(<IndiaSafetyCard />);

      // Helpline 1930 link
      const phoneLink = screen.getByRole("link", { name: "1930" });
      expect(phoneLink).toBeInTheDocument();
      expect(phoneLink).toHaveAttribute("href", "tel:1930");

      // Cybercrime Portal
      const portalLink = screen.getByRole("link", { name: /cybercrime\.gov\.in/i });
      expect(portalLink).toBeInTheDocument();
      expect(portalLink).toHaveAttribute("href", "https://cybercrime.gov.in");

      // In-person safety link
      const safetyPageLink = screen.getByRole("link", { name: /in-person safety tips/i });
      expect(safetyPageLink).toBeInTheDocument();
      expect(safetyPageLink).toHaveAttribute("href", "/safety");
    });
  });
});
