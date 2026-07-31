"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequestModal, StatsBar } from "@/components/KanbanBoard";
import { downloadRequestsAsExcel, withinDateFilter, DATE_FILTER_LABELS, DateFilterOption } from "@/lib/exportExcel";
import {
  ProductRequest,
  RequestAttachment,
  RequestStatus,
  RequestRating,
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  TYPE_LABELS,
  URGENCY_LABELS,
  RATING_CONFIG,
  RATING_ORDER,
} from "@/lib/types";

type SortKey = "created_at" | "title" | "status" | "urgency" | "department";
type SortDir = "asc" | "desc";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysOpen(createdAt: string): number {
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

const URGENCY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function RequestsTable() {
  const supabase = createClient();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [attachmentsByRequest, setAttachmentsByRequest] = useState<Record<string, RequestAttachment[]>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProductRequest | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [downloading, setDownloading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<RequestStatus | "">("");
  const [bulkRating, setBulkRating] = useState<RequestRating | "">("");
  const [applyingBulk, setApplyingBulk] = useState(false);

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
      .channel("admin-table-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRequests, supabase]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => { if (r.department) set.add(r.department); });
    return Array.from(set).sort();
  }, [requests]);

  const filtered = useMemo(() => {
    let rows = requests;
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (departmentFilter !== "all") rows = rows.filter((r) => r.department === departmentFilter);
    if (urgencyFilter !== "all") rows = rows.filter((r) => r.urgency === urgencyFilter);
    if (dateFilter !== "all") rows = rows.filter((r) => withinDateFilter(r.created_at, dateFilter, customFrom, customTo));
    const q = search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));

    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      else if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "status") cmp = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      else if (sortKey === "urgency") cmp = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
      else if (sortKey === "department") cmp = (a.department ?? "").localeCompare(b.department ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [requests, statusFilter, departmentFilter, urgencyFilter, dateFilter, customFrom, customTo, search, sortKey, sortDir]);

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadRequestsAsExcel(filtered, `swich-requests-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setDownloading(false);
    }
  }

  function toggleRowSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id))
    );
  }

  async function applyBulkStatus() {
    if (!bulkStatus || selectedIds.size === 0) return;
    setApplyingBulk(true);
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch("/api/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: id, newStatus: bulkStatus }),
        })
      )
    );
    setApplyingBulk(false);
    setBulkStatus("");
    setSelectedIds(new Set());
    loadRequests();
  }

  async function applyBulkRating() {
    if (!bulkRating || selectedIds.size === 0) return;
    setApplyingBulk(true);
    await Promise.all(
      Array.from(selectedIds).map((id) =>
        fetch("/api/update-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: id, rating: bulkRating }),
        })
      )
    );
    setApplyingBulk(false);
    setBulkRating("");
    setSelectedIds(new Set());
    loadRequests();
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "asc");
    }
  }

  function SortHeader({ label, sortField }: { label: string; sortField: SortKey }) {
    const active = sortKey === sortField;
    return (
      <th
        onClick={() => toggleSort(sortField)}
        className="px-4 py-3 font-medium text-left cursor-pointer select-none hover:text-admin-ink"
      >
        <span className="flex items-center gap-1">
          {label}
          {active && <span className="text-[10px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
        </span>
      </th>
    );
  }

  if (loading) return <p className="text-sm text-admin-ink-muted px-8 py-10">Loading…</p>;

  return (
    <div className="px-8 py-8">
      <h1 className="text-xl font-semibold text-admin-ink mb-6">Admin Board</h1>
      <StatsBar requests={requests} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title or description…"
          className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink placeholder:text-admin-ink-muted w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
          className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
        >
          <option value="all">All statuses</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
        >
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
        >
          <option value="all">All urgency</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilterOption)}
          className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
        >
          {(Object.keys(DATE_FILTER_LABELS) as DateFilterOption[]).map((key) => (
            <option key={key} value={key}>{DATE_FILTER_LABELS[key]}</option>
          ))}
        </select>
        {dateFilter === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
            />
            <span className="text-xs text-admin-ink-muted">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
            />
          </>
        )}
        {(statusFilter !== "all" || departmentFilter !== "all" || urgencyFilter !== "all" || dateFilter !== "all" || search) && (
          <button
            onClick={() => { setStatusFilter("all"); setDepartmentFilter("all"); setUrgencyFilter("all"); setDateFilter("all"); setCustomFrom(""); setCustomTo(""); setSearch(""); }}
            className="text-xs text-admin-ink-muted hover:text-admin-ink underline"
          >
            Clear filters
          </button>
        )}
        <button
          onClick={handleDownload}
          disabled={downloading || filtered.length === 0}
          className="text-xs font-medium bg-admin-surface border border-admin-border text-admin-ink px-3 py-2 rounded-lg hover:border-accent/40 transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {downloading ? "Preparing…" : "⬇ Download Excel"}
        </button>
        <span className="text-xs text-admin-ink-muted ml-auto">{filtered.length} of {requests.length}</span>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 bg-accent-soft border border-accent/20 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-accent">{selectedIds.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as RequestStatus | "")}
            className="text-xs px-2 py-1.5 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
          >
            <option value="">Change status to…</option>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <button
            onClick={applyBulkStatus}
            disabled={!bulkStatus || applyingBulk}
            className="text-xs font-medium bg-accent text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50"
          >
            Apply
          </button>
          <select
            value={bulkRating}
            onChange={(e) => setBulkRating(e.target.value as RequestRating | "")}
            className="text-xs px-2 py-1.5 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
          >
            <option value="">Set rating to…</option>
            {RATING_ORDER.map((r) => <option key={r} value={r}>{RATING_CONFIG[r].emoji} {RATING_CONFIG[r].caption}</option>)}
          </select>
          <button
            onClick={applyBulkRating}
            disabled={!bulkRating || applyingBulk}
            className="text-xs font-medium bg-accent text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50"
          >
            Apply
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-admin-ink-muted hover:text-admin-ink underline ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-admin-surface border border-admin-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-admin-border text-left text-admin-ink-muted text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 font-medium">Ticket</th>
              <SortHeader label="Title" sortField="title" />
              <SortHeader label="Status" sortField="status" />
              <th className="px-4 py-3 font-medium">Type</th>
              <SortHeader label="Urgency" sortField="urgency" />
              <SortHeader label="Department" sortField="department" />
              <th className="px-4 py-3 font-medium">Rating</th>
              <SortHeader label="Submitted" sortField="created_at" />
              <th className="px-4 py-3 font-medium">Open</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const colors = STATUS_COLORS[r.status];
              const isOpenStatus = r.status !== "deployed" && r.status !== "rejected" && r.status !== "cancelled";
              const open = daysOpen(r.created_at);
              const overdue = isOpenStatus && r.urgency === "high" && open > 7;
              return (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="border-b border-admin-border last:border-0 hover:bg-admin-bg/60 cursor-pointer"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleRowSelected(r.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-admin-ink-muted ticket-id text-xs">
                    PR-{String(r.ticket_number).padStart(4, "0")}
                  </td>
                  <td className="px-4 py-3 text-admin-ink font-medium max-w-xs truncate">{r.title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-admin-ink-muted">{TYPE_LABELS[r.type]}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded ${
                      r.urgency === "high" ? "bg-status-delayed-bg text-status-delayed" : "bg-black/5 text-admin-ink-muted"
                    }`}>
                      {URGENCY_LABELS[r.urgency]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-admin-ink-muted">{r.department ?? "—"}</td>
                  <td className="px-4 py-3">
                    {r.rating ? (
                      <span title={RATING_CONFIG[r.rating].caption}>{RATING_CONFIG[r.rating].emoji}</span>
                    ) : (
                      <span className="text-admin-ink-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-admin-ink-muted">{formatDate(r.created_at)}</td>
                  <td className="px-4 py-3">
                    {isOpenStatus ? (
                      <span className={`text-xs ${overdue ? "text-status-delayed font-medium" : "text-admin-ink-muted"}`}>
                        {open}d{overdue ? " ⚠" : ""}
                      </span>
                    ) : (
                      <span className="text-admin-ink-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-admin-ink-muted">
                  No requests match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <RequestModal
          request={selected}
          attachments={attachmentsByRequest[selected.id] ?? []}
          onClose={() => setSelected(null)}
          onUpdated={() => { loadRequests(); setSelected(null); }}
        />
      )}
    </div>
  );
}
