import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import NotFound from "@/app/not-found";

describe("NotFound component", () => {
  it("renders 404 heading and message", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /page not found/i })).toBeInTheDocument();
    expect(
      screen.getByText(/the page you're looking for doesn't exist/i)
    ).toBeInTheDocument();
  });

  it("provides a link back to home", () => {
    render(<NotFound />);
    const homeLink = screen.getByRole("link", { name: /back to home/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("includes the site Header and Footer", () => {
    render(<NotFound />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });
});
