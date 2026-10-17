import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "@/components/footer";

describe("Footer component", () => {
  it("renders the footer landmark", () => {
    render(<Footer />);
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
  });

  it("displays the FairSwap brand name and tagline", () => {
    render(<Footer />);
    expect(screen.getByText("India's local classifieds marketplace")).toBeInTheDocument();
    expect(screen.getByText("Swap")).toBeInTheDocument();
  });

  it("links to FairSwap's public launch record securely", () => {
    render(<Footer />);
    const launchRecordLink = screen.getByRole("link", {
      name: "View FairSwap's public launch record",
    });

    expect(launchRecordLink).toHaveAttribute(
      "href",
      "https://websitelaunches.com/site/fairswap.in"
    );
    expect(launchRecordLink).toHaveAttribute("target", "_blank");
    expect(launchRecordLink.getAttribute("rel")?.split(/\s+/)).toEqual(
      expect.arrayContaining(["noopener", "noreferrer", "external"])
    );
  });

  it("displays the copyright and controlled production pilot notice", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${currentYear} FairSwap\\.`))
    ).toBeInTheDocument();
    expect(
      screen.getByText("Currently operating as a controlled production pilot.")
    ).toBeInTheDocument();
  });

  it("renders a link to the Grievance Redressal page", () => {
    render(<Footer />);
    const grievanceLink = screen.getByRole("link", { name: "Grievance Redressal" });
    expect(grievanceLink).toBeInTheDocument();
    expect(grievanceLink).toHaveAttribute("href", "/grievance");
  });

  it("exposes PhonePe-verifiable support contacts and the canonical Help Centre contact link", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Help Centre" })).toHaveAttribute("href", "https://help.fairswap.in/en");
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "https://help.fairswap.in/en/contact");
    expect(screen.getByRole("link", { name: "support@fairswap.in" })).toHaveAttribute("href", "mailto:support@fairswap.in");
    expect(screen.getByRole("link", { name: "+91 8826599917" })).toHaveAttribute("href", "tel:+918826599917");
  });
});
