import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import HomePage from "@/app/page";

describe("HomePage component", () => {
  it("renders main landmark and main heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/Buy & sell locally on FairSwap.in/i);
  });

  it("does not render the obsolete development foundation notice", () => {
    render(<HomePage />);
    expect(screen.queryByText("Development Foundation")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Accounts, listings, and communication are not connected yet/i)
    ).not.toBeInTheDocument();
  });

  it("renders the How It Works section with 3 core steps", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /how it works/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Browse" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Connect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Exchange" })).toBeInTheDocument();
  });

  it("renders the Browse Categories preview section", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /browse categories/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Furniture")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });

  it("renders the Safety section with peer-to-peer advice", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /your safety matters/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/buyers and sellers arrange payment and exchange independently/i)
    ).toBeInTheDocument();
  });
});
