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
  { text: string; bg: string; border: string }
> = {
  submitted: { text: "text-status-submitted", bg: "bg-status-submitted-bg", border: "border-status-submitted/30" },
  in_review: { text: "text-status-review", bg: "bg-status-review-bg", border: "border-status-review/30" },
  discussion_with_tech: {
    text: "text-status-discussion",
    bg: "bg-status-discussion-bg",
    border: "border-status-discussion/30",
  },
  in_sprint: { text: "text-status-sprint", bg: "bg-status-sprint-bg", border: "border-status-sprint/30" },
  deployed: { text: "text-status-deployed", bg: "bg-status-deployed-bg", border: "border-status-deployed/30" },
  delayed_next_sprint: {
    text: "text-status-delayed",
    bg: "bg-status-delayed-bg",
    border: "border-status-delayed/30",
  },
  rejected: { text: "text-status-rejected", bg: "bg-status-rejected-bg", border: "border-status-rejected/30" },
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

export const RATING_CONFIG: Record<
  RequestRating,
  { emoji: string; caption: string; text: string; bg: string; border: string }
> = {
  excellent: { emoji: "🔥", caption: "Absolute banger", text: "text-status-deployed", bg: "bg-status-deployed-bg", border: "border-status-deployed/30" },
  good: { emoji: "👍", caption: "Solid idea", text: "text-status-sprint", bg: "bg-status-sprint-bg", border: "border-status-sprint/30" },
  meh: { emoji: "😐", caption: "Mid", text: "text-status-submitted", bg: "bg-status-submitted-bg", border: "border-status-submitted/30" },
  weak: { emoji: "👎", caption: "Not convinced", text: "text-status-review", bg: "bg-status-review-bg", border: "border-status-review/30" },
  nonsense: { emoji: "🗑️", caption: "Into the void", text: "text-status-delayed", bg: "bg-status-delayed-bg", border: "border-status-delayed/30" },
};

export const RATING_ORDER: RequestRating[] = ["excellent", "good", "meh", "weak", "nonsense"];

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
  // AI-generated PRD fields
  prd_problem_statement: string | null;
  prd_user_stories: string[] | null;
  prd_acceptance_criteria: string[] | null;
  prd_affected_teams: string[] | null;
  prd_success_metrics: string | null;
  prd_additional_notes: string | null;
  chat_transcript: { role: string; content: string }[] | null;
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
