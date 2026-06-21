"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, department },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-semibold text-ink mb-2">Check your email</h1>
          <p className="text-ink-muted text-sm mb-6">
            We sent a confirmation link to {email}. Confirm it, then sign in.
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
          <p className="text-xs font-mono text-ink-muted uppercase tracking-wide mb-1">
            Product Requests
          </p>
          <h1 className="text-2xl font-semibold text-ink">Create an account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Department
            </label>
            <select
              required
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="" disabled>Select department</option>
              <option value="Sales">Sales</option>
              <option value="Operations">Operations</option>
              <option value="Finance">Finance</option>
              <option value="Marketing">Marketing</option>
              <option value="Support">Support</option>
              <option value="Product">Product</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Work email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
              placeholder="At least 6 characters"
            />
          </div>

          {error && (
            <p className="text-sm text-status-delayed bg-status-delayed-bg px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent text-white font-medium py-2 rounded-md hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-ink-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
