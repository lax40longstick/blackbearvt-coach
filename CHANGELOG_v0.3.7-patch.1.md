# Changelog — v0.3.7-patch.1 AI Handler Fix

## Fixed

- **Critical:** `ai-practice-builder` would `ReferenceError` on every successful
  generation (`userPlan`, `used`, `allowed` were referenced in the success
  response but never declared). Caught by the try/catch and returned a 500
  to every coach who used the AI Practice Builder.
- **Production guards advertised in v0.3.7 were defined but never invoked.**
  The handler now actually calls each one in order:
  1. `rateLimit(req, userId)` — per-minute throttle (default 8/min)
  2. `validatePromptSafety(payload)` — blocks unsafe / unsportsmanlike prompts
     before they reach OpenAI; failures are logged with `status='blocked'`
  3. `getOrgPlanForUser(userId)` + `countAiGenerations(userId)` — enforces
     plan-based monthly quotas (starter:5 / team:25 / club:120)
- OpenAI failure path now also calls `logAiGeneration` so production has a
  trail for every error, not just successes.
- `.env.example` cleaned: `OPENAI_API_KEY` and `OPENAI_MODEL` were duplicated
  in two sections.

## Tests

- Strengthened `tests/smoke.mjs`: now asserts the safety/rate/quota helpers
  are *called* in the handler, not just defined. The original v0.3.7 smoke
  test passed because the helper *names* appeared in the file even though
  they were dead code.
- Added `tests/ai-handler.behavior.mjs`: in-process behavioral test with
  fetch-level mocking for both Supabase and OpenAI. 8 checks cover every
  guard, plan tier, and the success response.
- `npm test` now runs both. `npm run test:ai` runs only the behavioral test.

## Files changed

- `netlify/functions/ai-practice-builder.js`
- `tests/smoke.mjs`
- `tests/ai-handler.behavior.mjs` (new)
- `package.json` (test script)
- `.env.example`
