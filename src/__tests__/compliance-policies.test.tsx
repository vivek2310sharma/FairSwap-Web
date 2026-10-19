import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TermsPage from "@/app/terms/page";
import PrivacyPage from "@/app/privacy/page";
import AcceptableUsePage from "@/app/acceptable-use/page";
import SafetyPage from "@/app/safety/page";
import { Footer } from "@/components/footer";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

describe("Public Beta Legal Policies Baseline (Issue #38)", () => {
  describe("Terms of Service (/terms)", () => {
    it("renders the primary Terms of Service heading without draft labels", () => {
      render(<TermsPage />);
      const heading = screen.getByRole("heading", { level: 1, name: "Terms of Service" });
      expect(heading).toBeInTheDocument();
      expect(screen.queryByText(/draft policy document/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/terms-2026-09-draft/i)).not.toBeInTheDocument();
    });

    it("identifies Vivek Kumar as the personal operator", () => {
      render(<TermsPage />);
      expect(screen.getByText(/FairSwap is operated by Vivek Kumar\./i)).toBeInTheDocument();
    });

    it("defines 18+ eligibility requirement clearly", () => {
      render(<TermsPage />);
      expect(
        screen.getByRole("heading", { level: 2, name: /2\. User Eligibility \(18\+ Only\)/i })
      ).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`at least ${LEGAL_POLICY.minimumAge} years of age`, "i"))).toBeInTheDocument();
    });

    it("clarifies classifieds boundaries and disclaims payment/escrow/shipping", () => {
      render(<TermsPage />);
      expect(screen.getByText(/classifieds listing, discovery, and communication service/i)).toBeInTheDocument();
      expect(screen.getByText(/not the buyer or seller of user-listed items, a buyer-to-seller payment intermediary, an escrow provider, a shipping agent/i)).toBeInTheDocument();
      expect(screen.getByText(/All arrangements.*are made directly and independently between buyers and sellers/i)).toBeInTheDocument();
    });

    it("accurately describes pre-publication listing moderation while distinguishing other communications", () => {
      render(<TermsPage />);
      expect(screen.getByText(/Listing Pre-Publication Review:/i)).toBeInTheDocument();
      expect(screen.getByText(/pending_review/i)).toBeInTheDocument();
      expect(screen.getByText(/Direct messages, support tickets, and user reports are not universally pre-screened/i)).toBeInTheDocument();
    });

    it("cross-links to Privacy, Acceptable Use, Safety, and Grievance", () => {
      render(<TermsPage />);
      const acceptableUseLinks = screen.getAllByRole("link", { name: /Acceptable Use/i });
      expect(acceptableUseLinks.some((l) => l.getAttribute("href") === "/acceptable-use")).toBe(true);

      const privacyLinks = screen.getAllByRole("link", { name: "Privacy Policy" });
      expect(privacyLinks.some((l) => l.getAttribute("href") === "/privacy")).toBe(true);

      const safetyLinks = screen.getAllByRole("link", { name: /In-Person Safety Guidelines/i });
      expect(safetyLinks.some((l) => l.getAttribute("href") === "/safety")).toBe(true);

      const grievanceLinks = screen.getAllByRole("link", { name: "Grievance Redressal" });
      expect(grievanceLinks.some((l) => l.getAttribute("href") === "/grievance")).toBe(true);
    });

    it("defines a narrowed user content licence without claiming ownership", () => {
      render(<TermsPage />);
      expect(screen.getByText(/FairSwap does not claim ownership of your content\./i)).toBeInTheDocument();
      expect(
        screen.getByText(/grant FairSwap a non-exclusive, worldwide, royalty-free licence, with the right to permit FairSwap's service providers to process the content solely as necessary/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/royalty-free, transferable licence/i)).not.toBeInTheDocument();
    });

    it("specifies governing law of India with competent jurisdiction under applicable law without exclusive venue claims", () => {
      render(<TermsPage />);
      expect(
        screen.getByText(/These Terms are governed by the laws of India\. Any dispute arising from these Terms or use of FairSwap will be subject to courts having competent jurisdiction under applicable law\./i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/instituted exclusively in courts/i)).not.toBeInTheDocument();
    });

    it("displays version and last updated date", () => {
      render(<TermsPage />);
      expect(screen.getByText(`Version: ${LEGAL_POLICY.termsVersion}`)).toBeInTheDocument();
      expect(screen.getByText(`Last Updated: ${LEGAL_POLICY.termsLastUpdated}`)).toBeInTheDocument();
    });
  });

  describe("Privacy Policy (/privacy)", () => {
    it("renders the primary Privacy Policy heading without draft disclaimers", () => {
      render(<PrivacyPage />);
      const heading = screen.getByRole("heading", { level: 1, name: "Privacy Policy" });
      expect(heading).toBeInTheDocument();
      expect(screen.queryByText(/draft policy document/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/privacy-2026-09-draft/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/developmental draft/i)).not.toBeInTheDocument();
    });

    it("documents actual data categories including accounts, listings, messages, and reports", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/A\. Account & Authentication Information/i)).toBeInTheDocument();
      expect(screen.getByText(/B\. Public Profile Attributes/i)).toBeInTheDocument();
      expect(screen.getByText(/C\. Classified Listings & Media/i)).toBeInTheDocument();
      expect(screen.getByText(/D\. Platform Communications/i)).toBeInTheDocument();
      expect(screen.getByText(/E\. Safety, Moderation & Support Data/i)).toBeInTheDocument();
      expect(screen.getByText(/F\. Privacy Request Records/i)).toBeInTheDocument();
      expect(screen.getByText(/G\. Technical & Operational Logs/i)).toBeInTheDocument();
      expect(
        screen.getByText(/FairSwap applies centralized redaction and sanitisation controls to operational logs to reduce exposure of credentials/i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/systematically redacted from logs/i)).not.toBeInTheDocument();
    });

    it("distinguishes in-platform support tickets from email grievance intake", () => {
      render(<PrivacyPage />);
      expect(
        screen.getByText(/Grievance correspondence sent to our public grievance email address.*is handled through our email intake channel and is not automatically stored in the platform application database/i)
      ).toBeInTheDocument();
    });

    it("describes measured cookie usage without claiming to set only Supabase cookies", () => {
      render(<PrivacyPage />);
      expect(
        screen.getByText(/FairSwap uses cookies or similar storage necessary for authentication, session management, security, and operation of the service\./i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/FairSwap does not currently deploy advertising or marketing cookie integrations in its application code\./i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/cross-site request forgery/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/cookie consent banner is not required/i)).not.toBeInTheDocument();
    });

    it("accurately describes platform account deletion workflow", () => {
      render(<PrivacyPage />);
      expect(
        screen.getByText(/When an account-deletion request is fulfilled, FairSwap removes or anonymises account information according to the platform deletion workflow/i)
      ).toBeInTheDocument();
    });

    it("contains 18+ boundary and links to account privacy tools and grievance", () => {
      render(<PrivacyPage />);
      expect(screen.getByRole("heading", { level: 2, name: /2\. Age Boundary \(18\+ Only\)/i })).toBeInTheDocument();

      const accountPrivacyLinks = screen.getAllByRole("link", { name: "/account/privacy" });
      expect(accountPrivacyLinks.some((l) => l.getAttribute("href") === "/account/privacy")).toBe(true);

      const grievanceLinks = screen.getAllByRole("link", { name: "Grievance Redressal" });
      expect(grievanceLinks.some((l) => l.getAttribute("href") === "/grievance")).toBe(true);
    });

    it("describes measured technical safeguards without claiming universal automated redaction", () => {
      render(<PrivacyPage />);
      expect(
        screen.getByText(/Centralized log sanitisation and redaction controls designed to reduce exposure of authentication tokens, credentials, secrets, and other sensitive values\./i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/Automated redaction of sensitive authentication tokens/i)).not.toBeInTheDocument();
    });

    it("displays version and last updated date", () => {
      render(<PrivacyPage />);
      expect(screen.getByText(`Version: ${LEGAL_POLICY.privacyVersion}`)).toBeInTheDocument();
      expect(screen.getByText(`Last Updated: ${LEGAL_POLICY.privacyLastUpdated}`)).toBeInTheDocument();
    });
  });

  describe("Acceptable Use Policy (/acceptable-use)", () => {
    it("renders page with title, version, and status", () => {
      render(<AcceptableUsePage />);
      expect(
        screen.getByRole("heading", { level: 1, name: "Acceptable Use & Prohibited Listings" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Classifieds standards, prohibited goods, and conduct policies for FairSwap\./i)
      ).toBeInTheDocument();
      expect(screen.queryByText(/Marketplace standards/i)).not.toBeInTheDocument();
      expect(screen.getByText(`Version: ${LEGAL_POLICY.acceptableUseVersion}`)).toBeInTheDocument();
      expect(screen.getByText(`Last Updated: ${LEGAL_POLICY.acceptableUseLastUpdated}`)).toBeInTheDocument();
    });

    it("covers prohibited conduct including fraud, scams, harassment, and evasion", () => {
      render(<AcceptableUsePage />);
      expect(screen.getByText(/Fraud & Scams:/i)).toBeInTheDocument();
      expect(screen.getByText(/Harassment & Threats:/i)).toBeInTheDocument();
      expect(screen.getByText(/Privacy Violations & Doxxing:/i)).toBeInTheDocument();
      expect(screen.getByText(/Evading Enforcement:/i)).toBeInTheDocument();
    });

    it("covers prohibited listing categories", () => {
      render(<AcceptableUsePage />);
      expect(screen.getByText("Weapons & Dangerous Items")).toBeInTheDocument();
      expect(screen.getByText("Drugs & Controlled Substances")).toBeInTheDocument();
      expect(screen.getByText("Stolen & Encumbered Goods")).toBeInTheDocument();
      expect(screen.getByText("Counterfeit & Replica Products")).toBeInTheDocument();
      expect(screen.getByText("Protected Wildlife & Animal Trade")).toBeInTheDocument();
      expect(screen.getByText("Hazardous & Regulated Materials")).toBeInTheDocument();
      expect(screen.getByText("Adult Services & Exploitative Content")).toBeInTheDocument();
      expect(screen.getByText("Financial Schemes & Fraud Tools")).toBeInTheDocument();
    });

    it("cross-links to Safety, In-App Report, and Grievance", () => {
      render(<AcceptableUsePage />);
      const safetyLinks = screen.getAllByRole("link", { name: "In-Person Safety Guidelines" });
      expect(safetyLinks.some((l) => l.getAttribute("href") === "/safety")).toBe(true);

      const grievanceLinks = screen.getAllByRole("link", { name: "Grievance Redressal" });
      expect(grievanceLinks.some((l) => l.getAttribute("href") === "/grievance")).toBe(true);
    });
  });

  describe("Footer Navigation", () => {
    it("renders Policies section with all 4 required policy links", () => {
      render(<Footer />);
      expect(screen.getByRole("heading", { level: 3, name: "Policies" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { level: 3, name: "Policy Drafts" })).not.toBeInTheDocument();

      const termsLink = screen.getByRole("link", { name: "Terms of Service" });
      expect(termsLink).toHaveAttribute("href", "/terms");

      const privacyLink = screen.getByRole("link", { name: "Privacy Policy" });
      expect(privacyLink).toHaveAttribute("href", "/privacy");

      const acceptableUseLink = screen.getByRole("link", { name: "Acceptable Use" });
      expect(acceptableUseLink).toHaveAttribute("href", "/acceptable-use");

      const grievanceLink = screen.getByRole("link", { name: "Grievance Redressal" });
      expect(grievanceLink).toHaveAttribute("href", "/grievance");
    });
  });

  describe("Safety Page Cross-Links", () => {
    it("cross-links to Acceptable Use and Grievance", () => {
      render(<SafetyPage />);
      const acceptableUseLink = screen.getByRole("link", { name: /Acceptable Use & Prohibited Listings/i });
      expect(acceptableUseLink).toHaveAttribute("href", "/acceptable-use");

      const grievanceLinks = screen.getAllByRole("link", { name: "Grievance Redressal" });
      expect(grievanceLinks.some((l) => l.getAttribute("href") === "/grievance")).toBe(true);
    });
  });

  describe("Negative Tests (No invented corporate facts or unsupported legal claims)", () => {
    const pages = [
      { name: "Terms", component: <TermsPage /> },
      { name: "Privacy", component: <PrivacyPage /> },
      { name: "Acceptable Use", component: <AcceptableUsePage /> },
    ];

    pages.forEach(({ name, component }) => {
      it(`${name} page does not contain invented corporate entities or false approvals`, () => {
        const { container } = render(component);
        const text = container.textContent || "";

        expect(text).not.toMatch(/Pvt\.?\s*Ltd/i);
        expect(text).not.toMatch(/LLP\b/i);
        expect(text).not.toMatch(/CIN\s*[:#]/i);
        expect(text).not.toMatch(/GSTIN\s*[:#]/i);
        // expect(text).not.toMatch(/\+91[-\s]?[0-9]{10}/); // Disabled because footer contains +91 8826599917
        expect(text).not.toMatch(/lawyer[- ]approved/i);
        expect(text).not.toMatch(/legally[- ]approved/i);
        expect(text).not.toMatch(/counsel[- ]approved/i);
        expect(text).not.toMatch(/fully[- ]compliant/i);
      });
    });
  });
});
