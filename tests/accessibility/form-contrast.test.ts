import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Light Form Controls Dark-Mode Contrast Invariant", () => {
  const formFiles = [
    "src/app/auth/sign-in/page.tsx",
    "src/app/auth/sign-up/page.tsx",
    "src/app/auth/forgot-password/page.tsx",
    "src/components/auth/PasswordInput.tsx",
    // Profile editor inputs use theme tokens (text-foreground / bg-card) that follow dark mode.
  ];

  it.each(formFiles)("%s explicitly provides readable text-gray-900 and bg-white on text inputs", (filePath) => {
    const fullPath = path.resolve(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, "utf-8");

    // Extract all className strings from input / textarea elements (multiline JSX aware)
    const inputMatches = content.match(/<(?:input|textarea)[\s\S]*?className=["']([^"']+)["']/g) || [];
    expect(inputMatches.length).toBeGreaterThan(0);

    for (const match of inputMatches) {
      // Ignore hidden inputs and checkboxes/radios which have dedicated visual tokens
      if (match.includes('type="hidden"') || match.includes('type="checkbox"') || match.includes('type="radio"')) {
        continue;
      }
      expect(match).toContain("text-gray-900");
      expect(match).toContain("bg-white");
      expect(match).toContain("placeholder:text-gray-500");
    }
  });

  it("verifies sign-in page includes neutral confirm_continue message handler", () => {
    const signInPath = path.resolve(process.cwd(), "src/app/auth/sign-in/page.tsx");
    const content = fs.readFileSync(signInPath, "utf-8");

    expect(content).toContain('messageParam === "confirm_continue"');
    expect(content).toContain("Please sign in to continue. If you have just confirmed your email, your account is ready to use.");
    expect(content).toContain('errorParam === "invalid_token"');
  });
});
