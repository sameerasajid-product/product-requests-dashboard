"use client";

import { useState } from "react";
import KanbanBoard from "@/components/KanbanBoard";
import RequestsTable from "@/components/admin/RequestsTable";

export default function AdminBoardView() {
  const [view, setView] = useState<"table" | "kanban">("table");

  return (
    <div>
      <div className="px-8 pt-6 flex justify-end">
        <div className="inline-flex rounded-lg border border-admin-border bg-admin-surface p-0.5">
          <button
            onClick={() => setView("table")}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              view === "table" ? "bg-accent text-white" : "text-admin-ink-muted hover:text-admin-ink"
            }`}
          >
            Table
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              view === "kanban" ? "bg-accent text-white" : "text-admin-ink-muted hover:text-admin-ink"
            }`}
          >
            Board
          </button>
        </div>
      </div>
      {view === "table" ? <RequestsTable /> : <KanbanBoard />}
    </div>
  );
}
