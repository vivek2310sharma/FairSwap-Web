// Shared, dependency-free constants for the Wearables V1 Test E2E producer.
// These mirror FairSwap-Backend scripts/release/wearables-v1-release.mjs (WEARABLES_E2E, WEARABLES_WEB,
// PROJECT_REFS and the reviewed candidate SHA-256 pins). Backend is the authority; the verifier rejects any drift.
export const SCHEMA = "wearables-v1-e2e/1";
export const RECEIPT_NAME = "wearables-v1-e2e-test.json";
export const SUMS_NAME = "SHA256SUMS_e2e";
export const ARTIFACT_PREFIX = "wearables-e2e-test-";
export const WORKFLOW_PATH = ".github/workflows/wearables-e2e-test.yml";
export const STEPS = Object.freeze([
  "authenticated_listing_creation",
  "media_upload",
  "ownership_rls",
  "pairing_state_restrictions",
  "moderator_aal2_review",
  "buyer_visibility",
]);
export const ENVIRONMENT = "FairSwapTest";
export const TEST_PROJECT_REF = "wpppxlnbzqynvhpeuavd";
export const PROD_PROJECT_REF = "kriuhwppxgxsyyrbjsau";
export const WEB_STAGING_SHA = "e37e28df1d387a02bcbea19487dfe0f82d198f74";
export const FOUNDATION_SHA256 = "41122396afe11952126eaf474d272e88e81444863e97d0b2e646ee4cbac48b06";
export const ACTIVATION_SHA256 = "c5a50f11df325a9743f39b13d7aa536a1b7b12cca9467fc318da8f659527b10b";
// The runner commit may differ from WEB_STAGING_SHA only in these paths (Backend WEARABLES_E2E.runnerPaths).
export const RUNNER_PATHS = Object.freeze([/^\.github\/workflows\/wearables-e2e-test\.yml$/, /^e2e\/wearables\/[A-Za-z0-9._/-]+$/]);
export const MAX_RUNNER_FILES = 100;
export const PRODUCTION_ORIGIN = "https://fairswap.in";
export const PRODUCTION_FLAG_OFF_MESSAGE = "Wearable posting is coming soon.";
export const SHA40 = /^[0-9a-f]{40}$/;
