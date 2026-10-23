import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TermsPage from "@/app/terms/page";
import PrivacyPage from "@/app/privacy/page";
import SafetyPage from "@/app/safety/page";
import GrievancePage from "@/app/grievance/page";
import { HELP_CENTRE_URL } from "@/lib/help-centre";
import ContactPage from "@/app/contact/page";

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

  it("Grievance page retains its statutory email and links to the public Help Centre", () => {
    render(<GrievancePage />);
    const helpLinks = screen.getAllByRole("link", { name: "Help Centre" });
    expect(helpLinks.some((link) => link.getAttribute("href") === HELP_CENTRE_URL)).toBe(true);
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
