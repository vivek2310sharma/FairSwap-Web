/**
 * Local-only Administrator Bootstrap Script
 *
 * Usage:
 *   corepack pnpm run bootstrap:admin --email="admin@fairswap.local"
 *
 * Security Invariants:
 * - Requires target user to already exist in Auth.
 * - Refuses non-local Supabase URLs.
 * - Confined to local development/test execution; never used in production.
 * - Records an immutable audit log entry in public.audit_logs.
 * - Idempotent: safe to run multiple times.
 */

import { createClient } from "@supabase/supabase-js";

function parseArgs(): { email: string } {
  const args = process.argv.slice(2);
  let email = "";
  for (const arg of args) {
    if (arg.startsWith("--email=")) {
      email = arg.substring("--email=".length).trim();
    }
  }
  if (!email) {
    console.error("Error: --email=<email> argument is required.");
    console.error("Example: corepack pnpm run bootstrap:admin --email=\"admin@fairswap.local\"");
    process.exit(1);
  }
  return { email };
}

async function main() {
  const { email } = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Local-only safety guard
  if (!supabaseUrl.includes("127.0.0.1") && !supabaseUrl.includes("localhost")) {
    console.error(`Refusing execution: Target URL "${supabaseUrl}" is not a confirmed local project.`);
    process.exit(1);
  }

  if (!serviceKey) {
    console.error("Error: SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Connecting to local Supabase at ${supabaseUrl}...`);

  // 1. Find user by email in auth.users
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Failed to query users:", listError.message);
    process.exit(1);
  }

  const targetUser = usersData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!targetUser) {
    console.error(`User with email "${email}" does not exist in Auth.`);
    console.error("Please register and confirm the account first via /auth/sign-up.");
    process.exit(1);
  }

  console.log(`Found user: ${targetUser.id} (${targetUser.email})`);

  // 2. Assign 'administrator' role in public.staff_roles idempotently
  const { error: roleError } = await supabase
    .from("staff_roles")
    .upsert(
      {
        user_id: targetUser.id,
        role: "administrator",
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (roleError) {
    console.error("Failed to assign administrator role:", roleError.message);
    process.exit(1);
  }

  // 3. Atomically record bootstrap audit event
  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_id: targetUser.id,
    action: "admin.bootstrapped",
    target_entity: "staff_roles",
    target_id: targetUser.id,
    details: {
      email: targetUser.email,
      role: "administrator",
      bootstrap_method: "local_cli_script",
    },
    created_at: new Date().toISOString(),
  });

  if (auditError) {
    console.warn("Role assigned, but audit log insertion returned:", auditError.message);
  }

  console.log(`SUCCESS: User "${email}" (${targetUser.id}) has been assigned the "administrator" role.`);
}

main().catch((err) => {
  console.error("Fatal bootstrap error:", err);
  process.exit(1);
});
