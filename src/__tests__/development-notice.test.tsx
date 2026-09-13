import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DevelopmentNotice } from "@/components/development-notice";

describe("DevelopmentNotice component", () => {
  it("renders with role='status' for accessibility", () => {
    render(<DevelopmentNotice />);
    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toBeInTheDocument();
  });

  it("displays the Development Foundation heading", () => {
    render(<DevelopmentNotice />);
    expect(screen.getByText("Development Foundation")).toBeInTheDocument();
  });

  it("clearly explains that accounts, listings, and communication are not connected", () => {
    render(<DevelopmentNotice />);
    expect(
      screen.getByText(
        /Accounts, listings, and communication are not connected yet/i
      )
    ).toBeInTheDocument();
  });
});
