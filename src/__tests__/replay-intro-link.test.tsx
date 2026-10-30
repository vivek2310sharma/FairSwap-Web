import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReplayIntroLink } from "@/components/home/ReplayIntroLink";
import { REPLAY_INTRO_EVENT } from "@/lib/home-intro/session";

describe("ReplayIntroLink", () => {
  it("dispatches a manual replay without editing session eligibility", () => {
    const listener = vi.fn();
    window.addEventListener(REPLAY_INTRO_EVENT, listener);
    sessionStorage.setItem("intro-seen-test", "seen");
    render(<ReplayIntroLink />);
    fireEvent.click(screen.getByRole("button", { name: "Replay FairSwap introduction" }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("intro-seen-test")).toBe("seen");
    window.removeEventListener(REPLAY_INTRO_EVENT, listener);
    sessionStorage.removeItem("intro-seen-test");
  });
});