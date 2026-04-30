// netlify/functions/gamesheet-import.js
// Production-oriented GameSheet importer: public page parsing + CSV parsing + structured diagnostics.

import { createClient } from '@supabase/supabase-js';
import { parseDelimitedStats, parseGameSheetHtml, summarizeGames, buildImportSnapshot } from './_gamesheet-parser.js';

const ALLOWED_HOSTS = new Set(['gamesheetstats.com', 'www.gamesheetstats.com']);

function corsHeaders() {
  return {
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
  };
}
function json(statusCode, payload) { return { statusCode, headers: corsHeaders(), body: JSON.stringify(payload) }; }

function getSupabase() {
  const url = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function storeSnapshot(snapshot, meta = {}) {
  const supabase = getSupabase();
  if (!supabase) return { stored: false, reason: 'Supabase service env not configured.' };
  const row = {
    source: snapshot.source,
    source_url: snapshot.url,
    imported_at: snapshot.importedAt,
    games_count: snapshot.gamesCount,
    player_stats_count: snapshot.playerStatsCount,
    team_stats: snapshot.teamStats,
    warnings: snapshot.warnings,
    payload: snapshot,
    team_id: meta.teamId || null,
    created_by: meta.userId || null,
  };
  const { error } = await supabase.from('gamesheet_import_runs').insert(row);
  if (error) return { stored: false, reason: error.message };
  return { stored: true };
}

async function parseUrl(target, teamName) {
  const parsed = new URL(target);
  if (!ALLOWED_HOSTS.has(parsed.hostname)) throw new Error('Only gamesheetstats.com URLs are allowed.');
  const res = await fetch(parsed.toString(), {
    headers: {
      'user-agent': 'BearDenCoachHQ/0.5.2 GameSheet importer (+team hub)',
      'accept': 'text/html,application/xhtml+xml,text/csv,text/plain;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`GameSheet returned ${res.status}`);
  const body = await res.text();
  const contentType = res.headers.get('content-type') || '';
  if (/csv|text\/plain/i.test(contentType) || /(^|\n)\s*(#|Player|Name|GP|Goals|Date),/i.test(body.slice(0, 1000))) {
    const parsedCsv = parseDelimitedStats(body);
    const teamStats = summarizeGames(parsedCsv.games, teamName);
    return { ...parsedCsv, teamStats, contentType, parser: 'csv' };
  }
  const parsedHtml = parseGameSheetHtml(body, { teamName });
  const teamStats = summarizeGames(parsedHtml.games, teamName);
  return { ...parsedHtml, teamStats, contentType, parser: 'html' };
}

export const handler = async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  try {
    let url = event.queryStringParameters?.url || '';
    let csv = '';
    let teamName = event.queryStringParameters?.team || 'Black Bear';
    let persist = event.queryStringParameters?.persist === '1';
    let teamId = event.queryStringParameters?.team_id || null;
    let userId = null;

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      url = body.url || url;
      csv = body.csv || body.text || '';
      teamName = body.teamName || teamName;
      persist = Boolean(body.persist ?? persist);
      teamId = body.teamId || teamId;
      userId = body.userId || null;
    }

    let parsed;
    let source = 'gamesheet-public-url';
    if (csv) {
      const parsedCsv = parseDelimitedStats(csv);
      parsed = { ...parsedCsv, teamStats: summarizeGames(parsedCsv.games, teamName), parser: 'csv-paste', contentType: 'text/csv' };
      source = 'gamesheet-csv';
    } else if (url) {
      parsed = await parseUrl(url, teamName);
    } else {
      return json(400, { error: 'Missing url or csv.' });
    }

    const snapshot = buildImportSnapshot({ url, source, games: parsed.games || [], playerStats: parsed.playerStats || [], teamStats: parsed.teamStats || null, warnings: parsed.warnings || [] });
    const storage = persist ? await storeSnapshot(snapshot, { teamId, userId }) : { stored: false, reason: 'persist=false' };

    return json(200, {
      games: snapshot.games,
      playerStats: snapshot.playerStats,
      teamStats: snapshot.teamStats,
      warnings: snapshot.warnings,
      importSnapshot: snapshot,
      storage,
      diagnostics: { parser: parsed.parser, contentType: parsed.contentType, games: snapshot.gamesCount, playerStats: snapshot.playerStatsCount },
      summary: `Parsed ${snapshot.gamesCount} games and ${snapshot.playerStatsCount} player-stat rows from GameSheet.`,
    });
  } catch (err) {
    return json(500, { error: err.message || 'GameSheet import failed', hint: 'Try a GameSheet stats page URL, or paste/export CSV from GameSheet.' });
  }
};
