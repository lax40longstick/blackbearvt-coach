import { getSupabaseClient } from "../../lib/supabase.js";

async function getSessionBundle() {
  const supabase = await getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  return { supabase, session, user: session?.user || null };
}

async function getMembershipsForCurrentUser(supabase, userId) {
  const { data, error } = await supabase
    .from("memberships")
    .select("id, organization_id, team_id, role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(5);

  if (error) return [];
  return data || [];
}

export async function getSessionState() {
  const { supabase, session, user } = await getSessionBundle();
  if (!user) {
    return {
      supabase,
      session,
      user: null,
      memberships: [],
      destination: "./auth.html",
    };
  }

  const memberships = await getMembershipsForCurrentUser(supabase, user.id);
  return {
    supabase,
    session,
    user,
    memberships,
    destination: memberships.length > 0 ? "./account.html" : "./onboarding.html",
  };
}

/**
 * If the user is already signed in, redirect them away from the auth page.
 * @param {{fallbackDestination?: string}} [opts]
 */
export async function redirectIfAuthenticated(opts = {}) {
  const state = await getSessionState();
  if (!state.user) return state;

  const target = opts.fallbackDestination || state.destination;
  window.location.replace(target);
  return state;
}

export async function requireAuthenticatedPage() {
  const state = await getSessionState();
  if (!state.user) {
    const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`./auth.html?next=${returnTo}`);
    return state;
  }
  return state;
}

export async function signOutCurrentUser() {
  const { supabase } = await getSessionBundle();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function attachAuthStateListener(onSignedOut) {
  getSupabaseClient()
    .then((supabase) => {
      supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" && typeof onSignedOut === "function") {
          onSignedOut();
        }
      });
    })
    .catch(() => {});
}
