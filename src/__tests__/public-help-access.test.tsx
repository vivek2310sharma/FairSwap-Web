import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ContactPage from "@/app/contact/page";
import SafetyPage from "@/app/safety/page";
import { HELP_CENTRE_URL } from "@/lib/help-centre";

// These public-page renders omit RootLayout. Keep Header in a settled guest
// session without starting Auth, count requests or Realtime in link tests.
vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: null,
    isLoading: false,
    unreadMessagesCount: null,
    unreadNotificationsCount: null,
    refreshUnreadCounts: vi.fn(),
    signOut: vi.fn(),
  }),
}));

describe("Public assistance remains separate from account workflows", () => {
  it("lets signed-out visitors read help, email and WhatsApp support while preserving grievances and tickets", () => {
    render(<ContactPage />);
    const main = within(screen.getByRole("main"));
    expect(main.getByRole("heading", { name: "WhatsApp Support" })).toBeInTheDocument();

    const whatsappLink = main.getByRole("link", { name: "+91 7877966996" });
    expect(whatsappLink).toHaveAttribute("href", "https://wa.me/917877966996");
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink.getAttribute("rel")?.split(/\s+/)).toEqual(
      expect.arrayContaining(["noopener", "noreferrer"])
    );

    expect(main.queryByRole("heading", { name: "Phone Contact" })).not.toBeInTheDocument();
    expect(main.queryByRole("link", { name: "+91 8826599917" })).not.toBeInTheDocument();
    expect(main.queryByText(/8826599917/)).not.toBeInTheDocument();

    expect(main.getByRole("link", { name: "Help Centre" })).toHaveAttribute("href", HELP_CENTRE_URL);
    expect(main.getByRole("link", { name: "support@fairswap.in" })).toHaveAttribute(
      "href",
      "mailto:support@fairswap.in",
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
