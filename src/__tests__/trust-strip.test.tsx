import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrustStrip } from "@/components/trust-strip";
import { trustStripHi } from "@/lib/trust-strip";

describe("TrustStrip component", () => {
  it("renders heading, subheading, and 4 scam-awareness titles and descriptions", () => {
    render(<TrustStrip />);

    expect(
      screen.getByRole("heading", { level: 2, name: /stay safe on fairswap/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/peer-to-peer safety guidance for indian marketplace buyers and sellers/i)
    ).toBeInTheDocument();

    // Verify Titles
    expect(screen.getByRole("heading", { level: 3, name: /protect your otp and upi pin/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /beware of fake payment requests/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /watch for identity impersonation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /avoid advance-payment scams/i })).toBeInTheDocument();

    // Verify Critical Warning Descriptions
    expect(
      screen.getByText(/never share otps, passwords, or upi pins with buyers or sellers/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/receiving money does not require entering a upi pin/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/scammers may claim to be army or crpf officers/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/never send money to strangers for courier, delivery, booking, or release fees/i)
    ).toBeInTheDocument();
  });

  it("has CTA link pointing to /safety", () => {
    render(<TrustStrip />);

    const ctaLink = screen.getByRole("link", { name: /read safety guidelines/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/safety");
  });

  it("exports valid Hindi localization data structure", () => {
    expect(trustStripHi.heading).toContain("FairSwap पर सुरक्षित रहें");
    expect(trustStripHi.subheading).toContain("भारतीय मार्केटप्लेस खरीदारों और विक्रेताओं के लिए सुरक्षा मार्गदर्शन");
    expect(trustStripHi.items).toHaveLength(4);
    expect(trustStripHi.items[0].title).toBeTruthy();
    expect(trustStripHi.items[0].description).toBeTruthy();
  });
});
