export type SettingsDestination = { kind: "redirect"; href: string } | { kind: "settings" };

/**
 * Maps legacy `/account/settings?tab=…` links. Profile editing and privacy requests live on
 * their own pages; everything else (security, missing or unknown tab) renders Settings.
 */
export function resolveSettingsTab(tabParam: string | string[] | undefined): SettingsDestination {
  const raw = Array.isArray(tabParam) ? tabParam[0] : tabParam;
  const tab = raw?.toLowerCase().trim();
  if (tab === "profile") return { kind: "redirect", href: "/account/profile" };
  if (tab === "privacy") return { kind: "redirect", href: "/account/privacy" };
  return { kind: "settings" };
}
