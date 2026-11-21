"use client";

import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

interface AuditEventsTableProps {
  auditEvents: any[];
}

export function AuditEventsTable({ auditEvents }: AuditEventsTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-line">
        <h3 className="font-semibold text-ink text-base">Platform Audit Events</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-ink">
          <thead className="bg-canvas uppercase tracking-wider text-subtle border-b border-line">
            <tr>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Resource</th>
              <th className="px-5 py-3">Decision</th>
              <th className="px-5 py-3">Actor ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-mono">
            {auditEvents.map((ev) => (
              <tr key={ev.id} className="hover:bg-elevated/40 transition">
                <td className="px-5 py-3 text-muted">{formatDateTime(ev.created_at)}</td>
                <td className="px-5 py-3 text-accent font-semibold">{ev.action}</td>
                <td className="px-5 py-3 text-ink">
                  {ev.resource_type}:{ev.resource_id.slice(0, 8)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      ev.decision === "allowed"
                        ? "bg-success/10 text-success border border-success/30"
                        : "bg-danger/10 text-danger border border-danger/30"
                    }`}
                  >
                    {ev.decision}
                  </span>
                </td>
                <td className="px-5 py-3 text-subtle">{ev.actor_id ? ev.actor_id.slice(0, 8) : "system"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
