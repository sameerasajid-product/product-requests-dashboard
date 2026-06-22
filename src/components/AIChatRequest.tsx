"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface PRD {
  title: string;
  type: "new_feature" | "enhancement";
  urgency: "low" | "medium" | "high";
  problem_statement: string;
  user_stories: string[];
  acceptance_criteria: string[];
  affected_teams: string[];
  success_metrics: string;
  additional_notes: string;
}

const URGENCY_COLORS = {
  low: "text-slate-600 bg-slate-100",
  medium: "text-amber-700 bg-amber-50",
  high: "text-red-700 bg-red-50",
};

const TYPE_LABELS = {
  new_feature: "New Feature",
  enhancement: "Enhancement",
};

function PRDPreview({ prd }: { prd: PRD }) {
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-accent-soft">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono uppercase tracking-wide text-accent font-semibold">
            AI-Generated PRD
          </span>
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${URGENCY_COLORS[prd.urgency]}`}>
            {prd.urgency} urgency
          </span>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {TYPE_LABELS[prd.type]}
          </span>
        </div>
        <h3 className="text-base font-semibold text-ink">{prd.title}</h3>
      </div>

      <div className="px-5 py-4 space-y-4 text-sm">
        {/* Problem */}
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
            Problem Statement
          </p>
          <p className="text-ink leading-relaxed">{prd.problem_statement}</p>
        </div>

        {/* User Stories */}
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            User Stories
          </p>
          <div className="space-y-1.5">
            {prd.user_stories.map((story, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-accent font-bold mt-0.5 flex-shrink-0">→</span>
                <span className="text-ink leading-relaxed">{story}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Acceptance Criteria */}
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-2">
            Acceptance Criteria
          </p>
          <div className="space-y-1.5">
            {prd.acceptance_criteria.map((criterion, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-status-deployed font-bold mt-0.5 flex-shrink-0">✓</span>
                <span className="text-ink leading-relaxed">{criterion}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Success Metrics */}
        <div>
          <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
            Success Metrics
          </p>
          <p className="text-ink leading-relaxed">{prd.success_metrics}</p>
        </div>

        {/* Affected Teams + Notes */}
        <div className="flex gap-4 flex-wrap">
          {prd.affected_teams.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1.5">
                Affected Teams
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {prd.affected_teams.map((team) => (
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
        </div>

        {prd.additional_notes && (
          <div className="bg-bg rounded-lg px-4 py-3 border border-border">
            <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide mb-1">
              Additional Notes
            </p>
            <p className="text-sm text-ink-muted leading-relaxed">{prd.additional_notes}</p>
          </div>
        )}
      </div>
    </div>
  );
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
  const [prd, setPrd] = useState<PRD | null>(null);
  const [prdLoading, setPrdLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, prd, prdLoading]);

  async function startChat() {
    setStarted(true);
    setChatLoading(true);

    const response = await fetch("/api/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        messages: [
          {
            role: "user",
            content: "Hi, I'd like to submit a product request.",
          },
        ],
      }),
    });

    const data = await response.json();
    const reply = data.reply ?? "Hi! Tell me what's on your mind — what problem or missing feature would you like to flag for the product team?";

    setMessages([
      { role: "user", content: "Hi, I'd like to submit a product request." },
      { role: "assistant", content: reply },
    ]);
    setChatLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function sendMessage() {
    if (!input.trim() || chatLoading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setChatLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "chat", messages: updatedMessages }),
      });

      const data = await response.json();
      const reply: string = data.reply ?? "Sorry, something went wrong. Try again?";

      const assistantMsg: Message = { role: "assistant", content: reply };
      const finalMessages = [...updatedMessages, assistantMsg];
      setMessages(finalMessages);

      // Check if AI has signalled it's ready to generate the PRD
      if (reply.includes("I have everything I need to write this up")) {
        setTimeout(() => generatePRD(finalMessages), 600);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }

  async function generatePRD(msgs: Message[]) {
    setPrdLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "generate_prd", messages: msgs }),
      });

      const data = await response.json();
      if (data.prd) {
        setPrd(data.prd);
      } else {
        setError("Couldn't generate PRD. You can still regenerate below.");
      }
    } catch {
      setError("Failed to generate PRD. Please try regenerating.");
    } finally {
      setPrdLoading(false);
    }
  }

  async function handleSubmit() {
    if (!prd) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/submit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prd, chatTranscript: messages, userId, department }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
        setSubmitting(false);
        return;
      }

      onCreated();
    } catch {
      setError("Failed to submit. Please try again.");
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
              Chat with AI to describe your request — it will write the PRD for you
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: "💬", label: "Natural conversation", desc: "Just describe what you need, no forms" },
            { icon: "📋", label: "Auto PRD", desc: "AI writes a full PRD from the chat" },
            { icon: "🚀", label: "Instant submission", desc: "Review and submit in one click" },
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

  // ─── Chat + PRD screen ──────────────────────────────────────────────────────
  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Chat header */}
      <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-bg">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center">
            <span className="text-xs">✦</span>
          </div>
          <span className="text-xs font-semibold text-ink">AI Assistant</span>
          {!prd && !prdLoading && (
            <span className="text-[10px] text-ink-muted bg-border px-1.5 py-0.5 rounded-full">
              {messages.filter((m) => m.role === "user").length} / ~6 questions
            </span>
          )}
          {prdLoading && (
            <span className="text-[10px] text-accent bg-accent-soft px-2 py-0.5 rounded-full animate-pulse">
              Writing PRD…
            </span>
          )}
          {prd && (
            <span className="text-[10px] text-status-deployed bg-status-deployed-bg px-2 py-0.5 rounded-full">
              PRD ready ✓
            </span>
          )}
        </div>
        <button onClick={onCancel} className="text-xs text-ink-muted hover:text-ink">
          Cancel
        </button>
      </div>

      {/* Messages */}
      <div className="px-5 py-4 space-y-3 max-h-80 overflow-y-auto">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
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

        {/* PRD loading */}
        {prdLoading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <span className="text-[10px]">✦</span>
            </div>
            <div className="bg-accent-soft border border-accent/20 rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-xs text-accent font-medium animate-pulse">
                Writing your PRD — give me a moment…
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area — hidden once PRD is generated */}
      {!prd && !prdLoading && (
        <div className="px-4 py-3 border-t border-border bg-bg">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
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
              onClick={sendMessage}
              disabled={chatLoading || !input.trim()}
              className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-all flex-shrink-0 h-10"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* PRD Preview + Submit */}
      {prd && (
        <div className="px-5 py-4 border-t border-border space-y-4">
          <PRDPreview prd={prd} />

          {error && (
            <p className="text-sm text-status-delayed bg-status-delayed-bg px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-accent text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-accent/90 shadow-sm hover:shadow transition-all disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit this request →"}
            </button>
            <button
              onClick={() => {
                setPrd(null);
                generatePRD(messages);
              }}
              disabled={prdLoading || submitting}
              className="text-sm font-medium text-ink-muted hover:text-ink px-4 py-2.5 disabled:opacity-50"
            >
              Regenerate PRD
            </button>
            <button
              onClick={() => {
                setPrd(null);
                setMessages([]);
                setStarted(false);
              }}
              disabled={submitting}
              className="text-sm font-medium text-ink-muted hover:text-ink px-4 py-2.5 disabled:opacity-50"
            >
              Start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
