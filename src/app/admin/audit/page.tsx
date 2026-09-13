import { createClient } from "@/lib/supabase/server";

interface AuditLogRecord {
  id: string;
  actor_id: string;
  action: string;
  target_entity: string;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export default async function AdminAuditPage() {
  const supabase = await createClient();

  const { data: auditLogs, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AuditLogRecord[]>();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Security Audit Trail</h1>
        <p className="mt-1 text-sm text-gray-600">
          Append-only immutable record of privileged operations and state mutations.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error.message}
          </div>
        )}

        {(!auditLogs || auditLogs.length === 0) ? (
          <p className="text-sm text-gray-500">No audit log entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase text-gray-500">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Actor ID</th>
                  <th className="py-2">Action</th>
                  <th className="py-2">Target Entity</th>
                  <th className="py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-3 font-mono text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap py-3 font-mono text-xs text-gray-800">
                      {log.actor_id}
                    </td>
                    <td className="whitespace-nowrap py-3">
                      <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-semibold text-gray-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 text-xs text-gray-700">
                      {log.target_entity} {log.target_id ? `(${log.target_id.slice(0, 8)}...)` : ""}
                    </td>
                    <td className="py-3 font-mono text-xs text-gray-600">
                      <pre className="max-w-xs overflow-x-auto text-[11px]">
                        {JSON.stringify(log.details)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
