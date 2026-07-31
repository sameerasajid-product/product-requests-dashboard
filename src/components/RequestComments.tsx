"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequestComment } from "@/lib/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RequestComments({
  requestId,
  currentUserId,
  theme = "light",
}: {
  requestId: string;
  currentUserId: string;
  theme?: "light" | "admin";
}) {
  const supabase = createClient();
  const [comments, setComments] = useState<RequestComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const isAdminTheme = theme === "admin";
  const textClass = isAdminTheme ? "text-admin-ink" : "text-ink";
  const mutedClass = isAdminTheme ? "text-admin-ink-muted" : "text-ink-muted";
  const surfaceClass = isAdminTheme ? "bg-admin-bg border-admin-border" : "bg-bg border-border";
  const inputClass = isAdminTheme
    ? "bg-admin-surface border-admin-border text-admin-ink"
    : "bg-surface border-border text-ink";

  const loadComments = useCallback(async () => {
    const { data } = await supabase
      .from("request_comments")
      .select("*, author:profiles(full_name, role)")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    setComments((data as unknown as RequestComment[]) ?? []);
    setLoading(false);
  }, [requestId, supabase]);

  useEffect(() => {
    loadComments();
    const channel = supabase
      .channel(`comments-${requestId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "request_comments", filter: `request_id=eq.${requestId}` },
        () => loadComments()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [requestId, loadComments, supabase]);

  async function handleSend() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const { error } = await supabase
      .from("request_comments")
      .insert({ request_id: requestId, author_id: currentUserId, body: text });
    setSending(false);
    if (!error) {
      setBody("");
      loadComments();
    }
  }

  return (
    <div>
      {loading ? (
        <p className={`text-xs ${mutedClass}`}>Loading…</p>
      ) : comments.length === 0 ? (
        <p className={`text-xs ${mutedClass} mb-3`}>No messages yet.</p>
      ) : (
        <div className="space-y-3 mb-3">
          {comments.map((c) => {
            const isMe = c.author_id === currentUserId;
            const isAdminAuthor = c.author?.role === "admin";
            return (
              <div key={c.id} className={`rounded-lg px-3 py-2 border ${surfaceClass} ${isMe ? "ml-6" : "mr-6"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-xs font-medium ${textClass}`}>
                    {c.author?.full_name ?? "Someone"}
                  </span>
                  {isAdminAuthor && (
                    <span className="text-[9px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded-full bg-accent-soft text-accent">
                      Product
                    </span>
                  )}
                  <span className={`text-[10px] ${mutedClass}`}>{formatDateTime(c.created_at)}</span>
                </div>
                <p className={`text-sm ${textClass} leading-relaxed`}>{c.body}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="Write a message…"
          className={`flex-1 text-sm px-3 py-2 rounded-lg border ${inputClass} placeholder:opacity-60`}
        />
        <button
          onClick={handleSend}
          disabled={sending || !body.trim()}
          className="text-xs font-medium bg-accent text-white px-3 py-2 rounded-lg disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
