try {
  await import("dotenv/config");
} catch {
  // dotenv is optional for local builds; Netlify provides env vars directly.
}

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const runtimeConfig = {
  appEnv: process.env.PUBLIC_APP_ENV || "development",
  appUrl: process.env.PUBLIC_APP_URL || "",
  supabaseUrl: process.env.PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.PUBLIC_SUPABASE_ANON_KEY || "",
  stripePublishableKey: process.env.PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  posthogKey: process.env.PUBLIC_POSTHOG_KEY || "",
  posthogHost: process.env.PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
  sentryDsn: process.env.PUBLIC_SENTRY_DSN || "",
  sentryTracesSampleRate: process.env.PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.05",
  turnstileSiteKey: process.env.PUBLIC_TURNSTILE_SITE_KEY || "",
};

writeFileSync(
  resolve(process.cwd(), "runtime-config.js"),
  `window.__BDCHQ_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`,
  "utf8"
);

console.log("Generated runtime-config.js from environment variables");

process.exit(0);
