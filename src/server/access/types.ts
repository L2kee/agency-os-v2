export type Role = "member" | "admin";

export interface Profile {
  id: string;
  email: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface MemberRow {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  invitedNotAccepted: boolean;
  lastSignIn: string | null;
  createdAt: string;
}
