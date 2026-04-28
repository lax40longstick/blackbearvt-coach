import { getSupabaseClient } from "../../lib/supabase.js";

export async function signUpWithEmail({ email, password, metadata = {}, captchaToken } = {}) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/auth.html`,
      captchaToken,
    },
  });

  if (error) throw error;
  return data;
}

export async function signInWithEmail({ email, password }) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function sendMagicLink(email, captchaToken) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth.html`,
      captchaToken,
    },
  });

  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email) {
  const supabase = await getSupabaseClient();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth.html`,
  });

  if (error) throw error;
  return data;
}
