"use client";

import { useState } from "react";
import {
  ProductRequest,
  StatusHistoryEntry,
  RequestAttachment,
  STATUS_LABELS,
  TYPE_LABELS,
  URGENCY_LABELS,
  RATING_CONFIG,
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
  const [tab, setTab] = useState<"timeline" | "prd">("timeline");

  const hasPRD = !!(
    request.prd_problem_statement ||
    (request.prd_user_stories && request.prd_user_stories.length > 0)
  );

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
            {hasPRD && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent-soft text-accent">
                ✦ PRD
              </span>
            )}
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

      {request.rating && (
        <div
          className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-xs font-medium border ${RATING_CONFIG[request.rating].text} ${RATING_CONFIG[request.rating].bg} ${RATING_CONFIG[request.rating].border}`}
        >
          <span>{RATING_CONFIG[request.rating].emoji}</span>
          <span>Product team: {RATING_CONFIG[request.rating].caption}</span>
        </div>
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
          {expanded ? "Collapse ↑" : hasPRD ? "View PRD & timeline ↓" : "View timeline ↓"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border">
          {/* Tabs */}
          {hasPRD && (
            <div className="flex gap-1 mb-4 bg-bg rounded-lg p-1 w-fit">
              <button
                onClick={() => setTab("timeline")}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                  tab === "timeline"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setTab("prd")}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                  tab === "prd"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <span className="text-accent">✦</span> PRD
              </button>
            </div>
          )}

          {/* Timeline tab */}
          {(!hasPRD || tab === "timeline") && (
            <div className="space-y-2.5">
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

          {/* PRD tab */}
          {hasPRD && tab === "prd" && (
            <div className="space-y-4 text-sm">
              {request.prd_problem_statement && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                    Problem Statement
                  </p>
                  <p className="text-ink leading-relaxed">{request.prd_problem_statement}</p>
                </div>
              )}

              {request.prd_user_stories && request.prd_user_stories.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                    User Stories
                  </p>
                  <div className="space-y-1.5">
                    {request.prd_user_stories.map((story, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-accent font-bold mt-0.5 flex-shrink-0">→</span>
                        <span className="text-ink leading-relaxed">{story}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.prd_acceptance_criteria && request.prd_acceptance_criteria.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
                    Acceptance Criteria
                  </p>
                  <div className="space-y-1.5">
                    {request.prd_acceptance_criteria.map((criterion, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-status-deployed font-bold mt-0.5 flex-shrink-0">✓</span>
                        <span className="text-ink leading-relaxed">{criterion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.prd_success_metrics && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                    Success Metrics
                  </p>
                  <p className="text-ink leading-relaxed">{request.prd_success_metrics}</p>
                </div>
              )}

              {request.prd_affected_teams && request.prd_affected_teams.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                    Affected Teams
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {request.prd_affected_teams.map((team) => (
                      <span
                        key={team}
                        className="text-xs px-2 py-0.5 bg-accent-soft text-accent rounded-full font-medium"
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {request.prd_additional_notes && (
                <div className="bg-bg rounded-lg px-4 py-3 border border-border">
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
                    Additional Notes
                  </p>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    {request.prd_additional_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
