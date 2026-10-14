# Post Ad — design, Test evidence and release prerequisites

> [!IMPORTANT]
> **Historical evidence availability:** A number of dated verification records refer to files under `artifacts/evidence/` that were created in local or Antigravity worktrees and are **not tracked in Git**. These references are now shown as plain paths rather than broken GitHub download links. Their presence in a report is not proof that the evidence bytes are available in this repository. Retrieve and verify original artifacts from the operator's local/archived evidence storage before relying on them in a release decision.

**Reference archive / active integration evidence (reviewed 2026-10-14).** These files preserve original acceptance results, blocked reviews and proposed contracts. They are **not** blanket permissions to enable categories, trigger emails, or release to Production.

Use [CURRENT_STATE](../../CURRENT_STATE.md) and [ROADMAP](../../ROADMAP.md) for current priorities, and confirm implementation status in the actual GitHub branch and live environment.

## Customer/owner draft evidence

- [Owner draft flow and Git handoff](Post-Ad-Draft-Flow-Closeout.md)
- [Combined journey acceptance](Post-Ad-Journey-Acceptance.md)
- [Owner flow verification](Post-Ad-Owner-Flow-Verification.md)
- [Read-only readiness inventory](Post-Ad-Readiness-Verification.md)
- [Source candidate review](Post-Ad-Source-Candidate-Review.md)
- [Submission and Admin-review decision contract](Post-Ad-Submission-Review-Contract.md)
- [Release prerequisite review](Post-Ad-Release-Prerequisites-Review.md)

## Controlled direct-access security work

- [S1 authorization Test inventory](S1-Direct-Authorization-Test-Plan.md)
- [S1 non-delivering Test email containment](S1-Notification-Containment-Design.md) — **Test-only; do not deploy to Production**.

## Category-source/field contracts

- [CSV compilation reference](csv-mapping/FairSwap-Codex-CSV-Field-Layer.md)
- [Cars draft evidence](csv-mapping/Cars-V1-Verification.md)
- [Two-wheeler draft evidence](csv-mapping/Two-Wheeler-V1-Verification.md)
- [Current CSV field source documentation](../../../src/lib/listings/csv-fields/README.md)

The [original planning-only prompt](FairSwap-Post-Ad-Codex-PLAN-ONLY.md) is historical. Active changes use short-lived worktrees and the [contributing guide](../../../CONTRIBUTING.md), with separate Test/Production approvals.
