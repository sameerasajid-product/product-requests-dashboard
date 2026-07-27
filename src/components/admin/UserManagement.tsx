"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Profile, UserRole } from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function UserManagement({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorId, setErrorId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadUsers();
    const channel = supabase
      .channel("admin-users-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadUsers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadUsers, supabase]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.department?.toLowerCase().includes(q)
    );
  }, [users, search]);

  async function updateUser(id: string, patch: { role?: UserRole; is_active?: boolean }) {
    setSavingId(id);
    setErrorId(null);
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    setSavingId(null);
    if (error) {
      setErrorId(id);
    } else {
      loadUsers();
    }
  }

  if (loading) return <p className="text-sm text-admin-ink-muted px-8 py-10">Loading…</p>;

  return (
    <div className="px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-admin-ink">Users</h1>
          <p className="text-xs text-admin-ink-muted mt-1">
            Change roles or deactivate accounts. Deactivated users are signed out immediately and can&rsquo;t log back in until reactivated.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, department…"
          className="text-sm px-3 py-2 rounded-lg border border-admin-border bg-admin-surface text-admin-ink placeholder:text-admin-ink-muted w-72"
        />
      </div>

      <div className="bg-admin-surface border border-admin-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-admin-border text-left text-admin-ink-muted text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const isSelf = u.id === currentUserId;
              const isSaving = savingId === u.id;
              return (
                <tr key={u.id} className="border-b border-admin-border last:border-0 hover:bg-admin-bg/60">
                  <td className="px-4 py-3 text-admin-ink font-medium">
                    {u.full_name ?? "—"}
                    {isSelf && <span className="ml-1.5 text-[10px] text-admin-ink-muted">(you)</span>}
                  </td>
                  <td className="px-4 py-3 text-admin-ink-muted">{u.email}</td>
                  <td className="px-4 py-3 text-admin-ink-muted">{u.department ?? "—"}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isSelf || isSaving}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as UserRole })}
                      title={isSelf ? "You can't change your own role" : undefined}
                      className="text-xs px-2 py-1.5 rounded-lg border border-admin-border bg-admin-bg text-admin-ink disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="requester">Requester</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                      disabled={isSelf || isSaving}
                      title={isSelf ? "You can't deactivate your own account" : undefined}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        u.is_active
                          ? "bg-status-deployed-bg text-status-deployed hover:bg-status-deployed/20"
                          : "bg-status-delayed-bg text-status-delayed hover:bg-status-delayed/20"
                      }`}
                    >
                      {u.is_active ? "Active" : "Deactivated"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-admin-ink-muted">{formatDate(u.created_at)}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-admin-ink-muted">
                  No users match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {errorId && (
        <p className="text-xs text-status-delayed mt-3">
          Couldn&rsquo;t save that change — try again.
        </p>
      )}
    </div>
  );
}
