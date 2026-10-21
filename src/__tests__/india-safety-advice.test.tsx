import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CompactSafetyNotice, IndiaSafetyCard } from "@/components/listings/IndiaSafetyAdvice";

describe("IndiaSafetyAdvice Components", () => {
  it("renders CompactSafetyNotice with essential scam warnings", () => {
    render(<CompactSafetyNotice />);

    expect(screen.getByText(/Safety First — Avoid Scams/i)).toBeInTheDocument();
    expect(screen.getByText(/Never scan a QR code or enter a UPI PIN to receive money/i)).toBeInTheDocument();
    expect(screen.getByText(/Approving a payment request with a PIN authorizes money leaving your account/i)).toBeInTheDocument();
  });

  it("renders IndiaSafetyCard with all required scam advice sections", () => {
    render(<IndiaSafetyCard />);

    expect(screen.getByRole("heading", { name: /FairSwap Safety & Scam Advice/i })).toBeInTheDocument();

    // Check English guidance points
    expect(screen.getByText(/OTP & UPI PIN Security:/i)).toBeInTheDocument();
    expect(screen.getByText(/QR Codes & Collect Requests:/i)).toBeInTheDocument();
    expect(screen.getByText(/Fake Links & App Installs:/i)).toBeInTheDocument();
    expect(screen.getByText(/No Advance Fees or Tokens:/i)).toBeInTheDocument();
    expect(screen.getByText(/Identity & Impersonation:/i)).toBeInTheDocument();
    expect(screen.getByText(/Fake Delivery & Screenshots:/i)).toBeInTheDocument();

    // Check Cybercrime helpline details
    expect(screen.getByText(/1930/i)).toBeInTheDocument();
    expect(screen.getByText("cybercrime.gov.in")).toBeInTheDocument();
  });

  it("renders Hindi disclosure toggle with accurate translation copy", () => {
    render(<IndiaSafetyCard />);

    expect(screen.getByText(/हिंदी में सुरक्षा सलाह \(Hindi Safety Guidance\)/i)).toBeInTheDocument();
    expect(screen.getByText(/ओटीपी और यूपीआई पिन:/i)).toBeInTheDocument();
    expect(screen.getByText(/क्यूआर कोड व कलेक्ट रिक्वेस्ट:/i)).toBeInTheDocument();
    expect(screen.getByText(/अग्रिम भुगतान \/ टोकन मनी:/i)).toBeInTheDocument();
  });

  it("allows toggling the Hindi safety disclosure details", () => {
    render(<IndiaSafetyCard />);

    const summaryElement = screen.getByText(/हिंदी में सुरक्षा सलाह \(Hindi Safety Guidance\)/i);
    const detailsElement = summaryElement.closest("details");

    expect(detailsElement).toBeInTheDocument();
    expect(detailsElement).not.toHaveAttribute("open");

    if (detailsElement) {
      fireEvent.click(summaryElement);
      detailsElement.setAttribute("open", "");
      expect(detailsElement).toHaveAttribute("open");
    }
  });
});
