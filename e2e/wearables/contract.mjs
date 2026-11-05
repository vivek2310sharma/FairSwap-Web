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
export const ACTIVATION_SHA256 = "ec102db34e4414a713aed950b756ea617888209515031c5a615306d30e08ac54";
// Existing runner paths, the PG17 CI correction, plus ONLY the 12 reviewed Tablets V2 paths from 5348f261e0683b049d256030bd0498d9365b1d0f.
// Keep WEB_STAGING_SHA at the original tested Wearables commit; Backend must enforce the same exact allowlist.
export const RUNNER_PATHS = Object.freeze([
  /^\.github\/workflows\/wearables-e2e-test\.yml$/,
  /^e2e\/wearables\/[A-Za-z0-9._/-]+$/,
  /^\.github\/workflows\/ci\.yml$/,
  /^docs\/operations\/TABLETS_POST_AD_V2\.md$/,
  /^src\/app\/api\/post-ad\/tablets\/submit\/route\.ts$/,
  /^src\/components\/listings\/TabletForm\.tsx$/,
  /^src\/components\/listings\/posting\/SearchCombobox\.tsx$/,
  /^src\/components\/listings\/posting\/tablet-wizard\.ts$/,
  /^src\/lib\/listings\/tablets\/contract\.ts$/,
  /^src\/lib\/listings\/tablets\/public\.ts$/,
  /^tests\/browser\/tablets-v1\.spec\.ts$/,
  /^tests\/unit\/tablet-public-details\.test\.tsx$/,
  /^tests\/unit\/tablet-submit-boundary\.test\.ts$/,
  /^tests\/unit\/tablets-v1\.test\.ts$/,
  /^tools\/tablets-v1\/verify\.mjs$/,
]);
export const MAX_RUNNER_FILES = 100;
export const PRODUCTION_ORIGIN = "https://fairswap.in";
export const PRODUCTION_FLAG_OFF_MESSAGE = "Wearable posting is coming soon.";
export const SHA40 = /^[0-9a-f]{40}$/;

// Independently inspected through Vercel on 2026-11-05: READY, target production,
// alias fairswap.in. Keep this fail-closed pin until another deployment is reviewed.
export const PRODUCTION_ABSENCE = Object.freeze({
  sha: "9a291aeec7c64e4de2cd55d9b21686adedcc3dcd",
  deploymentId: "dpl_679vqxcCtkfCVQQa8kS7eZxU7HiT",
  url: "https://fairswap-5i5r6669p-fairswap.vercel.app",
});
