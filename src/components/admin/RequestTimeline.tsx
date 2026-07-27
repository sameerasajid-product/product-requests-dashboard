"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_LABELS, STATUS_COLORS, RequestStatus } from "@/lib/types";

interface TimelineEntry {
  id: string;
  old_status: RequestStatus | null;
  new_status: RequestStatus;
  note: string | null;
  changed_at: string;
  changed_by_name: string | null;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RequestTimeline({ requestId }: { requestId: string }) {
  const supabase = createClient();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from("status_history")
        .select("id, old_status, new_status, note, changed_at, changed_by:profiles(full_name)")
        .eq("request_id", requestId)
        .order("changed_at", { ascending: true });

      if (cancelled) return;

      const rows = (data ?? []).map((row) => {
        const changedBy = row.changed_by as unknown as { full_name: string | null } | { full_name: string | null }[] | null;
        const name = Array.isArray(changedBy) ? changedBy[0]?.full_name : changedBy?.full_name;
        return {
          id: row.id,
          old_status: row.old_status,
          new_status: row.new_status,
          note: row.note,
          changed_at: row.changed_at,
          changed_by_name: name ?? null,
        };
      });

      setEntries(rows);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [requestId, supabase]);

  if (loading) {
    return <p className="text-xs text-admin-ink-muted">Loading timeline…</p>;
  }

  if (entries.length === 0) {
    return <p className="text-xs text-admin-ink-muted">No history yet.</p>;
  }

  return (
    <div className="space-y-0">
      {entries.map((entry, i) => {
        const colors = STATUS_COLORS[entry.new_status];
        const isLast = i === entries.length - 1;
        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${colors.bg} border-2 ${colors.border}`} />
              {!isLast && <span className="w-px flex-1 bg-admin-border my-0.5" />}
            </div>
            <div className={`pb-4 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-xs font-semibold ${colors.text}`}>{STATUS_LABELS[entry.new_status]}</span>
                {entry.old_status && (
                  <span className="text-[10px] text-admin-ink-muted">
                    (from {STATUS_LABELS[entry.old_status]})
                  </span>
                )}
              </div>
              <p className="text-[10px] text-admin-ink-muted mt-0.5">
                {formatDateTime(entry.changed_at)}
                {entry.changed_by_name && ` · ${entry.changed_by_name}`}
              </p>
              {entry.note && (
                <p className="text-xs text-admin-ink mt-1 bg-admin-bg rounded-lg px-2.5 py-1.5">
                  {entry.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
