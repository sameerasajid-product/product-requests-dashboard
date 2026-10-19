"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
    );

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold text-ink mb-2">Check your email</h1>
          <p className="text-ink-muted text-sm mb-6">
            If an account exists for {email}, we sent a link to reset your password.
            Open it in this same browser.
          </p>
          <Link href="/login" className="text-accent font-medium text-sm">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Image src="/logo-mark.png" alt="Swich" width={36} height={36} className="h-9 w-9 object-contain mb-4" />
          <p className="text-xs font-mono text-ink-muted uppercase tracking-wide mb-1">
            Product Requests
          </p>
          <h1 className="text-2xl font-semibold text-ink">Reset password</h1>
          <p className="text-sm text-ink-muted mt-2">
            Enter your work email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Work email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="you@company.com"
            />
          </div>

          {error && (
            <p className="text-sm text-status-delayed bg-status-delayed-bg px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-medium py-2 rounded-lg hover:bg-accent/90 shadow-sm hover:shadow transition-all disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6">
          <Link href="/login" className="text-accent font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
