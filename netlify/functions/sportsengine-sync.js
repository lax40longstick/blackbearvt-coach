// BenchBoss Coach HQ v0.6.0 — SportsEngine API sync placeholder.
// This is intentionally gated until you receive SportsEngine API credentials.

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export default async (req) => {
  if (!process.env.SPORTSENGINE_CLIENT_ID || !process.env.SPORTSENGINE_CLIENT_SECRET) {
    return json({
      error: 'SportsEngine API sync is not configured yet.',
      nextSteps: [
        'Apply for/enable SportsEngine developer API access.',
        'Add SPORTSENGINE_CLIENT_ID and SPORTSENGINE_CLIENT_SECRET to Netlify.',
        'Map the SportsEngine team ID into team_sources.external_id.',
        'Replace this placeholder with OAuth/GraphQL roster-event sync.',
      ],
    }, 501);
  }
  return json({ error: 'SportsEngine sync credentials are present, but the API mapping must be completed after access is approved.' }, 501);
};

export const config = { path: '/api/sportsengine-sync' };
