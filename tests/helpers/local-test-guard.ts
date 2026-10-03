/**
 * Fail-Closed Local-Test Target Guard
 *
 * Prevents accidental mutation of hosted, production, or non-loopback environments
 * during automated authentication testing.
 */

export class LocalTestGuardError extends Error {
  constructor(message: string) {
    super(`[LOCAL_TEST_GUARD] ${message}`);
    this.name = "LocalTestGuardError";
  }
}

export interface TargetConfig {
  appUrl?: string;
  supabaseUrl?: string;
  mailboxUrl?: string;
  allowMutationsEnv?: string;
  nodeEnv?: string;
}

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isLoopbackUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function validateLocalTestEnvironment(config?: TargetConfig): {
  appUrl: string;
  supabaseUrl: string;
  mailboxUrl: string;
} {
  const allowMutations =
    config?.allowMutationsEnv ?? process.env.ALLOW_LOCAL_TEST_MUTATIONS;

  if (allowMutations !== "true") {
    throw new LocalTestGuardError(
      "Refusing to execute: ALLOW_LOCAL_TEST_MUTATIONS='true' is required to perform test mutations."
    );
  }

  const nodeEnv = config?.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv === "production") {
    throw new LocalTestGuardError(
      "Refusing to execute: NODE_ENV is set to 'production'."
    );
  }

  const appUrl =
    config?.appUrl ??
    process.env.PLAYWRIGHT_TEST_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3001";
  if (!isLoopbackUrl(appUrl)) {
    throw new LocalTestGuardError(
      `Refusing to execute: App URL '${appUrl}' is not a verified loopback address.`
    );
  }

  const supabaseUrl =
    config?.supabaseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

  if (
    supabaseUrl.toLowerCase().includes(".supabase.co") ||
    supabaseUrl.toLowerCase().includes(".supabase.in")
  ) {
    throw new LocalTestGuardError(
      `Refusing to execute: Supabase URL '${supabaseUrl}' targets a hosted Supabase project.`
    );
  }

  if (!isLoopbackUrl(supabaseUrl)) {
    throw new LocalTestGuardError(
      `Refusing to execute: Supabase URL '${supabaseUrl}' is not a verified local disposable instance.`
    );
  }

  const mailboxUrl = config?.mailboxUrl ?? process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
  if (!isLoopbackUrl(mailboxUrl)) {
    throw new LocalTestGuardError(
      `Refusing to execute: Mailbox URL '${mailboxUrl}' is not a verified loopback address.`
    );
  }

  return { appUrl, supabaseUrl, mailboxUrl };
}

/**
 * Registry of user IDs created during the current test execution.
 * Ensures eventual cleanup operates ONLY on tracked disposable IDs.
 */
class TestUserRegistry {
  private userIds = new Set<string>();

  register(userId: string): void {
    if (userId && typeof userId === "string") {
      this.userIds.add(userId);
    }
  }

  getRegisteredIds(): string[] {
    return Array.from(this.userIds);
  }

  clear(): void {
    this.userIds.clear();
  }

  async cleanupTrackedUsers(
    adminClient: {
      auth: { admin: { deleteUser: (id: string) => Promise<unknown> } };
    },
    targetConfig?: TargetConfig
  ): Promise<{ deleted: string[]; failed: string[] }> {
    // Re-verify fail-closed guard before issuing admin deleteUser calls
    validateLocalTestEnvironment(targetConfig);

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const userId of Array.from(this.userIds)) {
      try {
        const result = (await adminClient.auth.admin.deleteUser(userId)) as
          | { error?: unknown }
          | null
          | undefined;

        const isConfirmedSuccess =
          Boolean(result) &&
          typeof result === "object" &&
          !Array.isArray(result) &&
          "error" in (result as object) &&
          (result as Record<string, unknown>).error === null;

        if (isConfirmedSuccess) {
          deleted.push(userId);
          this.userIds.delete(userId);
        } else {
          failed.push(userId);
        }
      } catch {
        failed.push(userId);
      }
    }

    return { deleted, failed };
  }
}

export const testUserRegistry = new TestUserRegistry();
