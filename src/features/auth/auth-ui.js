import { getPublicConfig } from "../../lib/config.js";
import { getSupabaseStatus } from "../../lib/supabase.js";
import {
  sendMagicLink,
  sendPasswordReset,
  signInWithEmail,
  signUpWithEmail,
} from "./auth.js";
import { redirectIfAuthenticated } from "./session.js";
import { renderTurnstile, getTurnstileToken } from "../../lib/turnstile.js";

function getNextTarget() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  if (!next) return null;
  // Only allow same-origin relative paths — block open redirects.
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  if (/^\.\/[a-z0-9_\-./]+$/i.test(next)) return next;
  return null;
}

export function bootAuthPage() {
  const nextTarget = getNextTarget();

  redirectIfAuthenticated({ fallbackDestination: nextTarget || undefined }).catch(() => {});

  const statusEl = document.querySelector("[data-auth-status]");
  const cfg = getPublicConfig();
  const supabaseStatus = getSupabaseStatus();

  if (statusEl) {
    if (supabaseStatus.ready) {
      statusEl.textContent = `Signed-in users are redirected automatically. Environment: ${cfg.appEnv}.`;
    } else {
      statusEl.textContent = `${supabaseStatus.message}. Generate runtime-config.js via 'npm run config:build' after filling .env.`;
    }
  }

  const signUpForm = document.querySelector("[data-auth-signup-form]");
  const signInForm = document.querySelector("[data-auth-signin-form]");
  const magicLinkForm = document.querySelector("[data-auth-magic-form]");
  const resetForm = document.querySelector("[data-auth-reset-form]");
  [signUpForm, magicLinkForm].filter(Boolean).forEach((form) => renderTurnstile(form).catch(() => {}));

  if (signUpForm) {
    signUpForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const notice = signUpForm.querySelector("[data-form-status]");
      const submitBtn = signUpForm.querySelector("button[type=submit]");
      const formData = new FormData(signUpForm);

      if (submitBtn) submitBtn.disabled = true;
      if (notice) notice.textContent = "Creating account…";

      try {
        const result = await signUpWithEmail({
          email: String(formData.get("email") || "").trim(),
          password: String(formData.get("password") || ""),
          captchaToken: getTurnstileToken(signUpForm),
          metadata: {
            first_name: String(formData.get("firstName") || "").trim(),
            last_name: String(formData.get("lastName") || "").trim(),
            selected_plan: String(formData.get("plan") || "").trim(),
            organization_name: String(formData.get("teamName") || "").trim(),
          },
        });

        // When email confirmation is enabled, signUp returns user but no session.
        // We must NOT auto-redirect in that case — the user has to verify first.
        if (!result?.session) {
          if (notice) {
            notice.textContent =
              "Account created. Check your email for a confirmation link, then come back to sign in.";
          }
          return;
        }

        // Session is live (confirmation disabled, or instant).
        if (notice) notice.textContent = "Signup successful. Redirecting…";
        window.location.replace(nextTarget || "./onboarding.html");
      } catch (error) {
        if (notice) notice.textContent = error.message || "Signup failed.";
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (signInForm) {
    signInForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const notice = signInForm.querySelector("[data-form-status]");
      const submitBtn = signInForm.querySelector("button[type=submit]");
      const formData = new FormData(signInForm);

      if (submitBtn) submitBtn.disabled = true;
      if (notice) notice.textContent = "Signing in…";

      try {
        await signInWithEmail({
          email: String(formData.get("email") || "").trim(),
          password: String(formData.get("password") || ""),
        });
        if (notice) notice.textContent = "Signed in. Redirecting…";

        if (nextTarget) {
          window.location.replace(nextTarget);
          return;
        }
        await redirectIfAuthenticated().catch(() => {
          window.location.replace("./account.html");
        });
      } catch (error) {
        if (notice) notice.textContent = error.message || "Sign-in failed.";
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (magicLinkForm) {
    magicLinkForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const notice = magicLinkForm.querySelector("[data-form-status]");
      const formData = new FormData(magicLinkForm);

      try {
        await sendMagicLink(String(formData.get("email") || "").trim(), getTurnstileToken(magicLinkForm));
        if (notice) notice.textContent = "Magic link sent if that address is registered.";
      } catch (error) {
        if (notice) notice.textContent = error.message || "Could not send magic link.";
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const notice = resetForm.querySelector("[data-form-status]");
      const formData = new FormData(resetForm);

      try {
        await sendPasswordReset(String(formData.get("email") || "").trim());
        if (notice) notice.textContent = "Password reset email sent if that address exists.";
      } catch (error) {
        if (notice) notice.textContent = error.message || "Could not send password reset.";
      }
    });
  }
}
