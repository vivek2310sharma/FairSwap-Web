import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import GrievancePage, { metadata } from "@/app/grievance/page";

describe("Grievance Redressal page (/grievance)", () => {
  it("exports correct compliance and SEO metadata", () => {
    expect(metadata.title).toBe("Grievance Redressal — FairSwap");
    expect(metadata.description).toContain("Grievance Officer");
    expect(metadata.description).toContain("FairSwap");
  });

  it("renders the primary Grievance Redressal heading", () => {
    render(<GrievancePage />);
    const heading = screen.getByRole("heading", { level: 1, name: "Grievance Redressal" });
    expect(heading).toBeInTheDocument();
  });

  it("prominently displays the approved Grievance Officer details", () => {
    render(<GrievancePage />);
    expect(screen.getByText("Vivek Kumar")).toBeInTheDocument();
    expect(screen.getByText("Grievance Officer — FairSwap")).toBeInTheDocument();
  });

  it("provides a functional mailto link for grievance@fairswap.in", () => {
    render(<GrievancePage />);
    const mailtoLinks = screen.getAllByRole("link", { name: /grievance@fairswap\.in/i });
    expect(mailtoLinks.length).toBeGreaterThan(0);
    expect(mailtoLinks[0]).toHaveAttribute("href", "mailto:grievance@fairswap.in");
  });

  it("displays the public grievance portal URL with environment-safe /grievance link", () => {
    render(<GrievancePage />);
    const portalLink = screen.getByRole("link", { name: "https://fairswap.in/grievance" });
    expect(portalLink).toBeInTheDocument();
    expect(portalLink).toHaveAttribute("href", "/grievance");
  });

  it("uses valid description list semantics for Grievance Officer details", () => {
    const { container } = render(<GrievancePage />);
    const dl = container.querySelector("dl");
    expect(dl).toBeInTheDocument();
    expect(dl?.querySelector("dt")).toBeInTheDocument();
    expect(dl?.querySelector("dd")).toBeInTheDocument();
  });

  it("presents understandable grievance categories", () => {
    render(<GrievancePage />);
    expect(screen.getByText("Account or access")).toBeInTheDocument();
    expect(screen.getByText("Listing or content")).toBeInTheDocument();
    expect(screen.getByText("User behaviour / safety")).toBeInTheDocument();
    expect(screen.getByText("Reporting or blocking")).toBeInTheDocument();
    expect(screen.getByText("Privacy / personal data")).toBeInTheDocument();
    expect(screen.getByText("Intellectual property or legal notice")).toBeInTheDocument();
    expect(screen.getByText("Technical / platform issue")).toBeInTheDocument();
    expect(screen.getByText("Other grievance")).toBeInTheDocument();
  });

  it("renders submission guidance checklist for users", () => {
    render(<GrievancePage />);
    expect(screen.getByText("What to Include in Your Submission")).toBeInTheDocument();
    expect(screen.getByText(/Full Name:/i)).toBeInTheDocument();
    expect(screen.getByText(/FairSwap Account Email:/i)).toBeInTheDocument();
    expect(screen.getByText(/Grievance Category:/i)).toBeInTheDocument();
    expect(screen.getByText(/Specific Identifier:/i)).toBeInTheDocument();
    expect(screen.getByText(/Clear Description:/i)).toBeInTheDocument();
  });

  it("displays a prominent security warning against sending sensitive credentials or Aadhaar", () => {
    render(<GrievancePage />);
    expect(screen.getByText("Security & Sensitive Information Notice")).toBeInTheDocument();
    const notice = screen.getByText(/For your security, please/i);
    expect(notice.textContent).toMatch(/passwords/i);
    expect(notice.textContent).toMatch(/OTP codes/i);
    expect(notice.textContent).toMatch(/MFA\/TOTP/i);
    expect(notice.textContent).toMatch(/Aadhaar/i);
    expect(notice.textContent).toMatch(/payment credentials/i);
  });

  it("includes restrained grievance process review and response wording", () => {
    render(<GrievancePage />);
    expect(screen.getByText("Review and Response Process")).toBeInTheDocument();
    expect(
      screen.getByText(/FairSwap will review grievances submitted through the published grievance channel/i)
    ).toBeInTheDocument();
  });

  it("provides safety guidance and emergency service disclaimers", () => {
    render(<GrievancePage />);
    const safetyHeading = screen.getByRole("heading", { name: /Safety and Urgent Concerns/i });
    expect(safetyHeading).toBeInTheDocument();
    const safetySection = safetyHeading.closest("section")!;
    expect(within(safetySection).getByText(/emergency or law-enforcement/i)).toBeInTheDocument();
    expect(within(safetySection).getByText(/does not provide emergency response services/i)).toBeInTheDocument();
    expect(within(safetySection).getByText(/Report/i)).toBeInTheDocument();
    expect(within(safetySection).getByText(/Block/i)).toBeInTheDocument();
  });

  it("strictly excludes personal contact numbers, residential addresses, and private email", () => {
    const { container } = render(<GrievancePage />);
    const text = container.textContent || "";
    // Ensure no phone numbers or physical street addresses
    expect(text).not.toMatch(/\+91[-\s]?\d{10}/);
    expect(text).not.toMatch(/\b\d{10}\b/);
    expect(text).not.toMatch(/residential/i);
    expect(text).not.toMatch(/house no/i);
    expect(text).not.toMatch(/gmail\.com/i);
  });
});
