import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HomePage from "@/app/page";

// These isolated page tests do not mount RootLayout's AuthProvider.
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ user: null, isLoading: false, unreadMessagesCount: 0,
    unreadNotificationsCount: 0, refreshUnreadCounts: vi.fn(), signOut: vi.fn() }),
}));

describe("HomePage component", () => {
  it("renders main landmark and main heading", () => {
    render(<HomePage />);
    expect(screen.getByRole("main")).toBeInTheDocument();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent(/FairSwap/i);
  });

  it("does not render the obsolete development foundation notice", () => {
    render(<HomePage />);
    expect(screen.queryByText("Development Foundation")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Accounts, ads, and communication are not connected yet/i)
    ).not.toBeInTheDocument();
  });

  it("renders the Trust Strip section", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /stay safe on fairswap/i })
    ).toBeInTheDocument();
  });

  it("renders the How It Works section with 3 core steps and updated Exchange text", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: /how it works/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Browse" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Connect" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Exchange" })).toBeInTheDocument();
    expect(
      screen.getByText("Meet in a public place, inspect the item, and agree on payment directly.")
    ).toBeInTheDocument();
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
