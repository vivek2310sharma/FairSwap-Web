import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/app/account/support/actions", () => ({
  createSupportTicketAction: mocks.create,
}));

import { CreateTicketDialog } from "@/components/communication/CreateTicketDialog";

const open = (label = "New inquiry") => fireEvent.click(screen.getByRole("button", { name: label }));

describe("CreateTicketDialog", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("offers exactly the canonical database categories", () => {
    render(<CreateTicketDialog />);
    open();

    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    const values = Array.from(select.options).map((o) => o.value).sort();
    expect(values).toEqual(["account", "bug", "general", "moderation_appeal", "safety"]);
    expect(values).not.toContain("listing_issue");
    expect(values).not.toContain("safety_concern");
    expect(values).not.toContain("other");
    expect(select.value).toBe("general");
  });

  it("is an accessible modal dialog with labelled fields and no response-time promise", () => {
    render(<CreateTicketDialog />);
    open();

    const dialog = screen.getByRole("dialog", { name: "Create support ticket" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText("Details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/24[–-]48|typically responds|business hours/i);
  });

  it("moves focus into the dialog, closes on Escape and returns focus to the trigger", () => {
    render(<CreateTicketDialog />);
    const trigger = screen.getByRole("button", { name: "New inquiry" });
    open();

    expect(screen.getByLabelText("Subject")).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("locks suspended accounts to a moderation appeal", () => {
    render(<CreateTicketDialog isSuspended />);
    open("Submit appeal");

    const select = screen.getByLabelText("Category") as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select.value).toBe("moderation_appeal");
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["moderation_appeal"]);
    expect(screen.getByRole("dialog", { name: "Submit moderation appeal" })).toBeInTheDocument();
  });

  it("validates minimum lengths with an alert before calling the server", async () => {
    render(<CreateTicketDialog />);
    open();

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Hi" } });
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "Short" } });
    fireEvent.submit(screen.getByRole("button", { name: "Submit ticket" }).closest("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("Subject must be at least 5 characters");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("submits the chosen canonical category and opens the created ticket", async () => {
    mocks.create.mockResolvedValue({ success: true, ticketId: "ticket-1" });
    render(<CreateTicketDialog />);
    open();

    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "bug" } });
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Page shows an error" } });
    fireEvent.change(screen.getByLabelText("Details"), {
      target: { value: "The search page throws an error on mobile." },
    });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit ticket" }).closest("form")!);
    });

    expect(mocks.create).toHaveBeenCalledWith({
      category: "bug",
      subject: "Page shows an error",
      message: "The search page throws an error on mobile.",
    });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/account/support/ticket-1"));
  });

  it("shows server errors in an alert and keeps the dialog open", async () => {
    mocks.create.mockResolvedValue({ error: "You have reached the limit of 3 support tickets in 24 hours." });
    render(<CreateTicketDialog />);
    open();

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Need some help" } });
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "I need help with my account." } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit ticket" }).closest("form")!);
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("limit of 3 support tickets");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("recovers from a network failure and shows a loading state while submitting", async () => {
    let reject: (reason: Error) => void = () => {};
    mocks.create.mockReturnValue(new Promise((_, rej) => (reject = rej)));
    render(<CreateTicketDialog />);
    open();

    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Need some help" } });
    fireEvent.change(screen.getByLabelText("Details"), { target: { value: "I need help with my account." } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Submit ticket" }).closest("form")!);
    });

    expect(screen.getByRole("button", { name: /Submitting/ })).toBeDisabled();
    await act(async () => {
      reject(new Error("fetch failed"));
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Network problem");
    expect(screen.getByRole("button", { name: "Submit ticket" })).toBeEnabled();
  });
});
