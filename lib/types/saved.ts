// Client-safe constants for the Saved Schools feature -- no server-only
// imports here (unlike lib/db/saved.ts, which needs next/headers via the
// server Supabase client), so client components can use these directly.
export type SavedStatus = "saved" | "in_progress" | "submitted" | "accepted" | "waitlisted" | "rejected";

export const SAVED_STATUS_LABELS: Record<SavedStatus, string> = {
  saved: "Saved",
  in_progress: "In progress",
  submitted: "Submitted",
  accepted: "Accepted",
  waitlisted: "Waitlisted",
  rejected: "Rejected",
};
