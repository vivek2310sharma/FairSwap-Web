import "server-only";

export function wearablesEnabled() {
  return process.env.POST_AD_WEARABLES_V1_ENABLED === "true";
}
