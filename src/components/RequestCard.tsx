"use client";

import { useState } from "react";
import {
  ProductRequest,
  StatusHistoryEntry,
  RequestAttachment,
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

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentChip({ attachment }: { attachment: RequestAttachment }) {
  const isImage = attachment.file_type?.startsWith("image/");

  if (isImage && attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-14 h-14 rounded-lg overflow-hidden border border-border flex-shrink-0"
        title={attachment.file_name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.file_name}
          className="w-full h-full object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 bg-bg border border-border rounded-lg px-2.5 py-1.5 text-xs text-ink hover:border-accent transition-colors flex-shrink-0"
    >
      <span>📄</span>
      <span className="truncate max-w-[120px]">{attachment.file_name}</span>
      <span className="text-ink-muted">{formatBytes(attachment.file_size)}</span>
    </a>
  );
}

export default function RequestCard({
  request,
  history,
  attachments = [],
}: {
  request: ProductRequest;
  history: StatusHistoryEntry[];
  attachments?: RequestAttachment[];
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

      {attachments.length > 0 && (
        <div className="flex items-center gap-2 mt-3 overflow-x-auto">
          {attachments.map((a) => (
            <AttachmentChip key={a.id} attachment={a} />
          ))}
        </div>
      )}

      {request.eta_label && (
        <p className="text-xs text-accent mt-3">
          Expected: {request.eta_label}
        </p>
      )}

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
              <div key={h.id} className="flex items-start gap-3 text-xs">
                <span className="text-ink-muted ticket-id w-24 flex-shrink-0 pt-0.5">
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
                  {h.note && (
                    <span className="block text-ink-muted mt-0.5">{h.note}</span>
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
