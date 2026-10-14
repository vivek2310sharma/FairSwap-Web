import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "@/components/footer";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

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

  it("links once to the Help Centre in the same tab while keeping internal contact and safety pages", () => {
    render(<Footer />);
    const help = screen.getAllByRole("link", { name: "Help Centre" });
    expect(help).toHaveLength(1);
    expect(help[0]).toHaveAttribute("href", HELP_CENTRE_URL);
    expect(help[0]).not.toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "In-Person Safety Tips" })).toHaveAttribute("href", "/safety");
    expect(screen.getByRole("link", { name: "Contact Guidance" })).toHaveAttribute("href", "/contact");
  });

  it("renders a link to the Grievance Redressal page", () => {
    render(<Footer />);
    const grievanceLink = screen.getByRole("link", { name: "Grievance Redressal" });
    expect(grievanceLink).toBeInTheDocument();
    expect(grievanceLink).toHaveAttribute("href", "/grievance");
  });
});
