export type SendingAccountStatus = "unverified" | "active" | "needs_auth";

export interface SendingAccount {
  id: string;
  user_id: string;
  provider: "resend" | "gmail" | "microsoft" | "smtp";
  from_email: string;
  from_name: string;
  status: SendingAccountStatus;
  last_error: string | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
