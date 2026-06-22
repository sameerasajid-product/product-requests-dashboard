"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminSidebar({
  fullName,
}: {
  fullName: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-admin-sidebar border-r border-admin-border min-h-screen flex flex-col">
      <div className="px-5 pt-6 pb-5 border-b border-admin-border">
        <div className="flex items-center gap-2 mb-1">
          <Image
            src="/logo-mark.png"
            alt="Swich"
            width={24}
            height={24}
            className="h-6 w-6 object-contain"
          />
          <span className="text-sm font-semibold text-admin-ink">Swich</span>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-admin-ink-muted">
          Product Requests
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-accent-soft text-accent text-sm font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Board
        </div>
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-admin-border">
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-admin-ink truncate">
            {fullName ?? "Product team"}
          </p>
          <span className="inline-block mt-1 text-[10px] font-mono uppercase tracking-wide text-accent">
            Admin
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-admin-ink-muted hover:bg-black/[0.04] hover:text-admin-ink transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
