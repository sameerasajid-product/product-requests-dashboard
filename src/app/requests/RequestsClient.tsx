"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProductRequest, StatusHistoryEntry } from "@/lib/types";
import RequestForm from "@/components/RequestForm";
import RequestCard from "@/components/RequestCard";

export default function RequestsClient({
  userId,
  department,
}: {
  userId: string;
  department: string | null;
}) {
  const supabase = createClient();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [historyByRequest, setHistoryByRequest] = useState<
    Record<string, StatusHistoryEntry[]>
  >({});
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    const { data: reqs } = await supabase
      .from("requests")
      .select("*")
      .eq("requested_by", userId)
      .order("created_at", { ascending: false });

    setRequests(reqs ?? []);

    if (reqs && reqs.length > 0) {
      const { data: history } = await supabase
        .from("status_history")
        .select("*")
        .in("request_id", reqs.map((r) => r.id))
        .order("changed_at", { ascending: true });

      const grouped: Record<string, StatusHistoryEntry[]> = {};
      (history ?? []).forEach((h) => {
        grouped[h.request_id] = grouped[h.request_id] ?? [];
        grouped[h.request_id].push(h);
      });
      setHistoryByRequest(grouped);
    }

    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    loadRequests();

    // Live updates: re-fetch whenever one of this user's requests changes status
    const channel = supabase
      .channel("my-requests-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "requests",
          filter: `requested_by=eq.${userId}`,
        },
        () => loadRequests()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "status_history" },
        () => loadRequests()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRequests, supabase, userId]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-ink">My Requests</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent/90 shadow-sm hover:shadow transition-all"
          >
            + New request
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <RequestForm
            userId={userId}
            department={department}
            onCreated={() => {
              setShowForm(false);
              loadRequests();
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-sm text-ink-muted">
            No requests yet. Submit one above to get the ball rolling.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              history={historyByRequest[r.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
