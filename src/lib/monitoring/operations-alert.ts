export type OperationsEmailAlert = {
  severity: "warning" | "error";
  eventType: string;
  emailId: string;
  providerEventId: string;
  occurredAt: string;
  bounceType?: string;
  bounceSubtype?: string;
};

export type OperationsAlertResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "invalid_url" | "delivery_failed" | "timeout";
      status?: number;
    };

const ALERT_TIMEOUT_MS = 5_000;

function buildAlertText(alert: OperationsEmailAlert): string {
  const bounce =
    alert.bounceType || alert.bounceSubtype
      ? ` bounce=${[alert.bounceType, alert.bounceSubtype].filter(Boolean).join("/")}`
      : "";

  return [
    "[FairSwap]",
    `Resend ${alert.eventType}`,
    `severity=${alert.severity}`,
    `email_id=${alert.emailId}`,
    `provider_event_id=${alert.providerEventId}`,
    `occurred_at=${alert.occurredAt}${bounce}`,
  ].join(" ");
}

/**
 * Sends a minimal, non-PII operational alert to the configured webhook sink.
 *
 * The outbound webhook URL is a server-only secret. Event payloads intentionally
 * omit recipient addresses, subjects, message bodies, and provider error text.
 */
export async function sendOperationsEmailAlert(
  alert: OperationsEmailAlert
): Promise<OperationsAlertResult> {
  return sendOperationsTextAlert(buildAlertText(alert));
}

export async function sendOperationsTextAlert(text: string): Promise<OperationsAlertResult> {
  const rawUrl = process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim();
  if (!rawUrl) {
    return { ok: false, reason: "not_configured" };
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "invalid_url" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ALERT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: "delivery_failed", status: response.status };
    }

    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "delivery_failed" };
  } finally {
    clearTimeout(timeout);
  }
}
