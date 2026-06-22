"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Navbar({
  isAdmin,
  fullName,
}: {
  isAdmin: boolean;
  fullName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const linkClass = (path: string) =>
    `text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
      pathname === path
        ? "bg-accent-soft text-accent"
        : "text-ink-muted hover:text-ink"
    }`;

  return (
    <nav className="border-b border-border bg-surface">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo-mark.png" alt="Swich" width={28} height={28} className="h-7 w-7 object-contain" />
            <span className="text-xs font-mono uppercase tracking-wide text-ink-muted">
              Product Requests
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/requests" className={linkClass("/requests")}>
              My Requests
            </Link>
            {isAdmin && (
              <Link href="/admin" className={linkClass("/admin")}>
                Admin Board
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {fullName && (
            <span className="text-sm text-ink-muted">{fullName}</span>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-ink-muted hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
