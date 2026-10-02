import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("authentication account-enumeration safeguards", () => {
  const authActions = fs
    .readFileSync(path.join(process.cwd(), "src/app/auth/actions.ts"), "utf8")
    .replace(/\\'/g, "'").replace(/\r\n/g, "\n");

  it("keeps sign-in failures generic and non-enumerating", () => {
    expect(authActions).toContain(
      "We couldn't sign you in with those credentials. Check your email and password and try again."
    );
    expect(authActions).not.toContain("User does not exist");
    expect(authActions).not.toContain("User doesn't exist");
    expect(authActions).not.toContain("Email does not exist");
    expect(authActions).not.toContain("Email doesn't exist");
  });

  it("keeps password recovery responses non-enumerating", () => {
    expect(authActions).toContain(
      "If an account exists with this email, you will receive password reset instructions shortly."
    );
  });
});
