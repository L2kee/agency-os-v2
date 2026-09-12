export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface Sequence {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface SequenceStep {
  id: string;
  user_id: string;
  sequence_id: string;
  step_order: number;
  day_offset: number;
  subject: string;
  body: string;
}

export type EnrollmentStatus = "active" | "completed" | "stopped" | "replied";

export interface SequenceEnrollment {
  id: string;
  user_id: string;
  lead_id: string;
  sequence_id: string;
  status: EnrollmentStatus;
  current_step: number;
  next_run_at: string | null;
  enrolled_at: string;
}

export type EmailStatus = "queued" | "sent" | "failed";

export interface EmailMessage {
  id: string;
  user_id: string;
  lead_id: string;
  enrollment_id: string | null;
  to_email: string;
  subject: string;
  body: string;
  status: EmailStatus;
  provider_id: string | null;
  error: string | null;
  opened_at: string | null;
  sent_at: string | null;
  created_at: string;
}
