import { bootAuthPage } from "./features/auth/auth-ui.js";
import {
  attachAuthStateListener,
  requireAuthenticatedPage,
} from "./features/auth/session.js";
import { bootAccountPage } from "./features/account/account.js";
import { bootPricingPage } from "./features/billing/pricing-ui.js";
import { bootOnboardingPage } from "./features/onboarding/bootstrap.js";
import { initMonitoring } from "./lib/monitoring.js";
import { initAnalytics } from "./lib/analytics.js";

const PROTECTED_PAGES = new Set(["account", "onboarding", "app"]);

export function initSite() {
  initMonitoring();
  initAnalytics();
  const page = document.body?.dataset.page;

  if (page === "auth") {
    bootAuthPage();
  }

  if (page === "pricing") {
    bootPricingPage();
  }

  if (page === "onboarding") {
    requireAuthenticatedPage()
      .then((state) => {
        if (!state.user) return;
        bootOnboardingPage();
      })
      .catch(() => {
        window.location.replace("./auth.html");
      });
  }

  if (page === "account") {
    requireAuthenticatedPage()
      .then((state) => {
        if (!state.user) return;
        bootAccountPage().catch(() => {});
      })
      .catch(() => {
        window.location.replace("./auth.html");
      });
  }

  // Only attach the signed-out redirect on pages that require a session.
  // Public pages (home, pricing, auth, privacy, terms) shouldn't kick users
  // out when a background token refresh fails.
  if (PROTECTED_PAGES.has(page)) {
    attachAuthStateListener(() => {
      window.location.replace("./auth.html");
    });
  }
}
