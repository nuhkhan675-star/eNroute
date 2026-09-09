import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * The signed-in user, fetched at most once per request.
 *
 * supabase.auth.getUser() is a network call -- it validates the token against
 * Supabase rather than trusting the cookie. Every page called it, and so did
 * SiteHeader, so each render paid for two round trips to Tokyo before doing
 * any actual work.
 *
 * React's cache() dedupes within a single request, so the header and the page
 * now share one call. It does NOT cache across requests, which is what we
 * want: a stale session must never leak between users.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
