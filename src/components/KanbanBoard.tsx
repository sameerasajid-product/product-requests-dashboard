"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ProductRequest,
  RequestStatus,
  RequestRating,
  RequestAttachment,
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS_DARK,
  TYPE_LABELS,
  URGENCY_LABELS,
  RATING_CONFIG,
  RATING_ORDER,
  ETA_OPTIONS,
} from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatsBar({ requests }: { requests: ProductRequest[] }) {
  const counts = useMemo(() => {
    const byStatus: Record<RequestStatus, number> = {
      submitted: 0,
      in_review: 0,
      discussion_with_tech: 0,
      in_sprint: 0,
      deployed: 0,
      delayed_next_sprint: 0,
      rejected: 0,
    };
    let highUrgency = 0;
    requests.forEach((r) => {
      byStatus[r.status] += 1;
      if (r.urgency === "high" && r.status !== "deployed" && r.status !== "rejected") {
        highUrgency += 1;
      }
    });
    return { byStatus, highUrgency };
  }, [requests]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
      <div className="bg-admin-surface border border-admin-border rounded-xl px-4 py-3">
        <p className="text-2xl font-semibold text-admin-ink ticket-id">{requests.length}</p>
        <p className="text-xs text-admin-ink-muted mt-0.5">Total requests</p>
      </div>
      {STATUS_ORDER.map((status) => {
        const colors = STATUS_COLORS_DARK[status];
        return (
          <div
            key={status}
            className={`bg-admin-surface border ${colors.border} rounded-xl px-4 py-3`}
          >
            <p className={`text-2xl font-semibold ticket-id ${colors.text}`}>
              {counts.byStatus[status]}
            </p>
            <p className="text-xs text-admin-ink-muted mt-0.5">{STATUS_LABELS[status]}</p>
          </div>
        );
      })}
      {counts.highUrgency > 0 && (
        <div className="col-span-2 sm:col-span-4 lg:col-span-8 bg-statusd-delayed/10 border border-statusd-delayed/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-statusd-delayed flex-shrink-0" />
          <p className="text-xs text-statusd-delayed font-medium">
            {counts.highUrgency} high-urgency request{counts.highUrgency > 1 ? "s" : ""} still open
          </p>
        </div>
      )}
    </div>
  );
}

function AttachmentChip({ attachment }: { attachment: RequestAttachment }) {
  const isImage = attachment.file_type?.startsWith("image/");

  if (isImage && attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-10 h-10 rounded-md overflow-hidden border border-admin-border flex-shrink-0"
        title={attachment.file_name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={attachment.url} alt={attachment.file_name} className="w-full h-full object-cover" />
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 bg-admin-bg border border-admin-border rounded-md px-2 py-1 text-[10px] text-admin-ink hover:border-accent transition-colors flex-shrink-0"
      title={attachment.file_name}
    >
      <span>📄</span>
      <span className="truncate max-w-[60px]">{attachment.file_name}</span>
    </a>
  );
}

function AdminCard({
  request,
  attachments,
  onUpdated,
}: {
  request: ProductRequest;
  attachments: RequestAttachment[];
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
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
  }

  async function handleReject() {
    setSaving(true);
    await callUpdate({ newStatus: "rejected", note: rejectReason || undefined });
    setSaving(false);
    setRejecting(false);
  }

  async function handleSave() {
    setSaving(true);
    await callUpdate({
      newStatus: nextStatus,
      sprintName: sprintName || null,
      etaLabel: etaLabel || null,
      note: note || undefined,
    });
    setSaving(false);
    setOpen(false);
    setNote("");
  }

  async function handleRate(rating: RequestRating) {
    setRatingSaving(true);
    await callUpdate({ rating });
    setRatingSaving(false);
  }

  const isPending = request.status === "submitted";
  const isRejected = request.status === "rejected";
  const statusOptions = STATUS_ORDER.filter((s) => s !== "submitted");

  return (
    <div className="bg-admin-surface border border-admin-border rounded-xl p-4 hover:border-white/20 transition-colors">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="ticket-id text-xs text-admin-ink-muted">
          PR-{String(request.ticket_number).padStart(4, "0")}
        </span>
        <span
          className={`text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded ${
            request.urgency === "high"
              ? "bg-statusd-delayed/10 text-statusd-delayed"
              : "bg-white/5 text-admin-ink-muted"
          }`}
        >
          {URGENCY_LABELS[request.urgency]}
        </span>
      </div>

      <h4 className="text-sm font-medium text-admin-ink mb-1">{request.title}</h4>
      <p className="text-xs text-admin-ink-muted line-clamp-2 mb-2">
        {request.description}
      </p>

      {attachments.length > 0 && (
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto">
          {attachments.map((a) => (
            <AttachmentChip key={a.id} attachment={a} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-admin-ink-muted mb-3">
        <span>{request.department ?? "—"} · {TYPE_LABELS[request.type]}</span>
        <span>{formatDate(request.created_at)}</span>
      </div>

      {request.sprint_name && (
        <p className="text-xs text-accent mb-1">{request.sprint_name}</p>
      )}
      {request.eta_label && (
        <p className="text-xs text-admin-ink-muted mb-2">⏱ {request.eta_label}</p>
      )}

      {/* Rate the idea — admin-only, original emoji reactions */}
      <div className="flex items-center gap-1 mb-3">
        {RATING_ORDER.map((r) => (
          <button
            key={r}
            onClick={() => handleRate(r)}
            disabled={ratingSaving}
            title={RATING_CONFIG[r].caption}
            className={`text-sm w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
              request.rating === r ? RATING_CONFIG[r].bg : "hover:bg-white/5"
            }`}
          >
            {RATING_CONFIG[r].emoji}
          </button>
        ))}
        {request.rating && (
          <span className={`text-[10px] ml-1 ${RATING_CONFIG[request.rating].text}`}>
            {RATING_CONFIG[request.rating].caption}
          </span>
        )}
      </div>

      {/* Approve / Reject gate — only shown while a request hasn't been decided on yet */}
      {isPending && !rejecting && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={saving}
            className="text-xs font-medium bg-statusd-deployed/15 text-statusd-deployed px-3 py-1.5 rounded-lg hover:bg-statusd-deployed/25 transition-colors disabled:opacity-60"
          >
            ✅ Approve
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={saving}
            className="text-xs font-medium bg-statusd-delayed/15 text-statusd-delayed px-3 py-1.5 rounded-lg hover:bg-statusd-delayed/25 transition-colors disabled:opacity-60"
          >
            ❌ Reject
          </button>
        </div>
      )}

      {isPending && rejecting && (
        <div className="space-y-2 pt-2 border-t border-admin-border mt-2">
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason (optional, shown to requester)"
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-admin-border bg-admin-bg text-admin-ink placeholder:text-admin-ink-muted"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleReject}
              disabled={saving}
              className="text-xs font-medium bg-statusd-delayed text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
            >
              {saving ? "Rejecting…" : "Confirm reject"}
            </button>
            <button
              onClick={() => setRejecting(false)}
              className="text-xs font-medium text-admin-ink-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Normal status management — once a request has been approved past the initial gate */}
      {!isPending && !isRejected && (
        !open ? (
          <button
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-accent"
          >
            Update status →
          </button>
        ) : (
          <div className="space-y-2 pt-2 border-t border-admin-border mt-2">
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as RequestStatus)}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-admin-border bg-admin-bg text-admin-ink"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              placeholder="Sprint name (e.g. Sprint 24)"
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-admin-border bg-admin-bg text-admin-ink placeholder:text-admin-ink-muted"
            />
            <select
              value={etaLabel}
              onChange={(e) => setEtaLabel(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-admin-border bg-admin-bg text-admin-ink"
            >
              <option value="">No delivery estimate set</option>
              {ETA_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional, e.g. reason for delay)"
              className="w-full text-xs px-2 py-1.5 rounded-lg border border-admin-border bg-admin-bg text-admin-ink placeholder:text-admin-ink-muted"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-medium bg-accent text-white px-3 py-1.5 rounded-lg shadow-sm hover:shadow transition-shadow disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-admin-ink-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function KanbanBoard() {
  const supabase = createClient();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [attachmentsByRequest, setAttachmentsByRequest] = useState<
    Record<string, RequestAttachment[]>
  >({});
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
        const { data: urlData } = supabase.storage
          .from("request-attachments")
          .getPublicUrl(a.file_path);
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests" },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRequests, supabase]);

  if (loading) {
    return <p className="text-sm text-admin-ink-muted px-8 py-10">Loading…</p>;
  }

  return (
    <div className="px-8 py-8">
      <h1 className="text-xl font-semibold text-admin-ink mb-6">Admin Board</h1>

      <StatsBar requests={requests} />

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {STATUS_ORDER.map((status) => {
          const columnRequests = requests.filter((r) => r.status === status);
          const colors = STATUS_COLORS_DARK[status];
          return (
            <div key={status} className="min-w-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-xs font-semibold ${colors.text}`}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-admin-ink-muted ticket-id">
                  {columnRequests.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnRequests.length === 0 ? (
                  <div className="border border-dashed border-admin-border rounded-lg py-8 text-center">
                    <span className="text-xs text-admin-ink-muted">Empty</span>
                  </div>
                ) : (
                  columnRequests.map((r) => (
                    <AdminCard
                      key={r.id}
                      request={r}
                      attachments={attachmentsByRequest[r.id] ?? []}
                      onUpdated={loadRequests}
                    />
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
