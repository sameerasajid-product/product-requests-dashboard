"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIChatRequest({
  userId,
  department,
  onCreated,
  onCancel,
}: {
  userId: string;
  department: string | null;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, summary, summaryLoading, submitting]);

  async function startChat() {
    setStarted(true);
    setChatLoading(true);

    const firstUserMsg: Message = { role: "user", content: "Hi, I'd like to submit a product request." };
    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "chat", messages: [firstUserMsg], department }),
    });

    const data = await response.json();
    const reply = data.reply ?? "Hi! What problem or missing feature would you like to flag for the product team?";

    setMessages([firstUserMsg, { role: "assistant", content: reply }]);
    setChatLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function sendMessage(customInput?: string) {
    const text = (customInput ?? input).trim();
    if (!text || chatLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setSummary(null);
    setChatLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: updatedMessages, department }),
      });

      const data = await response.json();
      const reply: string = data.reply ?? "Sorry, something went wrong. Try again?";
      const assistantMsg: Message = { role: "assistant", content: reply };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      if (reply.includes("I have everything I need to write this up")) {
        setTimeout(() => generateSummary(finalMessages), 600);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }

  async function generateSummary(msgs: Message[]) {
    setSummaryLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate_summary", messages: msgs, department }),
      });

      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary);
      } else {
        setError("Couldn't generate summary. Please try again.");
      }
    } catch {
      setError("Failed to generate summary. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleConfirm() {
    setConfirmed(true);
    setSubmitting(true);
    setError(null);

    try {
      // Generate PRD silently in background
      const prdResponse = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate_prd", messages, department }),
      });

      const prdData = await prdResponse.json();
      if (!prdData.prd) {
        setError("Failed to process request. Please try again.");
        setSubmitting(false);
        setConfirmed(false);
        return;
      }

      // Submit to Supabase
      const submitResponse = await fetch("/api/submit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd: prdData.prd, chatTranscript: messages, userId, department }),
      });

      const submitData = await submitResponse.json();
      if (submitData.error) {
        setError(submitData.error);
        setSubmitting(false);
        setConfirmed(false);
        return;
      }

      onCreated();
    } catch {
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
      setConfirmed(false);
    }
  }

  function handleAddMore() {
    setSummary(null);
    setConfirmed(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  // ─── Pre-start screen ───────────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
            <span className="text-lg">✦</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">AI Product Request</p>
            <p className="text-xs text-ink-muted">
              Chat with AI to describe your request — it handles the rest
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: "💬", label: "Just talk", desc: "Describe what you need naturally, no forms" },
            { icon: "✅", label: "Review & confirm", desc: "AI summarises what it understood" },
            { icon: "🚀", label: "Submitted", desc: "Product team gets a full PRD automatically" },
          ].map((item) => (
            <div key={item.label} className="bg-bg rounded-lg p-3 border border-border">
              <span className="text-xl mb-1.5 block">{item.icon}</span>
              <p className="text-xs font-semibold text-ink mb-0.5">{item.label}</p>
              <p className="text-[11px] text-ink-muted leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={startChat}
            className="bg-accent text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-accent/90 shadow-sm hover:shadow transition-all"
          >
            Start — tell me what you need →
          </button>
          <button
            onClick={onCancel}
            className="text-sm font-medium text-ink-muted hover:text-ink px-4 py-2.5"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ─── Chat screen ────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-bg">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center">
            <span className="text-xs">✦</span>
          </div>
          <span className="text-xs font-semibold text-ink">AI Assistant</span>
          {!summary && !summaryLoading && !confirmed && (
            <span className="text-[10px] text-ink-muted bg-border px-1.5 py-0.5 rounded-full">
              {messages.filter((m) => m.role === "user").length} / ~6 questions
            </span>
          )}
          {summaryLoading && (
            <span className="text-[10px] text-accent bg-accent-soft px-2 py-0.5 rounded-full animate-pulse">
              Summarising…
            </span>
          )}
          {summary && !confirmed && (
            <span className="text-[10px] text-status-deployed bg-status-deployed-bg px-2 py-0.5 rounded-full">
              Ready to confirm ✓
            </span>
          )}
          {confirmed && (
            <span className="text-[10px] text-accent bg-accent-soft px-2 py-0.5 rounded-full animate-pulse">
              Submitting…
            </span>
          )}
        </div>
        {!confirmed && (
          <button onClick={onCancel} className="text-xs text-ink-muted hover:text-ink">
            Cancel
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <span className="text-[10px]">✦</span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent text-white rounded-br-sm"
                  : "bg-bg text-ink rounded-bl-sm border border-border"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <span className="text-[10px]">✦</span>
            </div>
            <div className="bg-bg border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Summary loading */}
        {summaryLoading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <span className="text-[10px]">✦</span>
            </div>
            <div className="bg-accent-soft border border-accent/20 rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-xs text-accent font-medium animate-pulse">
                Let me summarise what I understood…
              </p>
            </div>
          </div>
        )}

        {/* Summary confirmation card */}
        {summary && !confirmed && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <span className="text-[10px]">✦</span>
            </div>
            <div className="max-w-[85%] bg-bg border border-border rounded-2xl rounded-bl-sm px-4 py-3 space-y-3">
              <p className="text-sm text-ink leading-relaxed">{summary}</p>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-ink-muted mb-2">Does this capture your request correctly?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    className="bg-accent text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-accent/90 transition-all"
                  >
                    ✓ Yes, submit this
                  </button>
                  <button
                    onClick={handleAddMore}
                    className="bg-bg border border-border text-xs font-medium px-4 py-2 rounded-lg text-ink hover:border-accent transition-all"
                  >
                    Add more detail
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submitting state */}
        {confirmed && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <span className="text-[10px]">✦</span>
            </div>
            <div className="bg-accent-soft border border-accent/20 rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-xs text-accent font-medium animate-pulse">
                Got it — submitting your request now…
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — hidden once summary shown */}
      {!summary && !summaryLoading && !confirmed && (
        <div className="px-4 py-3 border-t border-border bg-bg">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={chatLoading}
              rows={1}
              placeholder="Type your answer… (Enter to send)"
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none disabled:opacity-60"
              style={{ minHeight: "40px", maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={chatLoading || !input.trim()}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-all flex-shrink-0 h-10"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="px-5 py-3 border-t border-border">
          <p className="text-sm text-status-delayed bg-status-delayed-bg px-3 py-2 rounded-lg">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
