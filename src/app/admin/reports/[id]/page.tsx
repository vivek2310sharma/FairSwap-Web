import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReportResolutionForm } from "@/components/communication/ReportResolutionForm";
import { ChevronLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

interface MessageEvidenceItem {
  id: string;
  sender_name?: string;
  content: string;
  created_at: string;
}

interface ListingDetailSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  price_paise: number | null;
  seller_id: string | null;
}

interface UserDetailSummary {
  id: string;
  display_name: string;
  account_status: string;
  created_at: string;
}

export const metadata: Metadata = {
  title: "Report Details — FairSwap Admin",
  description: "Investigate and resolve reported content.",
};

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: reportId } = await params;
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect(`/auth/sign-in?next=/admin/reports/${reportId}`);
  }

  // Verify staff role
  const { data: staffData } = await supabase
    .from("staff_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  if (!staffData || !["administrator", "moderator"].includes(staffData.role)) {
    redirect("/admin");
  }

  // Fetch report
  const { data: report, error } = await supabase
    .from("reports")
    .select(`
      id,
      reporter_id,
      target_type,
      target_id,
      reason,
      details,
      status,
      action_taken,
      resolution_notes,
      resolved_by,
      resolved_at,
      created_at,
      resolver:profiles!reports_resolved_by_fkey (
        id,
        display_name
      )
    `)
    .eq("id", reportId)
    .single();

  if (error || !report) {
    notFound();
  }

  // If target_type is 'message', fetch bounded evidence via privileged case-scoped RPC
  let messageEvidence: MessageEvidenceItem[] | null = null;
  if (report.target_type === "message") {
    const { data: evData } = await supabase.rpc("admin_get_report_evidence", {
      report_id: report.id,
    });
    messageEvidence = (evData as unknown as MessageEvidenceItem[]) || null;
  }

  // If target_type is 'listing', fetch listing details
  let listingDetails: ListingDetailSummary | null = null;
  if (report.target_type === "listing") {
    const { data: lData } = await supabase
      .from("listings")
      .select("id, title, slug, status, price_paise, seller_id")
      .eq("id", report.target_id)
      .single();
    listingDetails = (lData as unknown as ListingDetailSummary) || null;
  }

  // If target_type is 'user', fetch profile details
  let userDetails: UserDetailSummary | null = null;
  if (report.target_type === "user") {
    const { data: uData } = await supabase
      .from("profiles")
      .select("id, display_name, account_status, created_at")
      .eq("id", report.target_id)
      .single();
    userDetails = (uData as unknown as UserDetailSummary) || null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/admin/reports"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Reports Queue
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 cols: Details & Evidence */}
        <div className="space-y-6 lg:col-span-2">
          {/* Report Overview Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                  {report.target_type} Report
                </span>
                <span className="font-mono text-xs text-gray-500">
                  ID: {report.id}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                Filed {new Date(report.created_at).toLocaleString()}
              </span>
            </div>

            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Reason & Category
              </h3>
              <p className="mt-1 text-base font-semibold capitalize text-gray-900">
                {report.reason.replace("_", " ")}
              </p>
            </div>

            {report.details && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Reporter Statement
                </h3>
                <div className="mt-1 rounded-md bg-gray-50 p-3 text-sm text-gray-700 border border-gray-100">
                  {report.details}
                </div>
              </div>
            )}
          </div>

          {/* Target Metadata Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Reported Target Metadata</h2>

            {report.target_type === "listing" && (
              <div className="mt-4 space-y-3">
                {listingDetails ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {listingDetails.title}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 uppercase">
                        {listingDetails.status}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>Listing ID: {listingDetails.id}</span>
                      <span>Seller ID: {listingDetails.seller_id}</span>
                    </div>
                    <div className="mt-3">
                      <Link
                        href={`/listings/${listingDetails.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        <span>View Public Listing</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Listing ID: {report.target_id} (not found or already deleted)
                  </p>
                )}
              </div>
            )}

            {report.target_type === "user" && (
              <div className="mt-4 space-y-3">
                {userDetails ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">
                        {userDetails.display_name}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 uppercase">
                        Status: {userDetails.account_status}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      User ID: {userDetails.id}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    User ID: {report.target_id} (not found or deleted)
                  </p>
                )}
              </div>
            )}

            {report.target_type === "message" && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Bounded Evidence Window (Case-Scoped)
                  </span>
                  <span className="text-xs text-emerald-700 font-medium">
                    Audit Logged Access
                  </span>
                </div>

                {messageEvidence && messageEvidence.length > 0 ? (
                  <div className="mt-3 divide-y divide-gray-100 rounded-md border border-gray-200 bg-gray-50 p-4">
                    {messageEvidence.map((m) => {
                      const isTarget = m.id === report.target_id;
                      return (
                        <div
                          key={m.id}
                          className={`py-3 first:pt-0 last:pb-0 ${
                            isTarget ? "bg-amber-50/80 -mx-4 px-4 border-l-4 border-amber-500" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span className="font-semibold text-gray-700">
                              Sender: {m.sender_name || "User"} {isTarget && "(REPORTED MESSAGE)"}
                            </span>
                            <span>{new Date(m.created_at).toLocaleString()}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                            {m.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">
                    Target Message ID: {report.target_id} (Evidence could not be loaded or message was deleted)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 col: Resolution & Actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">Moderation Action</h2>
            <p className="mt-1 text-xs text-gray-500">
              Update report status and log resolution findings.
            </p>

            <div className="mt-4">
              <ReportResolutionForm
                reportId={report.id}
                currentStatus={report.status}
                currentNotes={report.resolution_notes}
              />
            </div>
          </div>

          {report.resolved_at && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-xs text-gray-500 space-y-2">
              <h3 className="font-semibold text-gray-700 uppercase tracking-wider">
                Resolution Audit
              </h3>
              <p>
                Resolved at: {new Date(report.resolved_at).toLocaleString()}
              </p>
              {report.resolver && (
                <p>
                  Staff Member: {Array.isArray(report.resolver) ? (report.resolver[0] as { display_name?: string })?.display_name : (report.resolver as { display_name?: string }).display_name}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
