import { createAnonymousBudget } from "@/lib/security/anonymous-budget";

/**
 * Abuse budget for the public (no sign-in) /saved lookup. Cost is the number of ids resolved, because each id can cost
 * a database round trip. Per-instance and best-effort; see `security/anonymous-budget.ts` for why this is not a global
 * rate limit. Kept out of the "use server" action file so it can never be exposed as a callable server action.
 */
export const savedLookupBudget = createAnonymousBudget({ windowMs: 60_000, maxRequests: 12, maxCost: 120, maxGlobalCost: 2500 });
