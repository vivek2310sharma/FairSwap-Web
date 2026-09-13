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

  it("displays the development foundation notice and copyright", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`© ${currentYear} FairSwap. Development foundation.`))
    ).toBeInTheDocument();
    expect(
      screen.getByText("This is a development build. Not a live service.")
    ).toBeInTheDocument();
  });
});
