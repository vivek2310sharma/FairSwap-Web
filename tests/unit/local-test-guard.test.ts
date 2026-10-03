import { describe, it, expect, beforeEach } from "vitest";
import {
  validateLocalTestEnvironment,
  LocalTestGuardError,
  isLoopbackUrl,
  testUserRegistry,
} from "../helpers/local-test-guard";

describe("Fail-Closed Local-Test Target Guard", () => {
  beforeEach(() => {
    testUserRegistry.clear();
  });

  it("correctly identifies loopback vs non-loopback URLs", () => {
    expect(isLoopbackUrl("http://localhost:3000")).toBe(true);
    expect(isLoopbackUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLoopbackUrl("http://[::1]:54324")).toBe(true);
    expect(isLoopbackUrl("https://localhost:3000")).toBe(true);

    expect(isLoopbackUrl("https://my-project.supabase.co")).toBe(false);
    expect(isLoopbackUrl("https://fairswap.in")).toBe(false);
    expect(isLoopbackUrl("http://192.168.1.50:54321")).toBe(false);
    expect(isLoopbackUrl("invalid-url-string")).toBe(false);
  });

  it("aborts when ALLOW_LOCAL_TEST_MUTATIONS is not 'true'", () => {
    expect(() =>
      validateLocalTestEnvironment({
        allowMutationsEnv: undefined,
        appUrl: "http://localhost:3000",
        supabaseUrl: "http://127.0.0.1:54321",
        mailboxUrl: "http://127.0.0.1:54324",
      })
    ).toThrow(LocalTestGuardError);

    expect(() =>
      validateLocalTestEnvironment({
        allowMutationsEnv: "false",
        appUrl: "http://localhost:3000",
        supabaseUrl: "http://127.0.0.1:54321",
        mailboxUrl: "http://127.0.0.1:54324",
      })
    ).toThrow(/ALLOW_LOCAL_TEST_MUTATIONS='true' is required/);
  });

  it("aborts when NODE_ENV is 'production'", () => {
    expect(() =>
      validateLocalTestEnvironment({
        allowMutationsEnv: "true",
        nodeEnv: "production",
        appUrl: "http://localhost:3000",
        supabaseUrl: "http://127.0.0.1:54321",
        mailboxUrl: "http://127.0.0.1:54324",
      })
    ).toThrow(/NODE_ENV is set to 'production'/);
  });

  it("aborts when App URL is hosted or non-loopback", () => {
    expect(() =>
      validateLocalTestEnvironment({
        allowMutationsEnv: "true",
        appUrl: "https://fairswap.in",
        supabaseUrl: "http://127.0.0.1:54321",
        mailboxUrl: "http://127.0.0.1:54324",
      })
    ).toThrow(/App URL 'https:\/\/fairswap.in' is not a verified loopback address/);
  });

  it("aborts when Supabase URL is hosted (.supabase.co)", () => {
    expect(() =>
      validateLocalTestEnvironment({
        allowMutationsEnv: "true",
        appUrl: "http://localhost:3000",
        supabaseUrl: "https://abcdef123.supabase.co",
        mailboxUrl: "http://127.0.0.1:54324",
      })
    ).toThrow(/targets a hosted Supabase project/);
  });

  it("aborts when Mailbox URL is external or non-loopback", () => {
    expect(() =>
      validateLocalTestEnvironment({
        allowMutationsEnv: "true",
        appUrl: "http://localhost:3000",
        supabaseUrl: "http://127.0.0.1:54321",
        mailboxUrl: "https://mailpit.example.com",
      })
    ).toThrow(/Mailbox URL 'https:\/\/mailpit.example.com' is not a verified loopback address/);
  });

  it("succeeds when all targets are confirmed loopback and explicit opt-in is provided", () => {
    const validated = validateLocalTestEnvironment({
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3000",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    });

    expect(validated.appUrl).toBe("http://localhost:3000");
    expect(validated.supabaseUrl).toBe("http://127.0.0.1:54321");
    expect(validated.mailboxUrl).toBe("http://127.0.0.1:54324");
  });

  it("scoped user registry tracks test IDs and deletes ONLY registered IDs during cleanup", async () => {
    testUserRegistry.register("usr-test-1");
    testUserRegistry.register("usr-test-2");

    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-test-1", "usr-test-2"]);

    const deletedIds: string[] = [];
    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async (id: string) => {
            deletedIds.push(id);
            return { data: {}, error: null };
          },
        },
      },
    };

    const targetConfig = {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3000",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, targetConfig);

    expect(outcome.deleted).toEqual(["usr-test-1", "usr-test-2"]);
    expect(deletedIds).toEqual(["usr-test-1", "usr-test-2"]);
    expect(testUserRegistry.getRegisteredIds()).toHaveLength(0);
  });

  it("treats returned result.error as cleanup failure and preserves ID in registry", async () => {
    testUserRegistry.register("usr-fail-1");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => ({
            data: null,
            error: { message: "User not found or deletion failed" },
          }),
        },
      },
    };

    const targetConfig = {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, targetConfig);

    expect(outcome.deleted).toHaveLength(0);
    expect(outcome.failed).toEqual(["usr-fail-1"]);
    // Preserved for reporting/retry
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-fail-1"]);
  });

  it("treats rejected deleteUser promise as cleanup failure and preserves ID in registry", async () => {
    testUserRegistry.register("usr-reject-1");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => {
            throw new Error("Network connection lost");
          },
        },
      },
    };

    const targetConfig = {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, targetConfig);

    expect(outcome.deleted).toHaveLength(0);
    expect(outcome.failed).toEqual(["usr-reject-1"]);
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-reject-1"]);
  });

  it("handles mixed successful and failed IDs: removes successful, preserves failed", async () => {
    testUserRegistry.register("usr-success-1");
    testUserRegistry.register("usr-fail-err");
    testUserRegistry.register("usr-fail-throw");
    testUserRegistry.register("usr-success-2");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async (id: string) => {
            if (id === "usr-fail-err") {
              return { data: null, error: { message: "Database lock" } };
            }
            if (id === "usr-fail-throw") {
              throw new Error("Timeout");
            }
            return { data: {}, error: null };
          },
        },
      },
    };

    const targetConfig = {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, targetConfig);

    expect(outcome.deleted).toEqual(["usr-success-1", "usr-success-2"]);
    expect(outcome.failed).toEqual(["usr-fail-err", "usr-fail-throw"]);
    // Only failed IDs remain in the registry
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-fail-err", "usr-fail-throw"]);
  });

  it("cleanupTrackedUsers aborts if target environment validation fails and does not delete", async () => {
    testUserRegistry.register("usr-test-unsafe");

    let deleteUserCalled = false;
    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => {
            deleteUserCalled = true;
            return { data: {}, error: null };
          },
        },
      },
    };

    // Attempt cleanup against hosted target without opt-in
    await expect(
      testUserRegistry.cleanupTrackedUsers(mockAdmin, {
        allowMutationsEnv: "false",
        supabaseUrl: "https://hosted.supabase.co",
      })
    ).rejects.toThrow(LocalTestGuardError);

    expect(deleteUserCalled).toBe(false);
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-test-unsafe"]);
  });

  it("confirms deletion when response is { error: null } in valid shape", async () => {
    testUserRegistry.register("usr-valid-shape");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => ({ error: null }),
        },
      },
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    });

    expect(outcome.deleted).toEqual(["usr-valid-shape"]);
    expect(outcome.failed).toHaveLength(0);
    expect(testUserRegistry.getRegisteredIds()).toHaveLength(0);
  });

  it("confirms deletion when response is pinned SDK return contract { data: { user: null }, error: null }", async () => {
    testUserRegistry.register("usr-pinned-sdk");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => ({
            data: { user: null },
            error: null,
          }),
        },
      },
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    });

    expect(outcome.deleted).toEqual(["usr-pinned-sdk"]);
    expect(outcome.failed).toHaveLength(0);
    expect(testUserRegistry.getRegisteredIds()).toHaveLength(0);
  });

  it("treats null deleteUser response as cleanup failure", async () => {
    testUserRegistry.register("usr-malformed-null");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => null,
        },
      },
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    });

    expect(outcome.deleted).toHaveLength(0);
    expect(outcome.failed).toEqual(["usr-malformed-null"]);
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-malformed-null"]);
  });

  it("treats undefined deleteUser response as cleanup failure", async () => {
    testUserRegistry.register("usr-malformed-undefined");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => undefined,
        },
      },
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    });

    expect(outcome.deleted).toHaveLength(0);
    expect(outcome.failed).toEqual(["usr-malformed-undefined"]);
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-malformed-undefined"]);
  });

  it("treats empty object {} deleteUser response as cleanup failure", async () => {
    testUserRegistry.register("usr-malformed-empty");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => ({}),
        },
      },
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    });

    expect(outcome.deleted).toHaveLength(0);
    expect(outcome.failed).toEqual(["usr-malformed-empty"]);
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-malformed-empty"]);
  });

  it("treats array deleteUser response as cleanup failure", async () => {
    testUserRegistry.register("usr-malformed-array");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => [{ error: null }],
        },
      },
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    });

    expect(outcome.deleted).toHaveLength(0);
    expect(outcome.failed).toEqual(["usr-malformed-array"]);
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-malformed-array"]);
  });

  it("treats missing error property deleteUser response as cleanup failure", async () => {
    testUserRegistry.register("usr-missing-error");

    const mockAdmin = {
      auth: {
        admin: {
          deleteUser: async () => ({ data: { user: null } }),
        },
      },
    };

    const outcome = await testUserRegistry.cleanupTrackedUsers(mockAdmin, {
      allowMutationsEnv: "true",
      appUrl: "http://localhost:3001",
      supabaseUrl: "http://127.0.0.1:54321",
      mailboxUrl: "http://127.0.0.1:54324",
    });

    expect(outcome.deleted).toHaveLength(0);
    expect(outcome.failed).toEqual(["usr-missing-error"]);
    expect(testUserRegistry.getRegisteredIds()).toEqual(["usr-missing-error"]);
  });
});
