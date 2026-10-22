import { describe, expect, it } from "vitest";
import {
  POST_AD_PRODUCTION_PROJECT,
  POST_AD_TEST_PROJECT,
  isVerifiedExperimentalProductionEnvironment,
  isVerifiedProductionFamilyLaunchEnvironment,
  isVerifiedProductionFamilySubmissionRouteEnvironment,
  requiresSavedSubmissionFamilyReads,
} from "../../src/lib/listings/test-runtime";

const productionUrl = `https://${POST_AD_PRODUCTION_PROJECT}.supabase.co`;
const testUrl = `https://${POST_AD_TEST_PROJECT}.supabase.co`;
function production(overrides: Record<string, string | undefined> = {}) {
  return {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    VERCEL_GIT_COMMIT_REF: "main",
    NEXT_PUBLIC_SUPABASE_URL: productionUrl,
    NEXT_PUBLIC_SITE_URL: "https://fairswap.in",
    POST_AD_GOODS_PRODUCTION_ENABLED: "true",
    POST_AD_PRODUCTION_CREDENTIALS_VERIFIED: POST_AD_PRODUCTION_PROJECT,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture_not_a_real_key",
    SUPABASE_SECRET_KEY: "sb_secret_fixture_not_a_real_key",
    POST_AD_EXPERIMENTAL_PRODUCTION_FOUNDATION_VERIFIED: POST_AD_PRODUCTION_PROJECT,
    POST_AD_EXPERIMENTAL_PRODUCTION_PUBLICATION_LOCK_VERIFIED: POST_AD_PRODUCTION_PROJECT,
    POST_AD_EXPERIMENTAL_PRODUCTION_MODE: "draft_only",
    ...overrides,
  };
}
describe("fail-closed Production experimental draft gates", () => {
  it("remains off by default even when Goods production is enabled", () => {
    const env=production();
    for (const family of ["cars","two-wheelers","property"] as const) {
      expect(isVerifiedExperimentalProductionEnvironment(env, family)).toBe(false);
    }
    expect(requiresSavedSubmissionFamilyReads(env)).toBe(false);
  });
  it("enables only the explicitly verified family (still draft-only)", () => {
    const config=[
      ["cars","POST_AD_CARS_PRODUCTION_DRAFT_ENABLED"],
      ["two-wheelers","POST_AD_TWO_WHEELER_PRODUCTION_DRAFT_ENABLED"],
      ["property","POST_AD_PROPERTY_PRODUCTION_DRAFT_ENABLED"],
    ] as const;
    for(const [family,key] of config){
      const env=production({[key]:"true"});
      expect(isVerifiedExperimentalProductionEnvironment(env,family)).toBe(true);
      expect(requiresSavedSubmissionFamilyReads(env)).toBe(true);
      for(const [other] of config) if(other!==family)
        expect(isVerifiedExperimentalProductionEnvironment(env,other)).toBe(false);
    }
  });
  it.each([
    ["wrong Production target", {NEXT_PUBLIC_SUPABASE_URL:testUrl}],
    ["wrong Vercel target", {VERCEL_ENV:"preview"}],
    ["wrong git branch", {VERCEL_GIT_COMMIT_REF:"staging"}],
    ["missing schema attestation", {POST_AD_EXPERIMENTAL_PRODUCTION_FOUNDATION_VERIFIED:undefined}],
    ["missing publication lock", {POST_AD_EXPERIMENTAL_PRODUCTION_PUBLICATION_LOCK_VERIFIED:undefined}],
    ["not draft-only", {POST_AD_EXPERIMENTAL_PRODUCTION_MODE:"publish"}],
    ["Goods gate off", {POST_AD_GOODS_PRODUCTION_ENABLED:undefined}],
    ["Test category flag", {POST_AD_CARS_TEST_ENABLED:"true"}],
    ["Test submission flag", {POST_AD_SUBMISSION_TEST_ENABLED:"true"}],
    ["missing credential attestation", {POST_AD_PRODUCTION_CREDENTIALS_VERIFIED:undefined}],
    ["missing service key", {SUPABASE_SECRET_KEY:undefined}],
    ["wrong domain", {NEXT_PUBLIC_SITE_URL:"https://not-fairswap.in"}],
  ])("refuses %s", (_description, overrides) => {
    const env=production({POST_AD_CARS_PRODUCTION_DRAFT_ENABLED:"true",...overrides});
    expect(isVerifiedExperimentalProductionEnvironment(env,"cars")).toBe(false);
  });
  it("fails closed for unverified Production saved category reads", () => {
    const env=production({POST_AD_PROPERTY_PRODUCTION_DRAFT_ENABLED:"true",
      POST_AD_EXPERIMENTAL_PRODUCTION_PUBLICATION_LOCK_VERIFIED:undefined});
    expect(()=>requiresSavedSubmissionFamilyReads(env)).toThrow("Unverified Production family draft read configuration");
  });
});


describe("production live family submission is independently attested", () => {
  const release={
    POST_AD_EXPERIMENTAL_PRODUCTION_MODE: "reviewed_live",
    POST_AD_PRODUCTION_FAMILY_SUBMISSION_VERIFIED: POST_AD_PRODUCTION_PROJECT,
    POST_AD_PRODUCTION_FAMILY_MODERATION_VERIFIED: POST_AD_PRODUCTION_PROJECT,
    POST_AD_PRODUCTION_FAMILY_PUBLIC_READ_VERIFIED: POST_AD_PRODUCTION_PROJECT,
    POST_AD_CARS_PRODUCTION_DRAFT_ENABLED: "true",
  };
  it("never enables a public release from draft-only flags", () => {
    const env=production({POST_AD_CARS_PRODUCTION_DRAFT_ENABLED:"true"});
    expect(isVerifiedExperimentalProductionEnvironment(env,"cars")).toBe(true);
    expect(isVerifiedProductionFamilyLaunchEnvironment(env,"cars")).toBe(false);
    expect(isVerifiedProductionFamilySubmissionRouteEnvironment(env)).toBe(false);
  });
  it("denies live mode until every independent backend attestation is present", () => {
    for (const missing of [
      "POST_AD_PRODUCTION_FAMILY_SUBMISSION_VERIFIED",
      "POST_AD_PRODUCTION_FAMILY_MODERATION_VERIFIED",
      "POST_AD_PRODUCTION_FAMILY_PUBLIC_READ_VERIFIED",
    ]) {
      const env=production({...release,[missing]:undefined});
      expect(isVerifiedProductionFamilyLaunchEnvironment(env,"cars")).toBe(false);
      expect(isVerifiedExperimentalProductionEnvironment(env,"cars")).toBe(false);
      expect(isVerifiedProductionFamilySubmissionRouteEnvironment(env)).toBe(false);
    }
  });
  it("requires correct project/branch/production target, not merely matching attestations",()=>{
    for (const override of [
      {VERCEL_ENV:"preview"},
      {VERCEL_GIT_COMMIT_REF:"staging"},
      {NEXT_PUBLIC_SUPABASE_URL:testUrl},
      {POST_AD_GOODS_TEST_ENABLED:"true"},
      {POST_AD_PRODUCTION_CREDENTIALS_VERIFIED:undefined},
    ]) {
      const env=production({...release,...override});
      expect(isVerifiedProductionFamilyLaunchEnvironment(env,"cars")).toBe(false);
    }
  });
  it("activates only the explicitly approved saved family and retains owner-read checks",()=>{
    const env=production(release);
    expect(isVerifiedProductionFamilyLaunchEnvironment(env,"cars")).toBe(true);
    expect(isVerifiedProductionFamilyLaunchEnvironment(env,"two-wheelers")).toBe(false);
    expect(isVerifiedProductionFamilyLaunchEnvironment(env,"property")).toBe(false);
    expect(isVerifiedProductionFamilySubmissionRouteEnvironment(env)).toBe(true);
    expect(requiresSavedSubmissionFamilyReads(env)).toBe(true);
  });
});
