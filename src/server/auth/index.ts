import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { hasSupabaseEnv } from "@/server/supabase/env";
import type { OrgContext, OrgRole, Profile } from "@/server/access/types";
import { retryOnClockSkew } from "@/server/auth/retry";

interface MembershipRow {
  role: OrgRole;
  organizations: {
    id: string;
    name: string;
    industry: string;
    currency: string;
    is_platform: boolean;
  } | null;
}

/**
 * Authenticated user, profile, and organization for the current request.
 * Redirects to /login if signed out, and to /pending if the account is
 * deactivated or isn't on any team. Use this at the top of every server
 * rendered page and every Server Action under src/app/(app)/**.
 *
 * Users belong to one organization for now, so this picks their oldest
 * active membership. A switcher for people on several teams is Phase 5.
 *
 * Wrapped in React's cache() so the many queries on one page share a single
 * auth and membership lookup per request.
 */
export const requireUser = cache(async function requireUser() {
  if (!hasSupabaseEnv) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Retried once if a freshly refreshed token trips "JWT issued at future".
  const [{ data: profile }, { data: memberships, error }] = await retryOnClockSkew(
    () =>
      Promise.all([
        supabase
          .from("profiles")
          .select("id, email, role, is_active, created_at")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("organization_members")
          .select("role, organizations (id, name, industry, currency, is_platform)")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at")
          .limit(1),
      ]),
    ([profileResult, membershipResult]) => [profileResult.error, membershipResult.error],
  );

  if (error) {
    throw new Error(`Could not load your organization: ${error.message}`);
  }
  if (profile?.is_active === false) {
    redirect("/pending");
  }

  const membership = (memberships?.[0] ?? null) as unknown as MembershipRow | null;
  if (!membership?.organizations) {
    redirect("/pending");
  }

  const org: OrgContext = {
    id: membership.organizations.id,
    name: membership.organizations.name,
    industry: membership.organizations.industry,
    currency: membership.organizations.currency,
    isPlatform: membership.organizations.is_platform,
    role: membership.role,
  };

  return { supabase, user, profile: (profile ?? null) as Profile | null, org };
});

/** True for organization owners and admins. */
export function isOrgAdmin(org: OrgContext) {
  return org.role === "owner" || org.role === "admin";
}

/** Like requireUser but also requires an owner or admin; bounces others to the dashboard. */
export async function requireAdmin() {
  const ctx = await requireUser();
  if (!isOrgAdmin(ctx.org)) {
    redirect("/");
  }
  return ctx;
}
