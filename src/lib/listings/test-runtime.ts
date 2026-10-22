/** Runtime activation only, not authorization. Opaque keys need operator-verified provenance. */
export const POST_AD_TEST_PROJECT = "wpppxlnbzqynvhpeuavd";
const testUrl = `https://${POST_AD_TEST_PROJECT}.supabase.co`;
/** Deployment boundary, not an assignment/submission switch. The installed
 * family schema is supported only on this fixed Test backend. Existing records
 * still require verification when every Post Ad activation switch is OFF. */
export function requiresSavedSubmissionFamilyReads(env: Record<string, string | undefined>): boolean {
  const urls = [env.NEXT_PUBLIC_SUPABASE_URL, env.STAGING_SUPABASE_URL, env.SUPABASE_URL].filter(Boolean);
  const targetsInstalledBackend = urls.some(url => {
    try { return new URL(url!).hostname === `${POST_AD_TEST_PROJECT}.supabase.co`; }
    catch { return false; }
  });
  if (targetsInstalledBackend) {
    if (env.NEXT_PUBLIC_SUPABASE_URL !== testUrl || urls.some(url => url !== testUrl)) {
      throw Error('Conflicting installed family schema backend configuration');
    }
    return true;
  }
  if ([env.POST_AD_TWO_WHEELER_TEST_ENABLED, env.POST_AD_CARS_TEST_ENABLED, env.POST_AD_PROPERTY_TEST_ENABLED].includes('true')) {
    throw Error('Unsupported family schema deployment configuration');
  }
  // Verified Production draft-only families require saved-context reads.
  // Misconfigured flags fail closed; never infer backend capability from failed reads.
  const families = ["two-wheelers", "cars", "property"] as const;
  const requested = families.some(family => env[productionFamilyDraftFlags[family]] === "true");
  if (requested) {
    if (env.NEXT_PUBLIC_SUPABASE_URL !== productionUrl || urls.some(url => url !== productionUrl)) {
      throw Error("Production family schema target mismatch");
    }
    if (!families.some(family => isVerifiedExperimentalProductionEnvironment(env, family))) {
      throw Error("Unverified Production family draft read configuration");
    }
    return true;
  }
  // Supported legacy-only deployments have no activated family integration.
  // Never infer legacy capability from a failed database/context read.
  return false;
}
export function isVerifiedPostAdTestEnvironment(env: Record<string, string | undefined>): boolean {
  // Vercel builds Preview with NODE_ENV=production. Allow only the staging
  // Preview with an explicit branch-scoped Test opt-in; never Production.
  const stagingPreview =
    env.NODE_ENV === "production" &&
    env.VERCEL_ENV === "preview" &&
    env.POST_AD_STAGING_PREVIEW_ENABLED === POST_AD_TEST_PROJECT &&
    (!env.VERCEL_GIT_COMMIT_REF || env.VERCEL_GIT_COMMIT_REF === "staging");
  if (env.POST_AD_GOODS_TEST_ENABLED !== "true") return false;
  if (env.VERCEL_ENV && env.VERCEL_ENV !== "preview") return false;
  if (env.VERCEL_ENV === "preview" && !stagingPreview) return false;
  if (env.NODE_ENV === "production" && !stagingPreview) return false;
  if (env.NEXT_PUBLIC_SUPABASE_URL !== testUrl) return false;
  for (const name of ["STAGING_SUPABASE_URL", "SUPABASE_URL"]) {
    if (env[name] && env[name] !== testUrl) return false;
  }
  const publicNames = ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const privateNames = ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
  if (!publicNames.some(name => env[name]) || !privateNames.some(name => env[name])) return false;
  for (const name of [...publicNames, ...privateNames]) {
    if (!env[name]) continue;
    if (env[name]!.startsWith(publicNames.includes(name) ? "sb_publishable_" : "sb_secret_")) {
      if (env.POST_AD_TEST_CREDENTIALS_VERIFIED !== POST_AD_TEST_PROJECT) return false;
      continue;
    }
    try {
      const parts = env[name]!.split(".");
      if (parts.length !== 3) return false;
      const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      const ref = claims.ref || (typeof claims.iss === "string" && claims.iss.startsWith(`${testUrl}/`) ? POST_AD_TEST_PROJECT : undefined);
      if (ref !== POST_AD_TEST_PROJECT || claims.role !== (publicNames.includes(name) ? "anon" : "service_role")) return false;
    } catch { return false; }
  }
  return true;
}
/** Independent, default-OFF Goods-only Production release boundary.
 * Unlike the Test gate, this cannot activate Vehicles, Property or family submit.
 * Enable only AFTER the Production Goods metadata/context migrations are applied.
 * Backend RLS, ownership and Zod validation remain the write authority. */
export const POST_AD_PRODUCTION_PROJECT = "kriuhwppxgxsyyrbjsau";
const productionUrl = `https://${POST_AD_PRODUCTION_PROJECT}.supabase.co`;
export function isVerifiedGoodsProductionEnvironment(env: Record<string, string | undefined>): boolean {
  if (env.VERCEL_ENV !== "production" || env.NODE_ENV !== "production") return false;
  if (env.VERCEL_GIT_COMMIT_REF && env.VERCEL_GIT_COMMIT_REF !== "main") return false;
  if (env.POST_AD_GOODS_PRODUCTION_ENABLED !== "true") return false;
  if (env.POST_AD_PRODUCTION_CREDENTIALS_VERIFIED !== POST_AD_PRODUCTION_PROJECT) return false;
  if (env.NEXT_PUBLIC_SITE_URL !== "https://fairswap.in") return false;
  if (env.NEXT_PUBLIC_SUPABASE_URL !== productionUrl) return false;
  if ([env.STAGING_SUPABASE_URL, env.SUPABASE_URL].some(url => url && url !== productionUrl)) return false;
  // Never transfer the Test family/submission activation switches into Production.
  if ([env.POST_AD_GOODS_TEST_ENABLED, env.POST_AD_TWO_WHEELER_TEST_ENABLED,
    env.POST_AD_CARS_TEST_ENABLED, env.POST_AD_PROPERTY_TEST_ENABLED,
    env.POST_AD_SUBMISSION_TEST_ENABLED].includes("true")) return false;
  const publicKeys = [env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, env.NEXT_PUBLIC_SUPABASE_ANON_KEY].filter(Boolean) as string[];
  const privateKeys = [env.SUPABASE_SECRET_KEY, env.SUPABASE_SERVICE_ROLE_KEY].filter(Boolean) as string[];
  if (!publicKeys.length || !privateKeys.length) return false;
  const matches = (key: string, role: "anon" | "service_role") => {
    const prefix = role === "anon" ? "sb_publishable_" : "sb_secret_";
    if (key.startsWith(prefix)) return true; // Opaque keys require the operator attestation above.
    try {
      const parts = key.split(".");
      if (parts.length !== 3) return false;
      const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      return claims.role === role &&
        (claims.ref === POST_AD_PRODUCTION_PROJECT || claims.iss === productionUrl + "/auth/v1");
    } catch { return false; }
  };
  return publicKeys.every(key => matches(key,"anon")) && privateKeys.every(key => matches(key,"service_role"));
}

const productionFamilyDraftFlags = {
  "two-wheelers": "POST_AD_TWO_WHEELER_PRODUCTION_DRAFT_ENABLED",
  cars: "POST_AD_CARS_PRODUCTION_DRAFT_ENABLED",
  property: "POST_AD_PROPERTY_PRODUCTION_DRAFT_ENABLED",
} as const;

/** Phase A/B Production boundary: independently attested, default OFF, draft only.
 * Environment variables are not authorization. Database/RLS/guards decide writes. */
export function isVerifiedExperimentalProductionEnvironment(
  env: Record<string, string | undefined>,
  family: keyof typeof productionFamilyDraftFlags
): boolean {
  if (!isVerifiedGoodsProductionEnvironment(env)) return false;
  if (env.POST_AD_EXPERIMENTAL_PRODUCTION_FOUNDATION_VERIFIED !== POST_AD_PRODUCTION_PROJECT) return false;
  if (env.POST_AD_EXPERIMENTAL_PRODUCTION_PUBLICATION_LOCK_VERIFIED !== POST_AD_PRODUCTION_PROJECT) return false;
  if (env.POST_AD_EXPERIMENTAL_PRODUCTION_MODE !== "draft_only" &&
      !isVerifiedProductionFamilyLaunchEnvironment(env, family)) return false;
  return env[productionFamilyDraftFlags[family]] === "true";
}

/** Review-required LIVE production switch. Never enabled by the existing draft-only
 * release: three distinct attestations are required in addition to verified Goods,
 * the installed category foundation and individually enabled family assignment.
 * This controls Web routing only; DB RLS + atomic submit/moderation are authority. */
export function isVerifiedProductionFamilyLaunchEnvironment(
  env: Record<string, string | undefined>,
  family: keyof typeof productionFamilyDraftFlags
): boolean {
  if (!isVerifiedGoodsProductionEnvironment(env)) return false;
  if (env.POST_AD_EXPERIMENTAL_PRODUCTION_FOUNDATION_VERIFIED !== POST_AD_PRODUCTION_PROJECT) return false;
  if (env.POST_AD_EXPERIMENTAL_PRODUCTION_PUBLICATION_LOCK_VERIFIED !== POST_AD_PRODUCTION_PROJECT) return false;
  if (env.POST_AD_EXPERIMENTAL_PRODUCTION_MODE !== "reviewed_live") return false;
  if (env.POST_AD_PRODUCTION_FAMILY_SUBMISSION_VERIFIED !== POST_AD_PRODUCTION_PROJECT) return false;
  if (env.POST_AD_PRODUCTION_FAMILY_MODERATION_VERIFIED !== POST_AD_PRODUCTION_PROJECT) return false;
  if (env.POST_AD_PRODUCTION_FAMILY_PUBLIC_READ_VERIFIED !== POST_AD_PRODUCTION_PROJECT) return false;
  return env[productionFamilyDraftFlags[family]] === "true";
}

/** True only when at least one family is independently approved for public launch. */
export function isVerifiedProductionFamilySubmissionRouteEnvironment(
  env: Record<string, string | undefined>
): boolean {
  return (["two-wheelers", "cars", "property"] as const).some(family =>
    isVerifiedProductionFamilyLaunchEnvironment(env, family)
  );
}

export function isVerifiedTwoWheelerTestEnvironment(env: Record<string, string | undefined>): boolean {
  return env.POST_AD_TWO_WHEELER_TEST_ENABLED === "true" && isVerifiedPostAdTestEnvironment(env);
}
export function isVerifiedCarsTestEnvironment(env: Record<string, string | undefined>): boolean {
  return env.POST_AD_CARS_TEST_ENABLED === "true" && isVerifiedPostAdTestEnvironment(env);
}
export function isVerifiedPropertyTestEnvironment(env: Record<string, string | undefined>): boolean {
  return env.POST_AD_PROPERTY_TEST_ENABLED === "true" && isVerifiedPostAdTestEnvironment(env);
}
/** Separate submission control. Database eligibility and persisted data still decide. */
export function isVerifiedSubmissionTestEnvironment(env: Record<string, string | undefined>): boolean {
  return env.POST_AD_SUBMISSION_TEST_ENABLED === "true" && isVerifiedPostAdTestEnvironment(env);
}
