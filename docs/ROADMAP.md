# FairSwap product roadmap — workstreams and readiness

**Current planning model, reviewed 14 October 2026.** Prioritize work by **verified behavior, customer trust, security, operational risk, and explicit owner approval**. Historical numbered development phases and `1.1–1.6` milestones do **not** determine which tasks may now be started.

This is a living **planning index**, not implementation permission. GitHub issues and reviewed PRs supply concrete scope and current acceptance criteria.

## Operating product — maintain and secure

The controlled Production pilot is available at https://fairswap.in and backed by FairSwapProd. Existing Web capabilities include confirmed email accounts, password and six-digit email OTP sign-in, branded recovery, listings, moderated visibility, search/discovery, direct messaging, blocking, reports and staff administration.

Production authentication email design is complete: signup confirmation [#126](https://github.com/vivek2310sharma/FairSwap-Web/issues/126), sign-in code [#111](https://github.com/vivek2310sharma/FairSwap-Web/issues/111), and password recovery [#142](https://github.com/vivek2310sharma/FairSwap-Web/issues/142). All three were deployed to both Supabase environments. Operator-controlled real password recovery passed on Production on 14 October 2026; see [recovery evidence](operations/password-recovery-email.md).

**Permanent priorities:** Authorization/RLS correctness, safe media, reliable moderation and notifications, fraud-resistant login flows, data minimization, and incident response. Do not trade security boundaries for faster feature rollout. Keeping private images, account credentials, moderation decisions and reports protected is a key way to outperform OLX India on trust.

## Integration work — Test/staging is not Production

| Stream | Latest grounded boundary | Required gate |
| --- | --- | --- |
| Post Ad / category journeys | Shared staging includes additional owner-draft, Goods/Post Ad test coverage and documented category-mapping evidence | Review category activation and end-to-end seller journey separately for each released surface |
| S1 Test-only email capture | Source exists only in staging; explicitly designed to prevent **provider delivery** and reject Production | Never deploy to FairSwapProd; inspect strict targeting, auth and rollback before any hosted Test trial |
| Moderation security | Main's Vault-based dispatch authorization and pinned Edge imports are reconciled to staging; identical authorized worker source already verified in Test and Production | Retain fail-closed worker auth, service-only RPC, migration history and security tests |
| Web/native media contract | Documented server-mediated owner media APIs; separate clients have their own toolchains and release processes | Coordinate API contract/versioning with Android Studio and Antigravity/Xcode teams |

The staging/main code branches may differ intentionally. Changes on staging should not reach Production through a broad merge unless **every** included change has passed release review.

## Product improvements — candidates, not automatic commitments

- **Trust and safety:** Clear warnings against UPI collect-request fraud, fake army-officer claims, courier scams and fake buyers demanding advance fees or OTPs; moderation/admin quality and safe reporting.
- **Buyer utility:** More accurate search, saved discovery, localized category fields, accessible low-data listing pages, clearer seller identity and safe meetup education.
- **Seller utility:** Faster owner drafts/editing, reliable media uploads on mid/low-end phones, status explanations and safer buyer conversations.
- **Localization and mobile:** Expand English/Hindi UX deliberately, then prioritized Indian languages. Keep Web API contracts aligned with separate Android and iOS codebases.
- **Operational resilience:** Revisit backup/PITR, more than one trained production operator, alert coverage, privacy and grievance procedures using actual risk/owner decisions.
- **Potential paid platform features:** Evaluate UPI for FairSwap **service fees** only with approved product/legal design. Do not infer item checkout, escrow, wallet or buyer-to-seller payments from this idea.

Rank candidates using current issues and customer evidence, not an inherited `Phase 2` plan or an obsolete milestone checklist.

## Explicit deferrals and boundaries

- New-device login notification [#110](https://github.com/vivek2310sharma/FairSwap-Web/issues/110): **closed, not planned for now**; it would require backend login event detection and safe notification implementation, not just a Supabase email template.
- Phone-number OTP login is **not implemented** in this Web application. Treat future phone OTP/WhatsApp notification work as a new security and privacy design, not a hidden completed feature.
- Do not assume that an OAuth callback route means Google login is currently offered in the Web sign-in UI.
- Broader **public-launch certification** is a separate business, operations and compliance decision. Historic risk acceptance on [#41](https://github.com/vivek2310sharma/FairSwap-Web/issues/41) does not automatically eliminate ongoing backup/legal/grievance gaps. Review [operations readiness](operations/public-beta-operations-readiness.md) and obtain fresh decisions before expanding access.

## Release evidence and historical records

- [Current state](CURRENT_STATE.md) is the dated reality check; [deployment runbook](operations/deployment-guide.md) describes environment safety.
- [Post Ad evidence index](reference/post-ad/) records scoped historical Test results and blockers. These reports are not wholesale Production authorization.
- [Historical milestone contracts](milestones/), [implementation plans](plans/), [original foundation design](FOUNDATION.md), [implementation ledger](PROGRESS.md), and [pre-production assessment](release/1.6-go-no-go-report.md) are retained for traceability **only**. They describe prior sequencing and past evidence, not a current roadmap gate.
