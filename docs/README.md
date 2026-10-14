# FairSwap documentation index

**Start here for current instructions.** Reviewed 14 October 2026. The old sequential `Phase 1` / `Phase 2` roadmap is **not** an execution or authorization framework. Historical documents are preserved for evidence only.

## Active developer documentation

| Task | Current source of truth |
| --- | --- |
| First checkout or Antigravity setup | [START_HERE](../START_HERE.md) |
| Project summary, tech and local commands | [Repository README](../README.md) |
| Current deployed state, gaps and environment boundaries | [CURRENT_STATE](CURRENT_STATE.md) |
| Contribution rules, branches, PR review and security | [CONTRIBUTING](../CONTRIBUTING.md) |
| Issue-based planning / implementation / releases | [WORKFLOW](WORKFLOW.md) |
| Product workstreams and priorities (no phases) | [ROADMAP](ROADMAP.md) |
| Tests, security regressions, browser/DB evidence | [VERIFICATION](VERIFICATION.md) |
| Ongoing moderation implementation | [MODERATION_TEXT_CHECKER](MODERATION_TEXT_CHECKER.md), [MOD_03A_AUTOMATIC_MODERATION](MOD_03A_AUTOMATIC_MODERATION.md) |
| Web/native owner media server contract | [Native seller media API](native-seller-media-api.md) |
| Indian location reference data operations | [Postal data](india-postal-data.md) |
| Product CSV-backed category data contracts | [CSV field reference](../src/lib/listings/csv-fields/README.md) |

## Operations and compliance

| Runbook | Responsibility |
| --- | --- |
| [Deployments](operations/deployment-guide.md) | Source release, environments, migration and rollback guardrails |
| [Auth email templates](operations/auth-email-templates.md) | Confirmation and OTP design, backups and hosted evidence |
| [Recovery email](operations/password-recovery-email.md) | Completed branded recovery rollout and operator acceptance |
| [Public-beta readiness](operations/public-beta-operations-readiness.md) | Dated risk acceptance, monitoring, remaining release gates |
| [Backup and restore](operations/backup-restore-runbook.md) | Disaster recovery and current limitation evidence |
| [Incident response](operations/incident-response-runbook.md) | Response and notification workflow |
| [Grievance handling](operations/grievance-handling-runbook.md) | India-first legal grievance process, pending external review |
| [Staff handbook](operations/staff-handbook.md) | Operational moderation and support roles |
| [Operational ownership](operations/operational-owner-matrix.md) | Responsibilities and risk ownership |

Treat legal/compliance timing and vendor behavior as version-sensitive; verify them before using an old report for a new production decision.

## Work in progress and reference evidence

- [Post Ad work](reference/post-ad/) — owner-draft evidence, category-field verification, submission review designs, release prerequisites and S1 Test-only containment. **Individual evidence files are dated snapshots; not blanket authorization for Production.**
- [Email-first authentication plan (#80/#82)](plans/80-82-email-auth-plan.md) — historical plan, superseded by source and hosted evidence.
- [Administration Test contracts](plans/admin-test-workflow-contracts.md) and [logging/monitoring plan](plans/logging-monitoring-baseline-plan.md) — technical context, not automatic release permission.

## Historical project records

The following are **preserved for provenance**, not current setup, rollout or feature gates. Their original phase/milestone terminology describes *past work*:

- [Original Project Bible / starter spec](../FAIRSWAP_SPEC.md), [starter-pack changelog](../CHANGELOG.md), [pack validation](../PACK_VALIDATION.md), [legacy integrity manifest](../MANIFEST.sha256).
- [Original foundation design](FOUNDATION.md), [starter scaffolding](BOOTSTRAP.md), [starter upgrade procedure](UPGRADING.md), [version-sensitive reference notes](REFERENCE_SOURCES.md).
- [Original sequential milestone contracts](milestones/) and [historic implementation plans](plans/).
- [Implementation and authorization ledger](PROGRESS.md) — chronological record, **not current authorization**.
- [Historical go/no-go assessment](release/1.6-go-no-go-report.md), [recovery drill evidence](operations/recovery-drill-evidence.md), and [dated tabletop exercise](operations/tabletop-simulation-2026-09-19.md).
- [Legacy milestone prompt scripts](../prompts/) — **do not paste into the current agent**; use the active issue/PR workflow instead.

**Do not delete, silently rewrite, or pretend to re-run historical evidence.** Preserve source/migration history and add a dated correction or new report when facts change. The old `MANIFEST.sha256` validates an earlier instruction-pack snapshot, **not this live repository**.
