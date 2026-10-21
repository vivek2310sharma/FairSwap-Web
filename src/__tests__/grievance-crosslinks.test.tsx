import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TermsPage from "@/app/terms/page";
import PrivacyPage from "@/app/privacy/page";
import SafetyPage from "@/app/safety/page";
import HelpPage from "@/app/help/page";
import ContactPage from "@/app/contact/page";

describe("Grievance Redressal cross-links on legal and help pages", () => {
  it("Terms page links to /grievance", () => {
    render(<TermsPage />);
    const grievanceLinks = screen.getAllByRole("link", { name: "Grievance Redressal" });
    const match = grievanceLinks.find((l) => l.getAttribute("href") === "/grievance");
    expect(match).toBeDefined();
    expect(match).toHaveAttribute("href", "/grievance");
  });

  it("Privacy page links to /grievance", () => {
    render(<PrivacyPage />);
    const grievanceLinks = screen.getAllByRole("link", { name: "Grievance Redressal" });
    const match = grievanceLinks.find((l) => l.getAttribute("href") === "/grievance");
    expect(match).toBeDefined();
    expect(match).toHaveAttribute("href", "/grievance");
  });

  it("Safety page links to /grievance", () => {
    render(<SafetyPage />);
    const grievanceLinks = screen.getAllByRole("link", { name: "Grievance Redressal" });
    const match = grievanceLinks.find((l) => l.getAttribute("href") === "/grievance");
    expect(match).toBeDefined();
    expect(match).toHaveAttribute("href", "/grievance");
  });

  it("Help page links to /grievance and grievance@fairswap.in", () => {
    render(<HelpPage />);
    const grievanceLinks = screen.getAllByRole("link", { name: "Grievance Redressal" });
    const match = grievanceLinks.find((l) => l.getAttribute("href") === "/grievance");
    expect(match).toBeDefined();
    expect(match).toHaveAttribute("href", "/grievance");

    const emailLink = screen.getByRole("link", { name: "grievance@fairswap.in" });
    expect(emailLink).toHaveAttribute("href", "mailto:grievance@fairswap.in");
  });

  it("Contact page displays Grievance Officer details and links to /grievance", () => {
    render(<ContactPage />);
    expect(screen.getByText("Vivek Kumar")).toBeInTheDocument();
    expect(screen.getByText("Grievance Officer — FairSwap")).toBeInTheDocument();

    const emailLink = screen.getByRole("link", { name: "grievance@fairswap.in" });
    expect(emailLink).toHaveAttribute("href", "mailto:grievance@fairswap.in");

    const portalLink = screen.getByRole("link", { name: "Grievance Redressal Portal" });
    expect(portalLink).toHaveAttribute("href", "/grievance");
  });
});
