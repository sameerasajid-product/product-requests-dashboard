"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ProductRequest,
  RequestStatus,
  RequestRating,
  RequestAttachment,
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
  URGENCY_LABELS,
  RATING_CONFIG,
  RATING_ORDER,
  ETA_OPTIONS,
} from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Word Doc Download ───────────────────────────────────────────────────────
async function downloadPRDasWord(request: ProductRequest) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat, BorderStyle } = await import("docx");

  const ticketId = `PR-${String(request.ticket_number).padStart(4, "0")}`;
  const urgencyMap: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };
  const typeMap: Record<string, string> = { new_feature: "New Feature", enhancement: "Enhancement" };

  const bullet = (text: string) =>
    new Paragraph({
      numbering: { reference: "bullets", level: 0 },
      children: [new TextRun({ text, font: "Arial", size: 22 })],
    });

  const section = (label: string) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 80 },
      children: [new TextRun({ text: label, bold: true, font: "Arial", size: 26, color: "1E3FCB" })],
    });

  const body = (text: string) =>
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text, font: "Arial", size: 22 })],
    });

  const children = [
    // Title
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
      children: [new TextRun({ text: request.title, bold: true, font: "Arial", size: 36, color: "15171C" })],
    }),
    // Meta row
    new Paragraph({
      spacing: { after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "E4E4E0", space: 1 } },
      children: [
        new TextRun({ text: `${ticketId}  ·  `, font: "Arial", size: 20, color: "6B6F76" }),
        new TextRun({ text: typeMap[request.type] ?? request.type, font: "Arial", size: 20, color: "6B6F76" }),
        new TextRun({ text: "  ·  ", font: "Arial", size: 20, color: "6B6F76" }),
        new TextRun({ text: `${urgencyMap[request.urgency] ?? request.urgency} Urgency`, font: "Arial", size: 20, color: "6B6F76" }),
        ...(request.department ? [new TextRun({ text: `  ·  ${request.department}`, font: "Arial", size: 20, color: "6B6F76" })] : []),
        new TextRun({ text: `  ·  Submitted ${new Date(request.created_at).toLocaleDateString()}`, font: "Arial", size: 20, color: "6B6F76" }),
      ],
    }),
    new Paragraph({ children: [] }),

    // Problem Statement
    ...(request.prd_problem_statement ? [
      section("Problem Statement"),
      body(request.prd_problem_statement),
    ] : []),

    // User Stories
    ...(request.prd_user_stories?.length ? [
      section("User Stories"),
      ...request.prd_user_stories.map(bullet),
      new Paragraph({ children: [] }),
    ] : []),

    // Acceptance Criteria
    ...(request.prd_acceptance_criteria?.length ? [
      section("Acceptance Criteria"),
      ...request.prd_acceptance_criteria.map(bullet),
      new Paragraph({ children: [] }),
    ] : []),

    // Success Metrics
    ...(request.prd_success_metrics ? [
      section("Success Metrics"),
      body(request.prd_success_metrics),
    ] : []),

    // Affected Teams
    ...(request.prd_affected_teams?.length ? [
      section("Affected Teams"),
      body(request.prd_affected_teams.join(", ")),
    ] : []),

    // Additional Notes
    ...(request.prd_additional_notes ? [
      section("Additional Notes"),
      body(request.prd_additional_notes),
    ] : []),
  ];

  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      }],
    },
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [{
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${ticketId}-PRD.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Stats Bar ───────────────────────────────────────────────────────────────
function StatsBar({ requests }: { requests: ProductRequest[] }) {
  const counts = useMemo(() => {
    const byStatus: Record<RequestStatus, number> = {
      submitted: 0, in_review: 0, discussion_with_tech: 0,
      in_sprint: 0, deployed: 0, delayed_next_sprint: 0, rejected: 0,
    };
    let highUrgency = 0;
    requests.forEach((r) => {
      byStatus[r.status] += 1;
      if (r.urgency === "high" && r.status !== "deployed" && r.status !== "rejected") highUrgency += 1;
    });
    return { byStatus, highUrgency };
  }, [requests]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
      <div className="bg-admin-surface border border-admin-border rounded-xl px-4 py-3 min-h-[84px] flex flex-col justify-center">
        <p className="text-2xl font-semibold text-admin-ink ticket-id">{requests.length}</p>
        <p className="text-xs text-admin-ink-muted mt-0.5">Total</p>
      </div>
      {STATUS_ORDER.map((status) => {
        const colors = STATUS_COLORS[status];
        return (
          <div key={status} className={`bg-admin-surface border ${colors.border} rounded-xl px-4 py-3 min-h-[84px] flex flex-col justify-center`}>
            <p className={`text-2xl font-semibold ticket-id ${colors.text}`}>{counts.byStatus[status]}</p>
            <p className="text-xs text-admin-ink-muted mt-0.5">{STATUS_LABELS[status]}</p>
          </div>
        );
      })}
      {counts.highUrgency > 0 && (
        <div className="col-span-2 sm:col-span-4 lg:col-span-8 bg-status-delayed-bg border border-status-delayed/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-status-delayed flex-shrink-0" />
          <p className="text-xs text-status-delayed font-medium">
            {counts.highUrgency} high-urgency request{counts.highUrgency > 1 ? "s" : ""} still open
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Request Detail Modal ─────────────────────────────────────────────────────
function RequestModal({
  request,
  attachments,
  onClose,
  onUpdated,
}: {
  request: ProductRequest;
  attachments: RequestAttachment[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [nextStatus, setNextStatus] = useState<RequestStatus>(
    request.status === "submitted" ? "in_review" : request.status
  );
  const [sprintName, setSprintName] = useState(request.sprint_name ?? "");
  const [etaLabel, setEtaLabel] = useState(request.eta_label ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [popupRating, setPopupRating] = useState<RequestRating | null>(null);
  const [downloading, setDownloading] = useState(false);
  const popupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isPending = request.status === "submitted";
  const isRejected = request.status === "rejected";
  const statusOptions = STATUS_ORDER.filter((s) => s !== "submitted");
  const hasPRD = !!(request.prd_problem_statement || request.prd_user_stories?.length);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    return () => { if (popupTimeout.current) clearTimeout(popupTimeout.current); };
  }, []);

  async function callUpdate(payload: Record<string, unknown>) {
    await fetch("/api/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: request.id, ...payload }),
    });
    onUpdated();
  }

  async function handleApprove() {
    setSaving(true);
    await callUpdate({ newStatus: "in_review" });
    setSaving(false);
    onClose();
  }

  async function handleReject() {
    setSaving(true);
    await callUpdate({ newStatus: "rejected", note: rejectReason || undefined });
    setSaving(false);
    onClose();
  }

  async function handleSave() {
    setSaving(true);
    await callUpdate({ newStatus: nextStatus, sprintName: sprintName || null, etaLabel: etaLabel || null, note: note || undefined });
    setSaving(false);
    onClose();
  }

  async function handleRate(rating: RequestRating) {
    if (popupTimeout.current) clearTimeout(popupTimeout.current);
    setPopupRating(rating);
    popupTimeout.current = setTimeout(() => setPopupRating(null), 1200);
    setRatingSaving(true);
    await callUpdate({ rating });
    setRatingSaving(false);
  }

  async function handleDownloadPRD() {
    setDownloading(true);
    try { await downloadPRDasWord(request); } finally { setDownloading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-admin-border px-6 py-4 flex items-start justify-between rounded-t-2xl z-10">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="ticket-id text-xs text-admin-ink-muted">
                PR-{String(request.ticket_number).padStart(4, "0")}
              </span>
              <span className={`text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded ${
                request.urgency === "high" ? "bg-status-delayed-bg text-status-delayed" : "bg-black/5 text-admin-ink-muted"
              }`}>
                {URGENCY_LABELS[request.urgency]}
              </span>
              <span className="text-[10px] bg-black/5 text-admin-ink-muted px-1.5 py-0.5 rounded">
                {TYPE_LABELS[request.type]}
              </span>
              {request.department && (
                <span className="text-[10px] bg-accent-soft text-accent px-1.5 py-0.5 rounded">
                  {request.department}
                </span>
              )}
            </div>
            <h2 className="text-base font-semibold text-admin-ink leading-snug">{request.title}</h2>
            <p className="text-xs text-admin-ink-muted mt-0.5">Submitted {formatDate(request.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-admin-ink-muted hover:text-admin-ink text-xl leading-none flex-shrink-0">✕</button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-admin-ink-muted uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-sm text-admin-ink leading-relaxed">{request.description}</p>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-admin-ink-muted uppercase tracking-wide mb-2">Attachments</p>
              <div className="flex gap-2 flex-wrap">
                {attachments.map((a) => {
                  const isImage = a.file_type?.startsWith("image/");
                  return isImage ? (
                    <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="block w-16 h-16 rounded-lg overflow-hidden border border-admin-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.url} alt={a.file_name} className="w-full h-full object-cover" />
                    </a>
                  ) : (
                    <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-admin-bg border border-admin-border rounded-lg px-3 py-2 text-xs text-admin-ink hover:border-accent transition-colors">
                      📄 {a.file_name}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* PRD Section */}
          {hasPRD && (
            <div className="bg-accent-soft/50 rounded-xl border border-accent/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-accent uppercase tracking-wide">✦ AI-Generated PRD</p>
                <button
                  onClick={handleDownloadPRD}
                  disabled={downloading}
                  className="flex items-center gap-1.5 text-xs font-medium text-accent bg-white border border-accent/30 px-3 py-1.5 rounded-lg hover:bg-accent hover:text-white transition-all disabled:opacity-60"
                >
                  {downloading ? "Generating…" : "⬇ Download .docx"}
                </button>
              </div>

              {request.prd_problem_statement && (
                <div>
                  <p className="text-[10px] font-semibold text-admin-ink-muted uppercase tracking-wide mb-1">Problem Statement</p>
                  <p className="text-sm text-admin-ink leading-relaxed">{request.prd_problem_statement}</p>
                </div>
              )}

              {request.prd_user_stories?.length && (
                <div>
                  <p className="text-[10px] font-semibold text-admin-ink-muted uppercase tracking-wide mb-1.5">User Stories</p>
                  <div className="space-y-1">
                    {request.prd_user_stories.map((s, i) => (
                      <div key={i} className="flex gap-2 text-sm text-admin-ink">
                        <span className="text-accent font-bold flex-shrink-0">→</span>
                        <span className="leading-relaxed">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.prd_acceptance_criteria?.length && (
                <div>
                  <p className="text-[10px] font-semibold text-admin-ink-muted uppercase tracking-wide mb-1.5">Acceptance Criteria</p>
                  <div className="space-y-1">
                    {request.prd_acceptance_criteria.map((c, i) => (
                      <div key={i} className="flex gap-2 text-sm text-admin-ink">
                        <span className="text-status-deployed font-bold flex-shrink-0">✓</span>
                        <span className="leading-relaxed">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {request.prd_success_metrics && (
                <div>
                  <p className="text-[10px] font-semibold text-admin-ink-muted uppercase tracking-wide mb-1">Success Metrics</p>
                  <p className="text-sm text-admin-ink leading-relaxed">{request.prd_success_metrics}</p>
                </div>
              )}

              {request.prd_affected_teams?.length && (
                <div className="flex gap-1.5 flex-wrap">
                  {request.prd_affected_teams.map((team) => (
                    <span key={team} className="text-xs px-2 py-0.5 bg-white border border-accent/20 text-accent rounded-full font-medium">
                      {team}
                    </span>
                  ))}
                </div>
              )}

              {request.prd_additional_notes && (
                <div className="bg-white rounded-lg px-3 py-2.5 border border-accent/10">
                  <p className="text-[10px] font-semibold text-admin-ink-muted uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-xs text-admin-ink-muted leading-relaxed">{request.prd_additional_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Rate the idea */}
          <div>
            <p className="text-xs font-semibold text-admin-ink-muted uppercase tracking-wide mb-2">Rate this idea</p>
            <div className="flex items-center gap-1.5">
              {RATING_ORDER.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRate(r)}
                  disabled={ratingSaving}
                  title={RATING_CONFIG[r].caption}
                  className={`text-sm px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 border ${
                    request.rating === r
                      ? `${RATING_CONFIG[r].bg} ${RATING_CONFIG[r].border} ${RATING_CONFIG[r].text}`
                      : "border-admin-border hover:border-admin-ink/20 text-admin-ink-muted"
                  }`}
                >
                  <span>{RATING_CONFIG[r].emoji}</span>
                  <span className="text-xs">{RATING_CONFIG[r].caption}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-admin-border pt-4 space-y-3">
            {isPending && !rejecting && (
              <div className="flex gap-2">
                <button onClick={handleApprove} disabled={saving}
                  className="flex-1 text-sm font-medium bg-status-deployed/10 text-status-deployed py-2.5 rounded-lg hover:bg-status-deployed/20 transition-colors disabled:opacity-60">
                  ✅ Approve request
                </button>
                <button onClick={() => setRejecting(true)} disabled={saving}
                  className="flex-1 text-sm font-medium bg-status-delayed/10 text-status-delayed py-2.5 rounded-lg hover:bg-status-delayed/20 transition-colors disabled:opacity-60">
                  ❌ Reject request
                </button>
              </div>
            )}

            {isPending && rejecting && (
              <div className="space-y-2">
                <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (shown to requester, optional)"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-bg text-admin-ink placeholder:text-admin-ink-muted" />
                <div className="flex gap-2">
                  <button onClick={handleReject} disabled={saving}
                    className="flex-1 text-sm font-medium bg-status-delayed text-white py-2 rounded-lg disabled:opacity-60">
                    {saving ? "Rejecting…" : "Confirm reject"}
                  </button>
                  <button onClick={() => setRejecting(false)} className="text-sm text-admin-ink-muted px-4">Cancel</button>
                </div>
              </div>
            )}

            {!isPending && !isRejected && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-admin-ink-muted uppercase tracking-wide">Update Status</p>
                <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value as RequestStatus)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-bg text-admin-ink">
                  {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={sprintName} onChange={(e) => setSprintName(e.target.value)}
                    placeholder="Sprint name (e.g. Sprint 24)"
                    className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-bg text-admin-ink placeholder:text-admin-ink-muted" />
                  <select value={etaLabel} onChange={(e) => setEtaLabel(e.target.value)}
                    className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-bg text-admin-ink">
                    <option value="">No ETA set</option>
                    {ETA_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note (e.g. reason for delay)"
                  className="w-full text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-bg text-admin-ink placeholder:text-admin-ink-muted" />
                <button onClick={handleSave} disabled={saving}
                  className="w-full text-sm font-medium bg-accent text-white py-2.5 rounded-lg hover:bg-accent/90 shadow-sm disabled:opacity-60">
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}

            {isRejected && (
              <p className="text-xs text-admin-ink-muted text-center py-2">This request has been rejected.</p>
            )}
          </div>
        </div>
      </div>

      {/* Emoji rating popup */}
      {popupRating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className={`reaction-pop bg-white shadow-2xl rounded-3xl px-12 py-10 flex flex-col items-center gap-3 border-2 ${RATING_CONFIG[popupRating].border}`}>
            <span className="text-7xl leading-none">{RATING_CONFIG[popupRating].emoji}</span>
            <span className={`text-lg font-semibold ${RATING_CONFIG[popupRating].text}`}>{RATING_CONFIG[popupRating].caption}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compact Kanban Card ──────────────────────────────────────────────────────
function AdminCard({
  request,
  attachments,
  onUpdated,
}: {
  request: ProductRequest;
  attachments: RequestAttachment[];
  onUpdated: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const hasPRD = !!(request.prd_problem_statement || request.prd_user_stories?.length);

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        className="bg-admin-surface border border-admin-border rounded-xl p-4 hover:border-accent/40 hover:shadow-sm transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <span className="ticket-id text-xs text-admin-ink-muted">
            PR-{String(request.ticket_number).padStart(4, "0")}
          </span>
          <span className={`text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded ${
            request.urgency === "high" ? "bg-status-delayed-bg text-status-delayed" : "bg-black/5 text-admin-ink-muted"
          }`}>
            {URGENCY_LABELS[request.urgency]}
          </span>
          {hasPRD && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-soft text-accent">✦ PRD</span>}
        </div>

        <h4 className="text-sm font-medium text-admin-ink mb-1 line-clamp-2">{request.title}</h4>
        <p className="text-xs text-admin-ink-muted line-clamp-2 mb-3">{request.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-admin-ink-muted">{request.department ?? "—"}</span>
            {request.rating && <span title={RATING_CONFIG[request.rating].caption}>{RATING_CONFIG[request.rating].emoji}</span>}
          </div>
          <span className="text-xs text-admin-ink-muted">{formatDate(request.created_at)}</span>
        </div>

        {(request.sprint_name || request.eta_label) && (
          <div className="mt-2 pt-2 border-t border-admin-border flex gap-2 flex-wrap">
            {request.sprint_name && <span className="text-[10px] text-accent">{request.sprint_name}</span>}
            {request.eta_label && <span className="text-[10px] text-admin-ink-muted">⏱ {request.eta_label}</span>}
          </div>
        )}

        {request.status === "submitted" && (
          <div className="mt-2 pt-2 border-t border-admin-border">
            <span className="text-[10px] font-medium text-status-review bg-status-review-bg px-2 py-0.5 rounded-full">
              Needs review →
            </span>
          </div>
        )}
      </div>

      {modalOpen && (
        <RequestModal
          request={request}
          attachments={attachments}
          onClose={() => setModalOpen(false)}
          onUpdated={() => { onUpdated(); setModalOpen(false); }}
        />
      )}
    </>
  );
}

// ─── Main Kanban Board ────────────────────────────────────────────────────────
export default function KanbanBoard() {
  const supabase = createClient();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [attachmentsByRequest, setAttachmentsByRequest] = useState<Record<string, RequestAttachment[]>>({});
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    const { data } = await supabase
      .from("requests")
      .select("*, requester:profiles!requests_requested_by_fkey(full_name, email, department)")
      .order("created_at", { ascending: false });

    const reqs = (data as unknown as ProductRequest[]) ?? [];
    setRequests(reqs);

    if (reqs.length > 0) {
      const { data: attachments } = await supabase
        .from("request_attachments")
        .select("*")
        .in("request_id", reqs.map((r) => r.id));

      const grouped: Record<string, RequestAttachment[]> = {};
      (attachments ?? []).forEach((a) => {
        const { data: urlData } = supabase.storage.from("request-attachments").getPublicUrl(a.file_path);
        grouped[a.request_id] = grouped[a.request_id] ?? [];
        grouped[a.request_id].push({ ...a, url: urlData.publicUrl });
      });
      setAttachmentsByRequest(grouped);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadRequests();
    const channel = supabase
      .channel("admin-board-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRequests, supabase]);

  if (loading) return <p className="text-sm text-admin-ink-muted px-8 py-10">Loading…</p>;

  return (
    <div className="px-8 py-8">
      <h1 className="text-xl font-semibold text-admin-ink mb-6">Admin Board</h1>
      <StatsBar requests={requests} />
      <div className="flex gap-4 overflow-x-auto pb-2">
        {STATUS_ORDER.map((status) => {
          const columnRequests = requests.filter((r) => r.status === status);
          const colors = STATUS_COLORS[status];
          return (
            <div key={status} className="w-72 flex-shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-xs font-semibold ${colors.text}`}>{STATUS_LABELS[status]}</span>
                <span className="text-xs text-admin-ink-muted ticket-id">{columnRequests.length}</span>
              </div>
              <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                {columnRequests.length === 0 ? (
                  <div className="border border-dashed border-admin-border rounded-lg py-8 text-center">
                    <span className="text-xs text-admin-ink-muted">Empty</span>
                  </div>
                ) : (
                  columnRequests.map((r) => (
                    <AdminCard key={r.id} request={r} attachments={attachmentsByRequest[r.id] ?? []} onUpdated={loadRequests} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
