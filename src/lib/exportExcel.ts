import { ProductRequest, STATUS_LABELS, TYPE_LABELS, URGENCY_LABELS } from "@/lib/types";

export async function downloadRequestsAsExcel(requests: ProductRequest[], filename = "requests-export.xlsx") {
  const XLSX = await import("xlsx");

  const rows = requests.map((r) => ({
    Ticket: `PR-${String(r.ticket_number).padStart(4, "0")}`,
    Title: r.title,
    Description: r.description,
    Status: STATUS_LABELS[r.status],
    Type: TYPE_LABELS[r.type],
    Urgency: URGENCY_LABELS[r.urgency],
    Department: r.department ?? "",
    Rating: r.rating ?? "",
    Sprint: r.sprint_name ?? "",
    ETA: r.eta_label ?? "",
    Requester: r.requester?.full_name ?? "",
    "Requester Email": r.requester?.email ?? "",
    Submitted: new Date(r.created_at).toLocaleDateString(),
    "Last Updated": new Date(r.updated_at).toLocaleDateString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 9 }, { wch: 32 }, { wch: 40 }, { wch: 14 }, { wch: 12 }, { wch: 9 },
    { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 24 },
    { wch: 12 }, { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");
  XLSX.writeFile(workbook, filename);
}

// Date filter presets shared between Table and Board views
export type DateFilterOption = "all" | "7d" | "30d" | "3m" | "6m" | "custom";

export const DATE_FILTER_LABELS: Record<DateFilterOption, string> = {
  all: "All time",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  custom: "Custom range…",
};

export function withinDateFilter(
  createdAt: string,
  option: DateFilterOption,
  customFrom?: string,
  customTo?: string
): boolean {
  if (option === "all") return true;

  const created = new Date(createdAt).getTime();

  if (option === "custom") {
    if (customFrom && created < new Date(customFrom).getTime()) return false;
    if (customTo) {
      const endOfDay = new Date(customTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (created > endOfDay.getTime()) return false;
    }
    return true;
  }

  const days = { "7d": 7, "30d": 30, "3m": 90, "6m": 180 }[option];
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return created >= cutoff;
}
