"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ProductRequest, StatusHistoryEntry, RequestAttachment } from "@/lib/types";
import AIChatRequest from "@/components/AIChatRequest";
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
  const [attachmentsByRequest, setAttachmentsByRequest] = useState<
    Record<string, RequestAttachment[]>
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
      const requestIds = reqs.map((r) => r.id);

      const { data: history } = await supabase
        .from("status_history")
        .select("*")
        .in("request_id", requestIds)
        .order("changed_at", { ascending: true });

      const groupedHistory: Record<string, StatusHistoryEntry[]> = {};
      (history ?? []).forEach((h) => {
        groupedHistory[h.request_id] = groupedHistory[h.request_id] ?? [];
        groupedHistory[h.request_id].push(h);
      });
      setHistoryByRequest(groupedHistory);

      const { data: attachments } = await supabase
        .from("request_attachments")
        .select("*")
        .in("request_id", requestIds);

      const groupedAttachments: Record<string, RequestAttachment[]> = {};
      (attachments ?? []).forEach((a) => {
        const { data: urlData } = supabase.storage
          .from("request-attachments")
          .getPublicUrl(a.file_path);
        groupedAttachments[a.request_id] = groupedAttachments[a.request_id] ?? [];
        groupedAttachments[a.request_id].push({ ...a, url: urlData.publicUrl });
      });
      setAttachmentsByRequest(groupedAttachments);
    }

    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    loadRequests();

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
            className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent/90 shadow-sm hover:shadow transition-all flex items-center gap-1.5"
          >
            <span className="text-base leading-none">✦</span>
            New request
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6">
          <AIChatRequest
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
          <p className="text-2xl mb-2">✦</p>
          <p className="text-sm font-medium text-ink mb-1">No requests yet</p>
          <p className="text-sm text-ink-muted">
            Hit &ldquo;New request&rdquo; and chat with the AI to submit your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              history={historyByRequest[r.id] ?? []}
              attachments={attachmentsByRequest[r.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
