"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ProductRequest,
  RequestStatus,
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
  URGENCY_LABELS,
} from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function AdminCard({
  request,
  onUpdated,
}: {
  request: ProductRequest;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<RequestStatus>(request.status);
  const [sprintName, setSprintName] = useState(request.sprint_name ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: request.id,
        newStatus: nextStatus,
        sprintName: sprintName || null,
        note: note || null,
      }),
    });
    setSaving(false);
    setOpen(false);
    setNote("");
    onUpdated();
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="ticket-id text-xs text-ink-muted">
          PR-{String(request.ticket_number).padStart(4, "0")}
        </span>
        <span
          className={`text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded ${
            request.urgency === "high"
              ? "bg-status-delayed-bg text-status-delayed"
              : "bg-bg text-ink-muted"
          }`}
        >
          {URGENCY_LABELS[request.urgency]}
        </span>
      </div>

      <h4 className="text-sm font-medium text-ink mb-1">{request.title}</h4>
      <p className="text-xs text-ink-muted line-clamp-2 mb-2">
        {request.description}
      </p>

      <div className="flex items-center justify-between text-xs text-ink-muted mb-3">
        <span>{request.department ?? "—"} · {TYPE_LABELS[request.type]}</span>
        <span>{formatDate(request.created_at)}</span>
      </div>

      {request.sprint_name && (
        <p className="text-xs text-accent mb-2">{request.sprint_name}</p>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-accent"
        >
          Update status →
        </button>
      ) : (
        <div className="space-y-2 pt-2 border-t border-border mt-2">
          <select
            value={nextStatus}
            onChange={(e) => setNextStatus(e.target.value as RequestStatus)}
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-bg"
          >
            {STATUS_ORDER.map((s) => (
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
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-bg"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional, e.g. reason for delay)"
            className="w-full text-xs px-2 py-1.5 rounded-lg border border-border bg-bg"
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
              className="text-xs font-medium text-ink-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard() {
  const supabase = createClient();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    const { data } = await supabase
      .from("requests")
      .select("*, requester:profiles!requests_requested_by_fkey(full_name, email, department)")
      .order("created_at", { ascending: false });

    setRequests((data as unknown as ProductRequest[]) ?? []);
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
    return <p className="text-sm text-ink-muted px-6 py-10">Loading…</p>;
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <h1 className="text-xl font-semibold text-ink mb-6">Admin Board</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {STATUS_ORDER.map((status) => {
          const columnRequests = requests.filter((r) => r.status === status);
          const colors = STATUS_COLORS[status];
          return (
            <div key={status} className="min-w-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className={`text-xs font-semibold ${colors.text}`}>
                  {STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-ink-muted ticket-id">
                  {columnRequests.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnRequests.length === 0 ? (
                  <div className="border border-dashed border-border rounded-lg py-8 text-center">
                    <span className="text-xs text-ink-muted">Empty</span>
                  </div>
                ) : (
                  columnRequests.map((r) => (
                    <AdminCard
                      key={r.id}
                      request={r}
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
