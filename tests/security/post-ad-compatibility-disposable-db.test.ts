import { readFileSync } from "node:fs";
import { Client, type QueryResult } from "pg";
import { expect, it } from "vitest";

// Explicit opt-in only. The GitHub CI profile accepts the pinned local Supabase
// PG15 port; lab runs continue to require their dedicated loopback ports and
// run marker. No hosted Test/Production session or real MFA proof is claimed.
const enabled = process.env.POST_AD_RUN_LOCAL_DB_TESTS === "true";
it.skipIf(!enabled)("executes real Goods and three-family compatibility assertions in the identified disposable database", async () => {
  const host = process.env.POST_AD_DB_HOST;
  const port = Number(process.env.POST_AD_DB_PORT);
  const runId = process.env.POST_AD_DB_RUN_ID;
  const githubDisposable = process.env.GITHUB_ACTIONS === "true" &&
    process.env.CI === "true" && port === 54322;
  if (!["127.0.0.1", "localhost"].includes(host ?? "") ||
      (![55432, 55442].includes(port) && !githubDisposable)) {
    throw new Error("Only isolated loopback PG15/PG17 ports or CI-gated local Supabase 54322 are allowed");
  }
  if (!runId || !/^post-ad-disposable-[a-zA-Z0-9-]+$/.test(runId)) {
    throw new Error("Unique approved disposable run identity required");
  }
  // Never borrow Supabase/Production/Test credentials or a generic connection URL.
  for (const name of ["DATABASE_URL", "SUPABASE_URL", "STAGING_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_DB_PASSWORD", "SUPABASE_ACCESS_TOKEN", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY", "JWT_SECRET", "PGPASSWORD", "PGHOST", "PGPORT", "PGDATABASE", "PGUSER"]) {
    if (process.env[name]) throw new Error(`Inherited ${name} must be absent from this isolated runner`);
  }
  const client = new Client({ host, port, database: "postgres", user: "postgres", password: "postgres",
    connectionTimeoutMillis: 5000, ssl: false });
  let connected = false;
  try {
    await client.connect();
    connected = true;
    const marker = await client.query(
      "SELECT run_id FROM test_validation_meta.run_identity WHERE run_id=$1 AND task=$2",
      [runId, "POST-AD-DISPOSABLE-DB-VERIFY-01"]);
    expect(marker.rows).toHaveLength(1);
    const version = await client.query("SELECT current_setting('server_version_num')::integer AS version");
    expect(Math.floor(version.rows[0].version / 10000)).toBe(port === 55432 || githubDisposable ? 15 : 17);
    await client.query("SELECT set_config('app.post_ad_test_run_id',$1,false)", [runId]);
    const source = readFileSync("tests/security/sql/post-ad-current-base-compatibility.sql", "utf8");
    const result = await client.query(source);
    const batches: QueryResult[] = Array.isArray(result) ? result : [result];
    const lines = batches.flatMap(batch => batch.rows.flatMap(row => Object.values(row)))
      .filter((value): value is string => typeof value === "string");
    const assertions = lines.filter(line => /^(?:not )?ok \d+\b/.test(line));
    console.info(JSON.stringify({ sqlAssertions: assertions.length,
      passed: assertions.filter(line => /^ok \d+\b/.test(line)).length,
      failed: assertions.filter(line => /^not ok\b/.test(line)).length,
      skipped: assertions.filter(line => /#\s*(?:SKIP|TODO)\b/i.test(line)).length,
      original: assertions.filter(line => !line.includes(' - ADDED ')).length,
      added: assertions.filter(line => line.includes(' - ADDED ')).length,
      plans: lines.filter(line => /^1\.\.\d+$/.test(line)) }));
    expect(assertions.filter(line => !line.includes(' - ADDED '))).toHaveLength(124);
    expect(assertions.filter(line => line.includes(' - ADDED '))).toHaveLength(48);
    expect(lines.filter(line => /^not ok\b/.test(line))).toEqual([]);
    expect(assertions.some(line => /#\s*(?:SKIP|TODO)\b/i.test(line))).toBe(false);
    expect(assertions).toHaveLength(172); // Original 124 + 16 ownership assertions per family.
    expect(lines.filter(line => /^1\.\.\d+$/.test(line))).toContain("1..172");
    // SQL source ended with ROLLBACK; no synthetic auth/listing/queue/outbox persists.
    const ended = await client.query("SELECT to_regclass('pg_temp.pc_ids') AS fixture");
    expect(ended.rows[0].fixture).toBeNull();
  } finally {
    try {
      if (connected) await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  }
}, 120_000);
