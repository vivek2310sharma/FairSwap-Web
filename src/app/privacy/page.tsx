import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { ShieldCheck, Clock } from "lucide-react";
import { LEGAL_POLICY } from "@/lib/compliance/legal-policy";

export const metadata = {
  title: "Privacy Policy — FairSwap",
  description: "Privacy policy and data governance practices for the FairSwap platform.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted">
              How FairSwap collects, processes, protects, and governs your personal information.
            </p>
          </div>
        </div>

        {/* Version & Status Metadata */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 text-xs text-muted">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Clock className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <span>Version: {LEGAL_POLICY.privacyVersion}</span>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div>
            <span>Last Updated: 14 October 2026 (payment disclosure)</span>
          </div>
          <span className="hidden sm:inline text-border">•</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            <span>Public Beta Baseline</span>
          </div>
        </div>

        {/* Privacy Content */}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-muted">
          {/* 1. Introduction & Operator */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              1. Introduction &amp; Data Governance Scope
            </h2>
            <p className="mt-3">
              {LEGAL_POLICY.operatorDescription} This Privacy Policy describes how personal information is collected, processed, retained, and safeguarded when you use the FairSwap local classifieds platform (available at <Link href="/" className="text-brand-link underline hover:text-brand-hover">fairswap.in</Link>).
            </p>
            <p className="mt-2">
              FairSwap is committed to transparent, privacy-respecting data governance. We collect only the information necessary to provide, secure, and moderate our peer-to-peer classifieds directory. We do not sell personal data, license user profiles to data brokers, or operate commercial advertising tracking networks.
            </p>
          </section>

          {/* 2. Age Requirement */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              2. Age Boundary (18+ Only)
            </h2>
            <p className="mt-3">
              FairSwap is strictly intended for users who are at least {LEGAL_POLICY.minimumAge} years of age. FairSwap does not knowingly collect personal data from or offer accounts to children or minors under 18.
            </p>
            <p className="mt-2">
              During account registration, users must self-certify that they are at least {LEGAL_POLICY.minimumAge} years old. If we become aware that an account has been created by or on behalf of an individual under 18, we will take immediate steps to suspend the account and remove associated personal information in accordance with our deletion protocols.
            </p>
          </section>

          {/* 3. Data Inventory */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              3. Categories of Personal Data We Process
            </h2>
            <p className="mt-3">
              We process personal data across the following platform categories. The payment-related category below applies only if a seller uses a paid promotion after checkout is enabled:
            </p>
            <div className="mt-4 space-y-4">
              <div className="border-l-2 border-brand-500 pl-4">
                <h3 className="text-sm font-semibold text-foreground">A. Account &amp; Authentication Information</h3>
                <p className="mt-1 text-xs">
                  When you register, we collect your email address, unique account identifiers, display name, account status, and policy acceptance metadata (including recorded versions of Terms, Privacy, Acceptable Use, and age confirmation). Passwords are never stored in plaintext; user credentials, password hashing, and authentication tokens are managed securely through Supabase Auth.
                </p>
              </div>

              <div className="border-l-2 border-brand-500 pl-4">
                <h3 className="text-sm font-semibold text-foreground">B. Public Profile Attributes</h3>
                <p className="mt-1 text-xs">
                  Your public profile may include your chosen display name, optional biographical summary, general city and state, and optional avatar URL. Private account data (such as email address and internal audit records) is never exposed in public queries or API responses.
                </p>
              </div>

              <div className="border-l-2 border-brand-500 pl-4">
                <h3 className="text-sm font-semibold text-foreground">C. Classified Listings &amp; Media</h3>
                <p className="mt-1 text-xs">
                  When posting an advertisement, we process listing titles, descriptions, category attributes, condition, pricing, locality, PIN code, and timestamps. Uploaded original photographs are stored in private cloud storage accessible only to you and platform moderators. Public visitors receive only metadata-stripped, resized derivative images (thumbnails and scaled WebP photos) for approved listings.
                </p>
              </div>

              <div className="border-l-2 border-brand-500 pl-4">
                <h3 className="text-sm font-semibold text-foreground">D. Platform Communications</h3>
                <p className="mt-1 text-xs">
                  FairSwap processes direct chat messages exchanged between buyers and sellers, conversation participant records, listing references, and timestamps. Communications are processed to deliver in-app messaging and may be accessed in connection with abuse reports, safety investigations, or moderation reviews.
                </p>
              </div>

              <div className="border-l-2 border-brand-500 pl-4">
                <h3 className="text-sm font-semibold text-foreground">E. Safety, Moderation &amp; Support Data</h3>
                <p className="mt-1 text-xs">
                  We process user-submitted reports, block lists, moderation audit transitions, reasons for listing rejection or account suspension, in-platform support tickets, and appeal submissions. Grievance correspondence sent to our public grievance email address (<a href="mailto:grievance@fairswap.in" className="text-brand-link underline">grievance@fairswap.in</a>) is handled through our email intake channel and is not automatically stored in the platform application database.
                </p>
              </div>

              <div className="border-l-2 border-brand-500 pl-4">
                <h3 className="text-sm font-semibold text-foreground">F. Privacy Request Records</h3>
                <p className="mt-1 text-xs">
                  When you submit data export or account deletion requests through <span className="font-medium text-foreground">/account/privacy</span>, we record the request type, timestamp, status, and resolution details to fulfill and audit your request.
                </p>
              </div>

              <div className="border-l-2 border-brand-500 pl-4">
                <h3 className="text-sm font-semibold text-foreground">G. Technical &amp; Operational Logs</h3>
                <p className="mt-1 text-xs">
                  For service security and operational integrity, our systems process technical metadata such as request correlation IDs, authentication security events, error diagnostic logs, and security audit entries. FairSwap applies centralized redaction and sanitisation controls to operational logs to reduce exposure of credentials, authentication tokens, secrets, and other sensitive values. We do not collect precise GPS tracking data or government identity documents.
                </p>
              </div>
              <div className="border-l-2 border-brand-500 pl-4">
                <h3 className="text-sm font-semibold text-foreground">H. Optional Paid-Promotion &amp; Billing Information (when available)</h3>
                <p className="mt-1 text-xs">
                  If a seller purchases a Plus or Premium promotional service, FairSwap may process the selected package, amount, tax details, payment order and transaction references, payment confirmation status, billing contact details needed for a receipt, and refund/support records. An authorised payment gateway processes payment credentials and authorisation using its own secure systems; FairSwap does not require users to disclose card PINs, UPI PINs, OTPs, or full card credentials to FairSwap support. This paragraph describes a planned checkout data flow and does not imply that paid checkout is currently active.
                </p>
              </div>
            </div>
          </section>

          {/* 4. Purposes of Processing */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              4. Purposes for Which We Process Data
            </h2>
            <p className="mt-3">
              We process personal information only for legitimate, transparent purposes directly related to operating FairSwap:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>To create, authenticate, and manage your user account.</li>
              <li>To publish, display, categorize, and facilitate discovery of local classified advertisements.</li>
              <li>To enable secure peer-to-peer messaging between buyers and sellers regarding advertisements.</li>
              <li>To review and moderate listings prior to public display, and investigate reports of policy violations.</li>
              <li>To detect, prevent, and mitigate fraud, scams, harassment, unauthorized access, and security threats.</li>
              <li>To respond to user support inquiries, appeals, and formal grievances.</li>
              <li>To fulfill voluntary platform privacy controls, including data export and account deletion workflows.</li>
              <li>To diagnose technical errors, optimize platform reliability, and ensure system resilience.</li>
              <li>When optional paid promotions are enabled, to calculate charges, confirm payments, activate purchased visibility services, provide receipts, resolve charge disputes, and issue eligible refunds.</li>
              <li>To comply with valid legal obligations, statutory orders, or lawful authority requests under Indian law.</li>
            </ul>
          </section>

          {/* 5. Infrastructure & Processors */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              5. Service Providers &amp; Infrastructure
            </h2>
            <p className="mt-3">
              FairSwap relies on verified third-party cloud infrastructure providers to operate the application securely:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Hosting &amp; Edge Delivery:</strong> Vercel Inc. provides frontend web hosting, serverless execution, and edge content delivery.
              </li>
              <li>
                <strong className="text-foreground">Database, Auth &amp; Object Storage:</strong> Supabase Inc. provides managed PostgreSQL database hosting, GoTrue authentication services, and secure object storage for listing media.
              </li>
              <li>
                <strong className="text-foreground">Payment Services (only when enabled):</strong> An authorised Indian payment gateway, such as PhonePe Payment Gateway if approved and integrated, may process checkout and share payment status and limited transaction information needed to fulfil or refund an optional promotional purchase. The payment provider&apos;s own privacy and security notices also apply to its processing.
              </li>
            </ul>
            <p className="mt-3">
              FairSwap uses cloud service providers such as Vercel and Supabase. Those providers may process data in locations where their infrastructure or subprocessors operate, subject to applicable requirements and the relevant service configuration.
            </p>
            <p className="mt-2">
              We do not share your personal information with commercial data brokers, advertising agencies, or marketing networks.
            </p>
          </section>

          {/* 6. Cookies & Storage */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              6. Cookies &amp; Local Storage
            </h2>
            <p className="mt-3">
              FairSwap uses cookies or similar storage necessary for authentication, session management, security, and operation of the service.
            </p>
            <p className="mt-2">
              Essential session cookies (such as auth tokens managed via Supabase SSR) are used to maintain authenticated sessions and support platform security controls across page navigations.
            </p>
            <p className="mt-2">
              FairSwap does not currently deploy advertising or marketing cookie integrations in its application code. If FairSwap introduces non-essential analytics, advertising, or similar technologies in the future, this Privacy Policy and any applicable consent controls will be reviewed before deployment.
            </p>
          </section>

          {/* 7. Data Retention & Deletion */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              7. Data Retention &amp; Account Deletion
            </h2>
            <p className="mt-3">
              We retain personal information only for as long as necessary to fulfill the purposes described in this policy, maintain active accounts, or satisfy operational, security, and legal obligations:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Active Accounts:</strong> Account, profile, and listing data is retained for the duration of your active platform membership.
              </li>
              <li>
                <strong className="text-foreground">Account Deletion Workflow:</strong> When an account-deletion request is fulfilled, FairSwap removes or anonymises account information according to the platform deletion workflow, deletes the authentication identity and associated private media where applicable, and may retain limited historical, moderation, security, grievance, audit, or legally required records.
              </li>
              <li>
                <strong className="text-foreground">Payment Records:</strong> If checkout is introduced, transaction, billing, refund, and tax-related records may be kept for the period necessary to administer purchases, handle disputes, prevent fraud, and meet applicable recordkeeping obligations, including where an account is later deleted.
              </li>
              <li>
                <strong className="text-foreground">Legal &amp; Security Exceptions:</strong> Certain records—such as immutable security audit logs, moderation enforcement actions, record of consent, and dispute or grievance documentation—are retained where required for fraud prevention, system security, or compliance with applicable Indian law.
              </li>
            </ul>
          </section>

          {/* 8. Platform Privacy Controls */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              8. Platform Privacy Controls &amp; Data Rights
            </h2>
            <p className="mt-3">
              FairSwap provides authenticated self-service privacy controls accessible directly through your account dashboard at{" "}
              <Link href="/account/privacy" className="font-medium text-brand-link underline hover:text-brand-hover">
                /account/privacy
              </Link>
              :
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-foreground">Profile &amp; Settings Management:</strong> You can view and update your display name, bio, location, and notification preferences at any time in Account Settings.
              </li>
              <li>
                <strong className="text-foreground">Data Export:</strong> You can generate and download a structured JSON archive of your personal data, including your profile attributes, active and historical listings, favourites, submitted reports, and support ticket history.
              </li>
              <li>
                <strong className="text-foreground">Account Deletion Request:</strong> You can submit an account deletion request to initiate the platform anonymisation and credential removal workflow.
              </li>
            </ul>
            <p className="mt-3 text-xs">
              FairSwap provides account data export and account deletion request tools as part of its platform privacy controls. As India&apos;s Digital Personal Data Protection framework undergoes staged commencement, FairSwap will continue aligning its processes with applicable statutory requirements as they come into force.
            </p>
          </section>

          {/* 9. Security & Safeguards */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              9. Security Safeguards &amp; Data Protection
            </h2>
            <p className="mt-3">
              FairSwap uses technical and organisational safeguards appropriate to the service to protect personal data against unauthorized access, loss, alteration, or misuse:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Row Level Security (RLS) policies enforced directly within the PostgreSQL database engine to restrict data access strictly to authorized users.</li>
              <li>Two-tier database architecture separating public user-facing functions from unexposed security definer procedures.</li>
              <li>Strict Multi-Factor Authentication (AAL2 TOTP) mandatory for all administrative and staff accounts.</li>
              <li>HTTPS/TLS encryption in transit for all communications between your browser and our servers.</li>
              <li>Centralized log sanitisation and redaction controls designed to reduce exposure of authentication tokens, credentials, secrets, and other sensitive values.</li>
            </ul>
            <p className="mt-2 text-xs">
              While we implement rigorous technical safeguards, no internet-based platform can guarantee absolute security. Users are responsible for safeguarding their account credentials.
            </p>
          </section>

          {/* 10. Personal Data Incidents */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              10. Personal Data Incident Response
            </h2>
            <p className="mt-3">
              FairSwap maintains procedures to promptly investigate suspected security events or personal data incidents. In the event of a verified breach impacting personal data, FairSwap will take containment and remedial measures and comply with applicable statutory notification and reporting requirements under Indian law.
            </p>
          </section>

          {/* 11. Privacy Contact & Grievances */}
          <section className="rounded-xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-foreground">
              11. Grievance Officer &amp; Privacy Contact
            </h2>
            <p className="mt-3">
              If you have inquiries, concerns, or formal grievances regarding personal data processing, data protection, or platform privacy practices, please contact our Grievance Officer:
            </p>
            <div className="mt-4 rounded-lg border border-border/80 bg-surface/50 p-4 text-xs space-y-1">
              <p><strong className="text-foreground">Officer:</strong> {LEGAL_POLICY.operatorName}</p>
              <p><strong className="text-foreground">Designation:</strong> {LEGAL_POLICY.grievanceOfficerTitle}</p>
              <p>
                <strong className="text-foreground">Email:</strong>{" "}
                <a href={`mailto:${LEGAL_POLICY.grievanceEmail}`} className="text-brand-link underline hover:text-brand-hover">
                  {LEGAL_POLICY.grievanceEmail}
                </a>
              </p>
              <p>
                <strong className="text-foreground">Grievance Portal:</strong>{" "}
                <Link href={LEGAL_POLICY.grievanceRoute} className="text-brand-link underline hover:text-brand-hover">
                  fairswap.in{LEGAL_POLICY.grievanceRoute}
                </Link>
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
