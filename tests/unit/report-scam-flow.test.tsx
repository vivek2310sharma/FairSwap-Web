import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createFakeSupabase } from "../helpers/fake-supabase";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  push: vi.fn(),
  submit: vi.fn(),
  redirect: vi.fn((target: string): never => {
    throw new Error(`REDIRECT:${target}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));
vi.mock("@/components/footer", () => ({ Footer: () => null }));
vi.mock("@/app/account/support/report-scam/actions", () => ({
  submitScamReportAction: mocks.submit,
}));

import ReportScamPage from "@/app/account/support/report-scam/page";
import { ReportScamForm } from "@/app/account/support/report-scam/report-scam-form";

function pageScenario(status: string | null, user: { id: string } | null = { id: "user-1" }) {
  const fake = createFakeSupabase({
    user,
    tables: {
      user_accounts:
        status === null
          ? { data: null, error: { message: "fail" } }
          : { data: { account_status: status } },
    },
  });
  mocks.createClient.mockResolvedValue(fake.client);
  return fake;
}

describe("Report a scam page", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("requires authentication and preserves the return path", async () => {
    pageScenario("active", null);
    await expect(ReportScamPage()).rejects.toThrow(
      "REDIRECT:/auth/sign-in?next=/account/support/report-scam"
    );
  });

  it("shows the form for active accounts and states what the report actually is", async () => {
    const fake = pageScenario("active");
    render(await ReportScamPage());

    expect(screen.getByRole("heading", { level: 1, name: "Report a scam" })).toBeInTheDocument();
    expect(screen.getByLabelText("Short summary")).toBeInTheDocument();
    expect(screen.getByLabelText("What happened?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit report" })).toBeInTheDocument();
    expect(screen.getByText(/safety support ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/not a police complaint/i)).toBeInTheDocument();
    expect(screen.getByText(/1930/)).toBeInTheDocument();

    const query = fake.queries.find((q) => q.table === "user_accounts");
    expect(query?.eq).toContainEqual(["user_id", "user-1"]);
  });

  it("makes no unverified response-time promise", async () => {
    pageScenario("active");
    const { container } = render(await ReportScamPage());
    expect(container.textContent).not.toMatch(/within \d+|24 hours|48 hours|business (days|hours)|guarantee/i);
  });

  it("blocks suspended accounts and points them to appeals", async () => {
    pageScenario("suspended");
    render(await ReportScamPage());

    expect(screen.queryByRole("button", { name: "Submit report" })).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("only moderation appeals");
  });

  it("blocks deletion-pending, deleted and unverifiable accounts", async () => {
    for (const status of ["deletion_pending", "deleted", null]) {
      pageScenario(status);
      const view = render(await ReportScamPage());
      expect(screen.queryByRole("button", { name: "Submit report" }), String(status)).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent("Reporting is unavailable");
      view.unmount();
    }
  });
});

describe("Report a scam form", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  const fill = () => {
    fireEvent.change(screen.getByLabelText("Short summary"), { target: { value: "Fake courier link" } });
    fireEvent.change(screen.getByLabelText("What happened?"), {
      target: { value: "A buyer sent a courier link asking me to pay a delivery fee." },
    });
  };

  it("has labelled, constrained fields and no category control", () => {
    const { container } = render(<ReportScamForm />);

    const subject = screen.getByLabelText("Short summary");
    expect(subject).toHaveAttribute("maxlength", "150");
    expect(subject).toBeRequired();
    const message = screen.getByLabelText("What happened?");
    expect(message).toHaveAttribute("maxlength", "3000");
    expect(message).toHaveAttribute("minlength", "20");
    expect(container.querySelector('[name="category"]')).toBeNull();
    expect(container.querySelector("select")).toBeNull();
    expect(screen.getByRole("button", { name: "Submit report" }).className).toContain("min-h-[44px]");
  });

  it("shows success only after the action succeeds, then opens the submitted ticket", async () => {
    mocks.submit.mockResolvedValue({
      success: true,
      ticketId: "9b2f6f1e-1234-4abc-8def-0123456789ab",
      redirectTo: "/account/support/9b2f6f1e-1234-4abc-8def-0123456789ab",
    });
    render(<ReportScamForm />);
    expect(screen.queryByText("Report submitted")).toBeNull();

    fill();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit report" }).closest("form")!);
    });

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Report submitted"));
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/account/support/9b2f6f1e-1234-4abc-8def-0123456789ab")
    );
    const formData = mocks.submit.mock.calls[0][1] as FormData;
    expect(formData.get("subject")).toBe("Fake courier link");
    expect(formData.has("category")).toBe(false);
  });

  it("shows the server error, no success state and no redirect on failure", async () => {
    mocks.submit.mockResolvedValue({
      error: "You have reached the limit of 3 support tickets in 24 hours. Please try again later.",
    });
    render(<ReportScamForm />);

    fill();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit report" }).closest("form")!);
    });

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("limit of 3 support tickets"));
    expect(screen.queryByText("Report submitted")).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled();
    // The form stays available so the user can retry.
    expect(screen.getByRole("button", { name: "Submit report" })).toBeEnabled();
  });

  it("disables the submit button and shows progress while pending", async () => {
    let resolveAction: (value: unknown) => void = () => {};
    mocks.submit.mockReturnValue(new Promise((resolve) => (resolveAction = resolve)));
    render(<ReportScamForm />);

    fill();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit report" }).closest("form")!);
    });

    expect(await screen.findByRole("button", { name: /Submitting/ })).toBeDisabled();
    await act(async () => {
      resolveAction({ error: "Try again" });
    });
  });

  it("follows a sign-in redirect returned by the server", async () => {
    mocks.submit.mockResolvedValue({
      error: "Please sign in to report a scam.",
      redirectTo: "/auth/sign-in?next=%2Faccount%2Fsupport%2Freport-scam",
    });
    render(<ReportScamForm />);

    fill();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit report" }).closest("form")!);
    });

    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/auth/sign-in?next=%2Faccount%2Fsupport%2Freport-scam")
    );
  });

  it("never shows the success confirmation unless the server returned a ticket id", async () => {
    mocks.submit.mockResolvedValue({ success: true, redirectTo: "/account/support" });
    render(<ReportScamForm />);

    fill();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit report" }).closest("form")!);
    });

    expect(screen.queryByText("Report submitted")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("explains an uncertain outcome, links to the ticket list and does not redirect to a ticket", async () => {
    mocks.submit.mockResolvedValue({
      error: "We could not confirm that your report was submitted. Please check your tickets in Help & safety before trying again, so you do not send it twice.",
      uncertain: true,
    });
    render(<ReportScamForm />);

    fill();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit report" }).closest("form")!);
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not confirm your report");
    expect(alert).toHaveTextContent("before trying again");
    expect(screen.getByRole("link", { name: "Check my tickets" })).toHaveAttribute("href", "/account/support");
    expect(screen.queryByText("Report submitted")).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("treats a rejected server-action call (dropped connection) as an uncertain outcome", async () => {
    mocks.submit.mockRejectedValue(new Error("Failed to fetch"));
    render(<ReportScamForm />);

    fill();
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit report" }).closest("form")!);
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We could not confirm your report");
    expect(alert).not.toHaveTextContent("Failed to fetch");
    expect(screen.queryByText("Report submitted")).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
