import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ user: null, isLoading: false, unreadMessagesCount: null, unreadNotificationsCount: null, signOut: vi.fn() }),
}));
vi.mock("@/components/communication/NotificationBell", () => ({ NotificationBell: () => null }));

const css = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("Homepage 4.5 palette scope", () => {
  it("keeps the plum palette out of the global :root tokens", () => {
    const globals = css("../app/globals.css");
    expect(globals).not.toMatch(/#271B38|#F5D6BE|#9E4660/i);
    expect(globals).toMatch(/--fs-primary: #08704A/);
  });
  it("scopes every home-premium rule to a plum zone or a plum-only class", () => {
    const rules = css("../app/home-premium.css").replace(/\/\*[\s\S]*?\*\//g, "").split("}").map(r => r.split("{")[0].trim()).filter(r => r && !r.startsWith("@") && !r.startsWith("from") && !r.startsWith("to"));
    for (const sel of rules.flatMap(r => r.split(","))) expect(sel.trim(), sel).toMatch(/\.fs-(home-plum|plum-|header-plum|footer-plum|wordmark)/);
  });
  it("only the home variants add plum classes", () => {
    const { container, unmount } = render(<Header />);
    expect(container.querySelector("header")!.className).not.toContain("fs-plum-dark");
    unmount();
    const home = render(<Header variant="home" />);
    expect(home.container.querySelector("header")!.className).toContain("fs-plum-dark");
  });
  it("home footer keeps every existing destination", () => {
    render(<Footer variant="home" />);
    const footer = screen.getByRole("contentinfo");
    const hrefs = within(footer).getAllByRole("link").map(a => a.getAttribute("href"));
    for (const h of ["/search", "/saved", "/account/favourites", "/account/listings/new", "/safety", "https://help.fairswap.in/en/contact", "mailto:support@fairswap.in", "https://wa.me/917877966996", "/terms", "/refund-policy", "/privacy", "/acceptable-use", "/grievance"]) expect(hrefs).toContain(h);
    expect(within(footer).getByText("Good things deserve another chapter.")).toBeInTheDocument();
    expect(within(footer).getByLabelText("Language")).toBeInTheDocument();
  });
});