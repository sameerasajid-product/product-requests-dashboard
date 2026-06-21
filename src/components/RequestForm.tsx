"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequestType, RequestUrgency } from "@/lib/types";

export default function RequestForm({
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
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<RequestType>("enhancement");
  const [urgency, setUrgency] = useState<RequestUrgency>("medium");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.from("requests").insert({
      title,
      description,
      type,
      urgency,
      department,
      requested_by: userId,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setTitle("");
    setDescription("");
    setType("enhancement");
    setUrgency("medium");
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-lg p-5 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Title
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Add bulk CSV export to invoices page"
          className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Description
        </label>
        <textarea
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What do you need, and why? Include context that'll help Product and Engineering understand the request."
          className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RequestType)}
            className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="new_feature">New Feature</option>
            <option value="enhancement">Enhancement</option>
            <option value="bug">Bug</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Urgency
          </label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
            className="w-full px-3 py-2 rounded-md border border-border bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="text-sm text-status-delayed bg-status-delayed-bg px-3 py-2 rounded-md">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit request"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm font-medium text-ink-muted hover:text-ink px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
