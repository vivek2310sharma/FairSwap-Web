# FairSwap — Grievance Handling Runbook

> [!IMPORTANT]
> **India-first grievance operations:** This runbook's compliance/legal discussions are dated to September 2026 and are not a substitute for current Indian-law review. The public grievance route is recorded as deployed; separate delivery/legal-applicability checks may remain outstanding. See [current state](../CURRENT_STATE.md) and [operations readiness](public-beta-operations-readiness.md) before asserting full readiness.


**Issue:** #37 — Publish Grievance Officer details  
**Original authoring status (2026-09-19):** READY FOR REVIEW / EXTERNAL VERIFICATION INCOMPLETE — retained as a dated record; this wording is not the current deployment status of the public `/grievance` page.  
**Reviewed against public legal sources:** 2026-09-19

This runbook defines FairSwap's internal handling process for grievances received through the published grievance channel. It complements the public `/grievance` page and does not replace legal advice or the classification/applicability decisions tracked in issue #38.

FairSwap's exact classification under the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the applicability of other marketplace/e-commerce obligations remain subject to #38. Where this runbook refers to statutory timelines, they are stated as **conditional operating requirements if the relevant intermediary provisions apply**. Until #38 is closed, FairSwap should meet or beat these timelines operationally rather than rely on a narrower interpretation.

## 1. Published intake channel

Primary public grievance channel:

- Grievance Officer: **Vivek Kumar**
- Designation: **Grievance Officer — FairSwap**
- Email: `grievance@fairswap.in`
- Public page: `https://fairswap.in/grievance`

The public grievance page currently asks users not to submit passwords, OTPs, MFA/TOTP secrets, recovery codes, payment credentials, bank/card details, or Aadhaar numbers. Internal handling must preserve that data-minimisation boundary.

Authenticated `/account/support` tickets are a separate support channel. They are **not automatically treated as the statutory grievance channel** unless the ticket is explicitly reclassified and routed to the Grievance Officer with the original receipt timestamp preserved.

## 2. Intake and triage workflow

Every grievance must follow this sequence:

1. **Receive** — record the original receipt timestamp in UTC and preserve the original message/source.
2. **Register** — assign a unique internal grievance ID that does not expose personal data.
3. **Classify** — select the complaint category and determine whether an expedited legal/safety path may apply.
4. **Acknowledge** — send a receipt acknowledgement using the timeline in the SLA matrix below.
5. **Assign** — set a primary handler and backup/escalation owner.
6. **Preserve evidence** — preserve relevant listing, message, moderation, audit, and provider evidence before destructive changes where lawful and appropriate.
7. **Investigate** — collect only the information necessary to decide the grievance.
8. **Act / escalate** — take moderation, account, technical, legal, privacy, or security action through supported procedures.
9. **Communicate outcome** — state the action taken or not taken without exposing private staff notes, other users' confidential information, secrets, or protected evidence.
10. **Close and retain** — record closure time, decision, evidence references, follow-up actions, and any retention/legal-hold requirements.

## 3. Complaint categories and routing

Use the same categories shown on the public grievance page:

| Category | Primary route | Mandatory escalation conditions |
| --- | --- | --- |
| Account or access | Account/support owner | Suspected account takeover, credential compromise, or broader auth incident -> Security Incident Lead |
| Listing or content | Moderation owner | Potentially unlawful content, expedited Rule 3 category, court/government notice -> Grievance Officer + legal/privacy owner |
| User behaviour / safety | Trust & Safety / moderation | Immediate physical-safety risk, credible threat, or suspected crime -> Grievance Officer + appropriate emergency/legal escalation |
| Reporting or blocking | Moderation/support | Allegation of systemic moderation failure or unlawful content -> Grievance Officer |
| Privacy / personal data | Privacy owner | Suspected personal-data breach -> Security Incident Lead + privacy/legal owner |
| Intellectual property or legal notice | Grievance Officer | Any formal legal notice, court order, competent-authority request, or repeat-infringement issue -> legal review |
| Technical / platform issue | Engineering/operations | Security impact, data loss, widespread outage -> incident-response runbook |
| Other grievance | Grievance Officer | Reclassify after triage |

## 4. SLA matrix

The consolidated IT Rules published by MeitY and updated 10 February 2026 state, for the intermediary grievance mechanism, a 24-hour acknowledgement and seven-day general resolution period. They also provide shorter timelines for specified categories. These entries are **conditional on applicability**, pending #38.

| Track | Internal target | Conditional statutory reference if applicable | Owner |
| --- | --- | --- | --- |
| Any grievance — acknowledgement | **<= 24 hours from original receipt** | Rule 3(2)(a)(i) | Grievance Officer / delegated handler |
| General grievance — resolution | **<= 7 days from original receipt** | Rule 3(2)(a)(i), as amended 10 Feb 2026 | Grievance Officer |
| Specified Rule 3(1)(b) removal request | **Immediate triage; complete within <= 36 hours where the provision applies** | First proviso to Rule 3(2)(a)(i), as amended 10 Feb 2026 | Grievance Officer + moderation/legal |
| Specified intimate imagery / impersonation complaint by or for the affected individual | **Immediate triage; removal/disablement decision and action within <= 2 hours where Rule 3(2)(b) applies** | Rule 3(2)(b), as amended 10 Feb 2026 | Grievance Officer + moderation |
| Government / court / competent-authority notice | **Immediate registration and legal escalation; acknowledge receipt promptly** | Rule 3(2)(a)(ii); other response timelines depend on the order/law | Grievance Officer + legal owner |
| Suspected security or personal-data breach | **Immediate P0/P1 incident escalation** | Follow security incident runbook; re-check CERT-In / DPDP duties at incident time | Security Incident Lead + privacy/legal |

Do not downgrade an expedited complaint merely because the sender selected the wrong category. Classification is the responsibility of the handler.

## 5. Required grievance record

For every grievance, retain the minimum record necessary to demonstrate handling:

- internal grievance ID;
- original channel and original receipt timestamp (UTC);
- complainant name/contact information only as needed for the case;
- FairSwap account identifier, listing ID/URL, user ID, conversation ID, or other relevant identifiers where provided;
- category and any expedited/legal track applied;
- assigned primary handler and backup/escalation role;
- acknowledgement timestamp and delivery result;
- investigation notes limited to necessary facts;
- evidence references (audit-log IDs, moderation records, message IDs, provider event IDs, hashes, screenshots or exported files where appropriate);
- each material action and timestamp;
- whether content/evidence preservation or legal hold is required;
- decision and reason suitable for internal record;
- user-facing outcome communication timestamp;
- closure timestamp;
- appeal/follow-up route if applicable;
- linked security, privacy, moderation, support, or legal incident/ticket IDs.

Do **not** copy passwords, OTPs, MFA secrets, recovery codes, card/bank credentials, Aadhaar numbers, raw authentication tokens, cookies, or unrelated private user data into grievance records.

## 6. Acknowledgement procedure

The acknowledgement should:

- confirm receipt and grievance ID;
- state the original receipt date/time;
- identify the category or say that classification is under review;
- provide the expected handling window without promising a result;
- request only missing information that is necessary to investigate;
- repeat the warning not to send passwords, OTPs, payment credentials, Aadhaar, or unnecessary sensitive information;
- provide a monitored reply path.

If automated acknowledgement is later introduced, its successful delivery must be monitored. An automated response does not replace human triage of expedited or high-risk categories.

### Grievance Appellate Committee (conditional Rule 3A path)

If the intermediary grievance provisions apply to FairSwap, user-facing outcome communications should not obscure the statutory appeal route under Rule 3A.

- A person aggrieved by a Grievance Officer decision may appeal to the Grievance Appellate Committee within the applicable 30-day period.
- Rule 3A also provides an appeal route for certain grievances that are not resolved within the applicable Rule 3 resolution period.
- The appeal process is online through the official GAC portal: `https://gac.gov.in`.
- Where this route applies, record whether the user-facing outcome included or linked to the GAC appeal information.
- Do not represent GAC as FairSwap's internal appeals body; it is the Government-established appellate mechanism under the IT Rules.

This remains conditional on the intermediary applicability position tracked in #38.

## 7. Expedited content handling

When a grievance may fall within an expedited legal category:

1. preserve the original complaint timestamp immediately;
2. capture the exact content URL/identifier and a non-public evidence snapshot if appropriate;
3. assess whether the complained-of material is hosted, stored, published, or transmitted through FairSwap;
4. escalate to the Grievance Officer without waiting for the normal queue;
5. use supported moderation/removal mechanisms; do not bypass audit/RLS controls with ad-hoc database edits;
6. preserve legally relevant evidence before removal where required;
7. record the final action timestamp and rationale;
8. communicate only information that can safely be disclosed to the complainant.

The handler must not make independent legal conclusions beyond the approved policy. Unclear cases go to the legal/privacy owner identified for #38/#41.

## 8. Government, court, and competent-authority notices

Any apparent order, notice, summons, or direction from a Government body, law-enforcement body, court, regulator, or other claimed competent authority must be separated from the normal support queue.

Procedure:

1. preserve the original message, headers, attachments, envelope, and receipt timestamp;
2. do not click unknown links or run attachments on a privileged workstation;
3. verify authenticity through an independently sourced official contact path where appropriate;
4. assign the Grievance Officer and legal owner immediately;
5. record the legal basis, requested information/action, stated deadline, and issuing authority;
6. preserve responsive records and apply a legal hold where instructed;
7. disclose only the minimum information lawfully required and only through an approved channel;
8. never paste secrets, credentials, raw tokens, private keys, or unrestricted database exports into ordinary email replies;
9. record the response, approver, delivery evidence, and closure/follow-up date.

If the notice also concerns a cyber-security incident, activate the CERT-In assessment in the production incident-response runbook.

## 9. Backup and escalation ownership

For the current production release posture (PR #56):
- Primary Grievance Officer: **Vivek Kumar** (publicly designated at `/grievance`)
- Backup grievance handler: **None — owner risk accepted** (single-operator posture accepted under #41)
- Legal/privacy escalation owner: **Vivek Kumar** (FairSwap does not currently have retained counsel; Vivek Kumar evaluates and engages external legal counsel if/when required per `docs/operations/operational-owner-matrix.md`)
- Security incident escalation owner: **Vivek Kumar** (Primary Production Owner)
- Moderation escalation owner: **Vivek Kumar**

Private phone numbers, home addresses, recovery information, and emergency contact details must not be committed to this repository. The Platform Owner operates as sole designated handler under the accepted single-operator posture.

## 10. Evidence preservation and privacy

- Preserve only evidence relevant to the grievance or a required legal/security investigation.
- Keep internal notes separate from user-visible communications.
- Do not forward full grievance threads broadly; use least-privilege access.
- Redact credentials, auth tokens, payment details, and unnecessary personal data from operational logs and copied evidence.
- When content is removed or disabled, preserve associated records where required by applicable law or an active legal hold.
- Use UTC for operational timestamps and retain immutable provider/message IDs where available.

## 11. End-to-end grievance intake test

Run this test before claiming public launch grievance readiness. Use synthetic test data only.

### Test setup

- Sender: external test mailbox not hosted by the same forwarding rule/provider where possible.
- Recipient: `grievance@fairswap.in`.
- Subject: `FairSwap grievance intake test — <date>`.
- Body: clearly state `TEST — NO REAL USER DATA` and include a synthetic category and identifier.

### Evidence to record privately

1. send timestamp (UTC);
2. delivery/receipt timestamp at the monitored grievance inbox;
3. assigned grievance ID;
4. acknowledgement timestamp and delivery result;
5. routing owner and backup visibility;
6. closure timestamp;
7. any forwarding, spam, DKIM/SPF/DMARC, or provider delivery problems;
8. screenshots/logs that contain no credentials or unnecessary personal data.

### Pass criteria

- message arrives at the monitored grievance inbox;
- primary and backup can access the case without credential sharing;
- acknowledgement is delivered within the internal/statutory target;
- case can be assigned, tracked, and closed with complete timestamps;
- the test does not expose secrets or real user data.

Current status: **Inbound routing verified (PASS on 2026-09-19)**; outbound acknowledgement from `grievance@fairswap.in` remains **deferred**.

## 12. Public launch verification checklist

Both Issue #37 and Issue #38 were closed as Not Planned by owner decision on 2026-09-19. Unresolved operational and compliance items are recorded below as deferred prerequisites for a wider public launch:

- [ ] Issue #38 confirms FairSwap's legal classification and applicable grievance obligations (deferred item recorded in closed #38).
- [ ] Backup grievance handler is designated in the private operations register (single-operator risk accepted under #41).
- [x] Legal/privacy and security escalation owners are designated (Vivek Kumar per `docs/operations/operational-owner-matrix.md`).
- [ ] Outbound acknowledgement delivery from `grievance@fairswap.in` is verified with timestamps (deferred item recorded in closed #37).
- [x] Inbound grievance intake routing to `grievance@fairswap.in` tested and passing via Cloudflare Email Routing (2026-09-19).
- [x] `/grievance` is verified on the stable staging deployment (PR #42 & PR #55).
- [x] `/grievance` deployed to production via PR #56 (Vercel deployment succeeded; deployed source verified; live external domain fetch unverified due to verification environment resolution limit).
- [x] Published name/contact details match the approved business/legal record (`Vivek Kumar`, `grievance@fairswap.in`).
- [ ] Any legally required postal address, phone number, or additional disclosure is confirmed under #38 before wider public launch.
- [x] Conditional Rule 3A / GAC appeal guidance is included on the public grievance page.
- [ ] Approval/evidence is recorded without adding private contact details or secrets to GitHub.

## 13. Source references

Official legal reference reviewed for the conditional intermediary timelines:

- MeitY, consolidated Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, updated 10 February 2026: `https://www.meity.gov.in/static/uploads/2026/02/550681ab908f8afb135b0ad42816a1c9.pdf`
- Government Grievance Appellate Committee portal and FAQs: `https://gac.gov.in`

Relevant repository references:

- `/grievance`
- `docs/operations/incident-response-runbook.md`
- `docs/operations/operational-owner-matrix.md`
- Closed issue #38 — final legal review (closed as Not Planned; unresolved items deferred)
- Closed issue #37 — publish grievance officer details (closed as Not Planned; unresolved items deferred)
- Issue #41 — production monitoring and incident ownership
