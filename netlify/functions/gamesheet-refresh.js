// netlify/functions/gamesheet-refresh.js
// Scheduled/manual GameSheet refresh. Configure GAMESHEET_SYNC_URLS as JSON array or comma-separated URLs.

import { handler as importHandler } from './gamesheet-import.js';

export const config = {
  schedule: process.env.GAMESHEET_REFRESH_SCHEDULE || '@daily',
};

function configuredTargets() {
  const raw = process.env.GAMESHEET_SYNC_URLS || process.env.GAMESHEET_PUBLIC_URL || '';
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(item => typeof item === 'string' ? { url: item } : item).filter(x => x.url);
  } catch (_) {}
  return raw.split(',').map(url => ({ url: url.trim() })).filter(x => x.url);
}

export const handler = async function handler(event) {
  const targets = configuredTargets();
  if (!targets.length) {
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, refreshed: 0, note: 'No GAMESHEET_SYNC_URLS configured.' }) };
  }
  const results = [];
  for (const target of targets) {
    const fakeEvent = {
      ...event,
      httpMethod: 'POST',
      body: JSON.stringify({ url: target.url, teamName: target.teamName || 'Black Bear', teamId: target.teamId || null, persist: true }),
      queryStringParameters: {},
    };
    const response = await importHandler(fakeEvent);
    let body = {};
    try { body = JSON.parse(response.body || '{}'); } catch (_) {}
    results.push({ url: target.url, statusCode: response.statusCode, summary: body.summary, error: body.error, diagnostics: body.diagnostics, storage: body.storage });
  }
  return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, refreshed: results.length, results }) };
};
