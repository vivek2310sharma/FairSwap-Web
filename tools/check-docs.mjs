#!/usr/bin/env node
/**
 * Fail-closed link and obsolete-starter-gate verification for ACTIVE documents.
 *
 * Historical milestone plans/incident records remain append-only and may
 * reference evidence artifacts stored outside Git. See docs/README.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTIVE = [
  "README.md",
  "CONTRIBUTING.md",
  "START_HERE.md",
  "docs/CURRENT_STATE.md",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/WORKFLOW.md",
  "docs/VERIFICATION.md",
  ".agents/rules/fairswap.md",
];
const BANNED = [
  /\bphase\s*2\s+(?:remains\s+)?(?:\*\*)?\s*not\s+(?:started|authorized)\b/i,
  /\binitial action:\s*plan only for (?:milestone )?1\.1\b/i,
  /\byour next step is the planning-only kickoff\b/i,
];
const problems = [];
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

for (const file of ACTIVE) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) {
    problems.push(file + ": missing active document");
    continue;
  }
  const content = read(file);
  const chunks = content.split(/(`{3,})/); // fence delimiters
  // Match Markdown link destinations outside fenced examples.
  let fenced = false;
  for (const chunk of chunks) {
    if (/^`{3,}$/.test(chunk)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const pattern = /\[[^\]\n]+\]\((<[^>\n]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
    for (const [, destination] of chunk.matchAll(pattern)) {
      let dest = destination.replace(/^<|>$/g, "");
      if (/^(?:https?:|mailto:|tel:|#|\/|data:)/i.test(dest)) continue;
      dest = dest.split("#")[0].split("?")[0];
      if (!dest) continue;
      try {
        dest = decodeURIComponent(dest);
      } catch {
        problems.push(file + ": malformed encoded link: " + destination);
        continue;
      }
      const target = path.resolve(path.dirname(source), dest);
      if (target !== root && !target.startsWith(root + path.sep)) {
        problems.push(file + ": escapes repository: " + destination);
      } else if (!fs.existsSync(target)) {
        problems.push(file + ": missing link target: " + destination);
      }
    }
  }
  for (const rule of BANNED) {
    if (rule.test(content)) problems.push(file + ": retired milestone gate still present (" + rule.source + ")");
  }
}

if (problems.length) {
  for (const problem of problems) process.stderr.write("docs:check: " + problem + "\n");
  process.stderr.write("Documentation validation failed: " + problems.length + " issue(s).\n");
  process.exitCode = 1;
} else {
  process.stdout.write("docs:check PASS — " + ACTIVE.length + " active documents have valid local links and no retired milestone gates.\n");
}
