import { redirect } from "next/navigation";
import { AccountPageShell } from "@/components/account/AccountPageShell";
import { createClient } from "@/lib/supabase/server";
import { type PrivacyRequest } from "@/types/account";
import PrivacyForm from "./privacy-form";

export default async function PrivacyPage() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    redirect("/auth/sign-in?next=/account/privacy");
  }

  const { data: requests } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("requested_at", { ascending: false })
    .returns<PrivacyRequest[]>();

  return (
    <AccountPageShell
      title="Privacy & Data Rights"
      description="Submit data export or account deletion requests under platform policy."
      width="lg"
    >
      <div className="space-y-8">
        {/* Request Submission Form */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Submit a Privacy Request</h2>
          <p className="mt-1 text-sm text-muted">
            Select the type of request. Submissions are limited to 3 requests per 30-day window.
          </p>

          <div className="mt-3 rounded-lg border border-border bg-action-50 p-3 text-xs text-action-900 dark:bg-action-900/30 dark:text-action-100">
            <span className="font-semibold">Privacy Rights Active:</span> Data exports are generated as structured JSON
            containing your account profile, ads, and messages. Account deletions permanently remove your Auth credentials
            and anonymize marketplace history.
          </div>

          <PrivacyForm />
        </div>

        {/* Request History Table */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground">Request History</h2>
          <p className="mt-1 text-xs text-muted">Records of your previous privacy requests</p>

          {(!requests || requests.length === 0) ? (
            <p className="mt-4 text-sm text-muted">No privacy requests submitted yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-sm">
                <thead>
                  <tr className="text-xs font-semibold uppercase text-muted">
                    <th className="py-2">Type</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Requested At</th>
                    <th className="py-2">Download / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req) => (
                    <tr key={req.id}>
                      <td className="py-3 font-medium text-foreground">
                        {req.request_type === "export_data" ? "Data Export" : "Account Deletion"}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            (req.status as string) === "resolved" || (req.status as string) === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                              : (req.status as string) === "rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                              : (req.status as string) === "in_progress" || (req.status as string) === "processing"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td className="py-3 text-muted">
                        {new Date(req.requested_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-xs">
                        {req.request_type === "export_data" &&
                        ((req.status as string) === "pending" ||
                          (req.status as string) === "resolved" ||
                          (req.status as string) === "completed") ? (
                          <a
                            href={`/api/privacy/export/${req.id}`}
                            className="inline-flex items-center gap-1 font-semibold text-action-700 hover:underline dark:text-action-300"
                          >
                            {(req.status as string) === "pending"
                              ? "Generate & Download Export (JSON)"
                              : "Download Export (JSON)"}
                          </a>
                        ) : (
                          <span className="text-muted">{req.resolution_notes || "—"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AccountPageShell>
  );
}
