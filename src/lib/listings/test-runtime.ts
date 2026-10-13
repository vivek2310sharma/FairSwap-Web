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
  // Supported legacy-only deployments have no activated family integration.
  // Never infer legacy capability from a failed database/context read.
  return false;
}
export function isVerifiedPostAdTestEnvironment(env: Record<string, string | undefined>): boolean {
  if (env.POST_AD_GOODS_TEST_ENABLED !== "true" || env.NODE_ENV === "production") return false;
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
