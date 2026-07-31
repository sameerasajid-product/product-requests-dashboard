"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ProductRequest,
  STATUS_ORDER,
  STATUS_LABELS,
  STATUS_COLORS,
  URGENCY_LABELS,
} from "@/lib/types";
import { withinDateFilter, DATE_FILTER_LABELS, DateFilterOption } from "@/lib/exportExcel";

function BarRow({ label, count, max, colorClass }: { label: string; count: number; max: number; colorClass: string }) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-admin-ink-muted w-40 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-6 bg-admin-bg rounded-md overflow-hidden">
        <div
          className={`h-full rounded-md ${colorClass} transition-all duration-500 flex items-center justify-end px-2`}
          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
        >
          {pct > 15 && <span className="text-xs font-medium text-white">{count}</span>}
        </div>
      </div>
      {pct <= 15 && <span className="text-xs font-medium text-admin-ink w-6 text-right">{count}</span>}
    </div>
  );
}

const STATUS_BAR_COLOR: Record<string, string> = {
  submitted: "bg-status-submitted",
  in_review: "bg-status-review",
  discussion_with_tech: "bg-status-discussion",
  in_sprint: "bg-status-sprint",
  deployed: "bg-status-deployed",
  delayed_next_sprint: "bg-status-delayed",
  rejected: "bg-status-rejected",
  cancelled: "bg-admin-ink-muted",
};

export default function DashboardView() {
  const supabase = createClient();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilterOption>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("requests")
        .select("*")
        .order("created_at", { ascending: false });
      setRequests((data as unknown as ProductRequest[]) ?? []);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => { if (r.department) set.add(r.department); });
    return Array.from(set).sort();
  }, [requests]);

  const filtered = useMemo(() => {
    let rows = requests;
    if (departmentFilter !== "all") rows = rows.filter((r) => r.department === departmentFilter);
    if (dateFilter !== "all") rows = rows.filter((r) => withinDateFilter(r.created_at, dateFilter, customFrom, customTo));
    return rows;
  }, [requests, departmentFilter, dateFilter, customFrom, customTo]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => { counts[s] = 0; });
    filtered.forEach((r) => { counts[r.status] += 1; });
    return counts;
  }, [filtered]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((r) => {
      const dept = r.department ?? "Unknown";
      counts[dept] = (counts[dept] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const urgencyCounts = useMemo(() => {
    const counts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    filtered.forEach((r) => { counts[r.urgency] += 1; });
    return counts;
  }, [filtered]);

  const maxStatusCount = Math.max(...Object.values(statusCounts), 1);
  const maxDeptCount = Math.max(...departmentCounts.map(([, c]) => c), 1);
  const maxUrgencyCount = Math.max(...Object.values(urgencyCounts), 1);

  const openCount = filtered.filter((r) => !["deployed", "rejected", "cancelled"].includes(r.status)).length;
  const deployedCount = statusCounts["deployed"] ?? 0;
  const totalCount = filtered.length;
  const deployRate = totalCount === 0 ? 0 : Math.round((deployedCount / totalCount) * 100);

  if (loading) return <p className="text-sm text-admin-ink-muted px-8 py-10">Loading…</p>;

  return (
    <div className="px-8 py-8">
      <h1 className="text-xl font-semibold text-admin-ink mb-6">Dashboard</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink"
        >
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
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
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink" />
            <span className="text-xs text-admin-ink-muted">to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink" />
          </>
        )}
        <span className="text-xs text-admin-ink-muted ml-auto">{totalCount} requests</span>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-admin-surface border border-admin-border rounded-xl p-4">
          <div className="text-2xl font-semibold text-admin-ink">{totalCount}</div>
          <p className="text-xs text-admin-ink-muted mt-1">Total requests</p>
        </div>
        <div className="bg-admin-surface border border-admin-border rounded-xl p-4">
          <div className="text-2xl font-semibold text-accent">{openCount}</div>
          <p className="text-xs text-admin-ink-muted mt-1">Currently open</p>
        </div>
        <div className="bg-admin-surface border border-admin-border rounded-xl p-4">
          <div className="text-2xl font-semibold text-status-deployed">{deployedCount}</div>
          <p className="text-xs text-admin-ink-muted mt-1">Deployed</p>
        </div>
        <div className="bg-admin-surface border border-admin-border rounded-xl p-4">
          <div className="text-2xl font-semibold text-admin-ink">{deployRate}%</div>
          <p className="text-xs text-admin-ink-muted mt-1">Deploy rate</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5">
          <p className="text-sm font-semibold text-admin-ink mb-4">Requests by status</p>
          <div className="space-y-3">
            {STATUS_ORDER.map((s) => (
              <BarRow
                key={s}
                label={STATUS_LABELS[s]}
                count={statusCounts[s] ?? 0}
                max={maxStatusCount}
                colorClass={STATUS_BAR_COLOR[s] ?? "bg-accent"}
              />
            ))}
          </div>
        </div>

        {/* Department breakdown */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5">
          <p className="text-sm font-semibold text-admin-ink mb-4">Requests by department</p>
          {departmentCounts.length === 0 ? (
            <p className="text-xs text-admin-ink-muted">No data for this filter.</p>
          ) : (
            <div className="space-y-3">
              {departmentCounts.map(([dept, count]) => (
                <BarRow key={dept} label={dept} count={count} max={maxDeptCount} colorClass="bg-accent" />
              ))}
            </div>
          )}
        </div>

        {/* Urgency breakdown */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5">
          <p className="text-sm font-semibold text-admin-ink mb-4">Requests by urgency</p>
          <div className="space-y-3">
            <BarRow label={URGENCY_LABELS.high} count={urgencyCounts.high} max={maxUrgencyCount} colorClass="bg-status-delayed" />
            <BarRow label={URGENCY_LABELS.medium} count={urgencyCounts.medium} max={maxUrgencyCount} colorClass="bg-status-review" />
            <BarRow label={URGENCY_LABELS.low} count={urgencyCounts.low} max={maxUrgencyCount} colorClass="bg-admin-ink-muted" />
          </div>
        </div>

        {/* Rating breakdown (internal quality score) */}
        <div className="bg-admin-surface border border-admin-border rounded-xl p-5">
          <p className="text-sm font-semibold text-admin-ink mb-1">Note</p>
          <p className="text-xs text-admin-ink-muted leading-relaxed">
            All charts respect the department and date filters above. Status colors match
            the ones used on the Board and Table views for consistency.
          </p>
        </div>
      </div>
    </div>
  );
}
