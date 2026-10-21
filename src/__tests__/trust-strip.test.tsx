import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TrustStrip } from "@/components/trust-strip";
import { trustStripHi } from "@/lib/trust-strip";

describe("TrustStrip component", () => {
  it("renders heading and 4 scam-awareness items", () => {
    render(<TrustStrip />);

    expect(
      screen.getByRole("heading", { level: 2, name: /stay safe on fairswap/i })
    ).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 3, name: /protect your otp and upi pin/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /beware of fake payment requests/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /watch for identity impersonation/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: /avoid advance-payment scams/i })).toBeInTheDocument();
  });

  it("has CTA link pointing to /safety", () => {
    render(<TrustStrip />);

    const ctaLink = screen.getByRole("link", { name: /read safety guidelines/i });
    expect(ctaLink).toBeInTheDocument();
    expect(ctaLink).toHaveAttribute("href", "/safety");
  });

  it("exports valid Hindi localization data structure", () => {
    expect(trustStripHi.heading).toContain("FairSwap पर सुरक्षित रहें");
    expect(trustStripHi.items).toHaveLength(4);
    expect(trustStripHi.items[0].title).toBeTruthy();
    expect(trustStripHi.items[0].description).toBeTruthy();
  });
});
