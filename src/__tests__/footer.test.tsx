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
});
