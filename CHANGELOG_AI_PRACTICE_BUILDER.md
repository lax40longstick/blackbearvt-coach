# Changelog — v0.3.1 "AI Practice Builder end-to-end"

## Added

- Added a Netlify AI endpoint: `POST /api/ai-practice-builder`.
  - Verifies the Supabase bearer token when Supabase env vars are configured.
  - Uses `OPENAI_API_KEY` and optional `OPENAI_MODEL`.
  - Sends a compact version of the current drill library to the model.
  - Requires the model to return exact drill IDs instead of invented drills.
  - Normalizes the AI response into the app's existing `currentPlan` structure.

- Added browser module: `src/features/practice/ai-practice-builder.js`.
  - Collects the active drill library, age group, theme, progression, goalie preference, recent-plan avoidance, and coach intent.
  - Calls `/api/ai-practice-builder` with the current Supabase session token.
  - Falls back to the local animated practice generator if AI is not configured or temporarily fails.

- Upgraded the Practice Generator UI in `app.html`.
  - Added `AI Practice Intent` text area.
  - Added `Coach Notes / Constraints` text area.
  - Added primary `AI Build Practice` button.
  - Kept the previous local generator as `Quick Build`.
  - Added status messaging so coaches know whether the plan came from AI or fallback.

- Added AI coaching summary rendering.
  - Shows why the plan works.
  - Shows key cues.
  - Shows adjustment options.
  - Shows per-block teaching/freeze moments when returned by AI.

## Config / docs

- Added `OPENAI_API_KEY` and `OPENAI_MODEL` to `.env.example`.
- Added AI endpoint and env vars to `DEPLOY.md`.
- Bumped package version to `0.3.1`.

## Validation

- Syntax checked the new Netlify function.
- Syntax checked the new frontend module.
- Syntax checked the existing practice engine.
- Extracted and syntax checked the inline `app.html` script after patching.
