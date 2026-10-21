import { render, screen, within } from "@testing-library/react";
import ContactPage from "@/app/contact/page";
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
    expect(screen.getByAltText("FairSwap.in")).toBeInTheDocument();
  });

  it("does not render the public launch record link or its domain", () => {
    render(<Footer />);
    expect(screen.queryByRole("link", { name: "View FairSwap's public launch record" })).not.toBeInTheDocument();
    expect(screen.getByRole("contentinfo").innerHTML).not.toContain("websitelaunches.com");
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

  it("exposes WhatsApp support and the canonical Help Centre contact link", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: "Help Centre" })).toHaveAttribute("href", "https://help.fairswap.in/en");
    expect(screen.getByRole("link", { name: "Contact Us" })).toHaveAttribute("href", "https://help.fairswap.in/en/contact");
    expect(screen.getByRole("link", { name: "support@fairswap.in" })).toHaveAttribute("href", "mailto:support@fairswap.in");
    const whatsappLink = screen.getByRole("link", { name: "WhatsApp Support: +91 7877966996" });
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/917877966996");
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.queryByText(/8826599917/)).not.toBeInTheDocument();
  });
  it("exposes WhatsApp support on the public contact page without the old number", () => {
    render(<ContactPage />);
    const main = within(screen.getByRole("main"));
    const supportLink = main.getByRole("link", { name: "+91 7877966996" });
    expect(supportLink).toHaveAttribute("href", "https://wa.me/917877966996");
    expect(supportLink).toHaveAttribute("target", "_blank");
    expect(supportLink).toHaveAttribute("rel", "noopener noreferrer");
    expect(main.queryByText(/8826599917/)).not.toBeInTheDocument();
    expect(main.getByText(/controlled production pilot/i)).toBeInTheDocument();
  });

});
