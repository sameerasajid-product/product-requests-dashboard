export type RequestStatus =
  | "submitted"
  | "in_review"
  | "discussion_with_tech"
  | "in_sprint"
  | "deployed"
  | "delayed_next_sprint"
  | "rejected";

export type RequestType = "new_feature" | "enhancement";
export type RequestUrgency = "low" | "medium" | "high";
export type UserRole = "requester" | "admin";
export type RequestRating = "excellent" | "good" | "meh" | "weak" | "nonsense";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  in_review: "In Review",
  discussion_with_tech: "Discussed with Tech",
  in_sprint: "In Sprint",
  deployed: "Deployed",
  delayed_next_sprint: "Delayed - Next Sprint",
  rejected: "Rejected",
};

// Order columns appear in on the admin board
export const STATUS_ORDER: RequestStatus[] = [
  "submitted",
  "in_review",
  "discussion_with_tech",
  "in_sprint",
  "deployed",
  "delayed_next_sprint",
  "rejected",
];

export const STATUS_COLORS: Record<
  RequestStatus,
  { text: string; bg: string }
> = {
  submitted: { text: "text-status-submitted", bg: "bg-status-submitted-bg" },
  in_review: { text: "text-status-review", bg: "bg-status-review-bg" },
  discussion_with_tech: {
    text: "text-status-discussion",
    bg: "bg-status-discussion-bg",
  },
  in_sprint: { text: "text-status-sprint", bg: "bg-status-sprint-bg" },
  deployed: { text: "text-status-deployed", bg: "bg-status-deployed-bg" },
  delayed_next_sprint: {
    text: "text-status-delayed",
    bg: "bg-status-delayed-bg",
  },
  rejected: { text: "text-status-rejected", bg: "bg-status-rejected-bg" },
};

export const STATUS_COLORS_DARK: Record<RequestStatus, { text: string; bg: string; border: string }> = {
  submitted: { text: "text-statusd-submitted", bg: "bg-statusd-submitted/10", border: "border-statusd-submitted/30" },
  in_review: { text: "text-statusd-review", bg: "bg-statusd-review/10", border: "border-statusd-review/30" },
  discussion_with_tech: { text: "text-statusd-discussion", bg: "bg-statusd-discussion/10", border: "border-statusd-discussion/30" },
  in_sprint: { text: "text-statusd-sprint", bg: "bg-statusd-sprint/10", border: "border-statusd-sprint/30" },
  deployed: { text: "text-statusd-deployed", bg: "bg-statusd-deployed/10", border: "border-statusd-deployed/30" },
  delayed_next_sprint: { text: "text-statusd-delayed", bg: "bg-statusd-delayed/10", border: "border-statusd-delayed/30" },
  rejected: { text: "text-statusd-rejected", bg: "bg-statusd-rejected/10", border: "border-statusd-rejected/30" },
};

export const TYPE_LABELS: Record<RequestType, string> = {
  new_feature: "New Feature",
  enhancement: "Enhancement",
};

export const URGENCY_LABELS: Record<RequestUrgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// Admin-only "rate the idea" reaction — original emoji-based reactions, not borrowed meme images.
export const RATING_CONFIG: Record<
  RequestRating,
  { emoji: string; caption: string; text: string; bg: string; border: string }
> = {
  excellent: { emoji: "🔥", caption: "Absolute banger", text: "text-statusd-deployed", bg: "bg-statusd-deployed/10", border: "border-statusd-deployed/30" },
  good: { emoji: "👍", caption: "Solid idea", text: "text-statusd-sprint", bg: "bg-statusd-sprint/10", border: "border-statusd-sprint/30" },
  meh: { emoji: "😐", caption: "Mid", text: "text-statusd-submitted", bg: "bg-statusd-submitted/10", border: "border-statusd-submitted/30" },
  weak: { emoji: "👎", caption: "Not convinced", text: "text-statusd-review", bg: "bg-statusd-review/10", border: "border-statusd-review/30" },
  nonsense: { emoji: "🗑️", caption: "Into the void", text: "text-statusd-delayed", bg: "bg-statusd-delayed/10", border: "border-statusd-delayed/30" },
};

export const RATING_ORDER: RequestRating[] = ["excellent", "good", "meh", "weak", "nonsense"];

// Admin-set delivery expectations, shown to the requester
export const ETA_OPTIONS: string[] = [
  "Next 30 days",
  "Next 2 months",
  "After 3 months",
  "Not yet scheduled",
];

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  role: UserRole;
  created_at: string;
}

export interface RequestAttachment {
  id: string;
  request_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_at: string;
  url?: string;
}

export interface ProductRequest {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  type: RequestType;
  urgency: RequestUrgency;
  department: string | null;
  status: RequestStatus;
  sprint_name: string | null;
  eta_label: string | null;
  rating: RequestRating | null;
  requested_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined data (optional, populated by some queries)
  requester?: Profile;
}

export interface StatusHistoryEntry {
  id: string;
  request_id: string;
  old_status: RequestStatus | null;
  new_status: RequestStatus;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}
