#!/usr/bin/env node
/**
 * Fail-closed link and obsolete-starter-gate verification for ACTIVE documents.
 *
 * Historical milestone plans/incident records remain append-only and may
 * reference evidence artifacts stored outside Git. See docs/README.md.
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACTIVE_GATES = [
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
// Audit every committed Markdown file, including source READMEs and dated archives.
// Only the canonical active guides are checked for retired starter phase gates.
const MARKDOWN_FILES = execFileSync("git", ["ls-files", "-z"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 5 * 1024 * 1024,
}).split("\0").filter((name) => /\.mdx?$/i.test(name));
if (!MARKDOWN_FILES.length) problems.push("no tracked Markdown documents found");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

for (const file of MARKDOWN_FILES) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) {
    problems.push(file + ": missing active document");
    continue;
  }
  const content = read(file);
  // Match destinations outside Markdown code fences; preserve dated local-only
  // evidence *paths* (not clickable links) without inventing missing files.
  let fenceCharacter = null;
  for (const chunk of content.split("\n")) {
    const marker = chunk.trimStart().match(/^(`{3,}|~{3,})/);
    if (marker) {
      const markerCharacter = marker[1][0];
      if (fenceCharacter === null) fenceCharacter = markerCharacter;
      else if (fenceCharacter === markerCharacter) fenceCharacter = null;
      continue;
    }
    if (fenceCharacter !== null) continue;
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
  if (ACTIVE_GATES.includes(file)) {
    for (const rule of BANNED) {
      if (rule.test(content)) problems.push(file + ": retired milestone gate still present (" + rule.source + ")");
    }
  }
}

if (problems.length) {
  for (const problem of problems) process.stderr.write("docs:check: " + problem + "\n");
  process.stderr.write("Documentation validation failed: " + problems.length + " issue(s).\n");
  process.exitCode = 1;
} else {
  process.stdout.write("docs:check PASS — " + MARKDOWN_FILES.length + " tracked Markdown documents have valid local links; " + ACTIVE_GATES.length + " active guides have no retired milestone gates.\n");
}
