/** Organization role. The owner can't be demoted, deactivated, or removed. */
export type OrgRole = "owner" | "admin" | "member";

export interface Profile {
  id: string;
  email: string | null;
  role: "member" | "admin";
  is_active: boolean;
  created_at: string;
}

/** The signed in user's organization, as returned by requireUser(). */
export interface OrgContext {
  id: string;
  name: string;
  industry: string;
  currency: string;
  isPlatform: boolean;
  role: OrgRole;
}

export interface MemberRow {
  id: string;
  email: string;
  role: OrgRole;
  isActive: boolean;
  invitedNotAccepted: boolean;
  lastSignIn: string | null;
  createdAt: string;
}
