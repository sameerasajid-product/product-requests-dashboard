import { RequestStatus, STATUS_LABELS, STATUS_COLORS } from "@/lib/types";

export default function StatusBadge({ status }: { status: RequestStatus }) {
  const colors = STATUS_COLORS[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colors.text} ${colors.bg}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
