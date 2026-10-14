import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ContactPage from "@/app/contact/page";
import SafetyPage from "@/app/safety/page";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

describe("Public assistance remains separate from account workflows", () => {
  it("lets signed-out visitors read help and email support while preserving grievances and tickets", () => {
    render(<ContactPage />);
    const main = within(screen.getByRole("main"));
    expect(main.getByRole("link", { name: "Help Centre" })).toHaveAttribute("href", HELP_CENTRE_URL);
    expect(main.getByRole("link", { name: "contact@fairswap.in" })).toHaveAttribute(
      "href",
      "mailto:contact@fairswap.in",
    );
    expect(main.getByRole("link", { name: "Support Tickets" })).toHaveAttribute("href", "/account/support");
    expect(main.getByRole("link", { name: "Grievance Redressal Portal" })).toHaveAttribute("href", "/grievance");
  });

  it("keeps in-person safety and grievance instructions on FairSwap Web", () => {
    render(<SafetyPage />);
    const main = within(screen.getByRole("main"));
    expect(main.getByRole("link", { name: "Help Centre" })).toHaveAttribute("href", HELP_CENTRE_URL);
    expect(main.getByRole("link", { name: "Grievance Redressal" })).toHaveAttribute("href", "/grievance");
  });
});
