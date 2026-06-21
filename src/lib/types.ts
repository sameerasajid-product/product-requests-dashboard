export type RequestStatus =
  | "submitted"
  | "in_review"
  | "discussion_with_tech"
  | "in_sprint"
  | "deployed"
  | "delayed_next_sprint";

export type RequestType = "new_feature" | "enhancement" | "bug";
export type RequestUrgency = "low" | "medium" | "high";
export type UserRole = "requester" | "admin";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: "Submitted",
  in_review: "In Review",
  discussion_with_tech: "Discussed with Tech",
  in_sprint: "In Sprint",
  deployed: "Deployed",
  delayed_next_sprint: "Delayed - Next Sprint",
};

// Order columns appear in on the admin board
export const STATUS_ORDER: RequestStatus[] = [
  "submitted",
  "in_review",
  "discussion_with_tech",
  "in_sprint",
  "deployed",
  "delayed_next_sprint",
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
};

export const TYPE_LABELS: Record<RequestType, string> = {
  new_feature: "New Feature",
  enhancement: "Enhancement",
  bug: "Bug",
};

export const URGENCY_LABELS: Record<RequestUrgency, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  role: UserRole;
  created_at: string;
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