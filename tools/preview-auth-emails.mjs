// Offline, fake-value previews only. Supabase Auth template tokens are never logged.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const repoRoot = process.cwd();
const outDir = path.join(os.tmpdir(), "fairswap-auth-email-previews");
mkdirSync(outDir, { recursive: true });

for (const [file, title] of [
  ["confirm_email.html", "Signup confirmation"],
  ["magic_link.html", "One-time sign-in code"],
]) {
  const source = readFileSync(path.join(repoRoot, "supabase", "templates", file), "utf8");
  const preview = source
    .replaceAll("{{ .SiteURL }}", "https://fairswap.in")
    .replaceAll("{{ .TokenHash }}", "EXAMPLE_HASH_NOT_VALID")
    .replaceAll("{{ .Token }}", "123456");
  const target = path.join(outDir, file);
  writeFileSync(target, preview, "utf8");
  process.stdout.write(`${title}: ${target}\n`);
}
