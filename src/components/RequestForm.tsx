"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RequestType, RequestUrgency } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file

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
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const tooBig = selected.find((f) => f.size > MAX_FILE_SIZE);
    if (tooBig) {
      setError(`"${tooBig.name}" is over 10MB — pick something smaller.`);
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...selected]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: inserted, error: insertError } = await supabase
      .from("requests")
      .insert({
        title,
        description,
        type,
        urgency,
        department,
        requested_by: userId,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      setLoading(false);
      setError(insertError?.message ?? "Something went wrong, try again.");
      return;
    }

    // Upload any attached files now that we have a request id to attach them to
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadStatus(`Uploading ${i + 1} of ${files.length}…`);

        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${userId}/${inserted.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("request-attachments")
          .upload(path, file);

        if (!uploadError) {
          await supabase.from("request_attachments").insert({
            request_id: inserted.id,
            file_path: path,
            file_name: file.name,
            file_type: file.type || null,
            file_size: file.size,
          });
        }
        // If an individual file fails to upload, we just skip it silently —
        // the request itself is already created either way.
      }
    }

    setLoading(false);
    setUploadStatus(null);
    setTitle("");
    setDescription("");
    setType("enhancement");
    setUrgency("medium");
    setFiles([]);
    onCreated();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4"
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
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
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
          className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none"
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
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="new_feature">New Feature</option>
            <option value="enhancement">Enhancement</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            Urgency
          </label>
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as RequestUrgency)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink mb-1.5">
          Attachments (optional)
        </label>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="w-full text-sm text-ink-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-bg file:text-ink file:text-sm file:font-medium hover:file:bg-border/60 file:cursor-pointer cursor-pointer border border-border rounded-lg px-3 py-1.5"
        />
        <p className="text-xs text-ink-muted mt-1">
          Screenshots, mockups, documents — up to 10MB each.
        </p>

        {files.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between bg-bg border border-border rounded-lg px-3 py-1.5"
              >
                <span className="text-xs text-ink truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-xs text-ink-muted hover:text-status-delayed flex-shrink-0 ml-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-status-delayed bg-status-delayed-bg px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="bg-accent text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent/90 shadow-sm hover:shadow transition-all disabled:opacity-60"
        >
          {loading ? (uploadStatus ?? "Submitting…") : "Submit request"}
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
