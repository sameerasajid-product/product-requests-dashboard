"use client";

import { useState } from "react";
import {
  ProductRequest,
  StatusHistoryEntry,
  STATUS_LABELS,
  TYPE_LABELS,
  URGENCY_LABELS,
} from "@/lib/types";
import StatusBadge from "./StatusBadge";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RequestCard({
  request,
  history,
}: {
  request: ProductRequest;
  history: StatusHistoryEntry[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="ticket-id text-xs text-ink-muted">
              PR-{String(request.ticket_number).padStart(4, "0")}
            </span>
            <span className="text-xs text-ink-muted">
              · {TYPE_LABELS[request.type]} · {URGENCY_LABELS[request.urgency]} urgency
            </span>
          </div>
          <h3 className="text-base font-medium text-ink truncate">
            {request.title}
          </h3>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <p className="text-sm text-ink-muted mt-2 line-clamp-2">
        {request.description}
      </p>

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-ink-muted">
          Submitted {formatDate(request.created_at)}
          {request.sprint_name ? ` · ${request.sprint_name}` : ""}
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-accent"
        >
          {expanded ? "Hide timeline" : "View timeline"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-2.5">
          {history.length === 0 ? (
            <p className="text-xs text-ink-muted">No history yet.</p>
          ) : (
            history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-xs">
                <span className="text-ink-muted ticket-id w-24 flex-shrink-0">
                  {formatDate(h.changed_at)}
                </span>
                <span className="text-ink">
                  {h.old_status ? (
                    <>
                      {STATUS_LABELS[h.old_status]} → {STATUS_LABELS[h.new_status]}
                    </>
                  ) : (
                    <>Request submitted</>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
