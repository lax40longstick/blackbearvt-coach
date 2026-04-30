// Shared GameSheet parser for BenchBoss Coach HQ.
// Works with public GameSheet pages, pasted/exported CSV, and TSV-style stat exports.

const ENTITY_MAP = {
  '&nbsp;': ' ', '&amp;': '&', '&#38;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#34;': '"', '&#39;': "'", '&apos;': "'",
};

export function htmlDecode(value = '') {
  return String(value).replace(/&(nbsp|amp|#38|lt|gt|quot|#34|#39|apos);/g, m => ENTITY_MAP[m] || m);
}

export function stripTags(html = '') {
  return htmlDecode(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9#]+/g, '');
}

function pick(row, aliases) {
  for (const alias of aliases) {
    const key = normalizeHeader(alias);
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== '') return row[key];
  }
  return '';
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && quoted && next === '"') { current += '"'; i += 1; }
    else if (ch === '"') quoted = !quoted;
    else if (ch === delimiter && !quoted) { cells.push(current.trim()); current = ''; }
    else current += ch;
  }
  cells.push(current.trim());
  return cells.map(c => c.replace(/^"|"$/g, '').trim());
}

export function parseDelimitedStats(text = '') {
  const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!lines.length) return { games: [], playerStats: [], rawRows: [], warnings: ['No rows found.'] };
  const delimiter = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : ',';
  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);
  const rows = lines.slice(1).map(line => {
    const cells = splitDelimitedLine(line, delimiter);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
  const playerStats = rows.map(rowToPlayerStat).filter(r => r.name || r.num);
  const games = rows.map(rowToGame).filter(g => g.date || g.home || g.away || g.status);
  return { games, playerStats, rawRows: rows, warnings: [] };
}

function rowToPlayerStat(r) {
  const g = toNumber(pick(r, ['g', 'goals']));
  const a = toNumber(pick(r, ['a', 'assists']));
  const pts = pick(r, ['pts', 'points']) === '' ? g + a : toNumber(pick(r, ['pts', 'points']));
  return {
    num: pick(r, ['#', 'no', 'num', 'number', 'jersey', 'jerseynumber', 'playernumber']),
    name: pick(r, ['player', 'name', 'playername', 'skater']),
    team: pick(r, ['team', 'teamname']),
    pos: pick(r, ['pos', 'position']),
    gp: toNumber(pick(r, ['gp', 'gamesplayed', 'games'])),
    g,
    a,
    pts,
    pim: toNumber(pick(r, ['pim', 'penaltyminutes', 'penalties'])),
    sog: toNumber(pick(r, ['sog', 'shots', 'shotsongoal'])),
    ppg: toNumber(pick(r, ['ppg', 'powerplaygoals'])),
    shg: toNumber(pick(r, ['shg', 'shorthandedgoals'])),
  };
}

function rowToGame(r) {
  return {
    date: pick(r, ['date', 'gamedate', 'playedon']),
    time: pick(r, ['time', 'gametime']),
    away: pick(r, ['away', 'awayteam', 'visitor', 'visitorteam']),
    awayScore: pick(r, ['awayscore', 'visitorscore']),
    home: pick(r, ['home', 'hometeam']),
    homeScore: pick(r, ['homescore']),
    status: pick(r, ['status', 'result']),
    rink: pick(r, ['rink', 'venue', 'location']),
    gameId: pick(r, ['gameid', 'id']),
  };
}

function parseCells(rowHtml) {
  return (String(rowHtml).match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []).map(stripTags).filter(Boolean);
}

function findNumericScore(cells) {
  const nums = [];
  for (const c of cells) {
    if (/^\d{1,2}$/.test(c)) nums.push(Number(c));
  }
  return nums;
}

export function parseGameSheetHtml(html = '', options = {}) {
  const warnings = [];
  const games = [];
  const playerStats = [];
  const tables = String(html || '').match(/<table[\s\S]*?<\/table>/gi) || [];

  tables.forEach((table) => {
    const rowHtmls = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    if (!rowHtmls.length) return;
    const headerCells = parseCells(rowHtmls[0]);
    const headers = headerCells.map(normalizeHeader);
    const headerLine = headers.join('|');
    const looksLikePlayerStats = /(player|skater|name)/.test(headerLine) && /(pts|points|goals|assists|pim|gp)/.test(headerLine);
    const looksLikeGames = /(home|away|visitor|score|date|status|result)/.test(headerLine);

    rowHtmls.slice(1).forEach(rowHtml => {
      const cells = parseCells(rowHtml);
      if (cells.length < 2) return;
      if (looksLikePlayerStats) {
        const row = {};
        headers.forEach((h, i) => { row[h] = cells[i] || ''; });
        const stat = rowToPlayerStat(row);
        if (stat.name || stat.num) playerStats.push(stat);
        return;
      }
      if (looksLikeGames) {
        const row = {};
        headers.forEach((h, i) => { row[h] = cells[i] || ''; });
        const game = rowToGame(row);
        if (game.date || game.home || game.away) games.push(game);
        return;
      }

      const line = cells.join(' | ');
      const scoreNums = findNumericScore(cells);
      const hasGameWords = /\b(Final|Scheduled|OT|SO|Cancelled|Postponed|Forfeit)\b/i.test(line);
      const dateCell = cells.find(c => /\b\d{1,2}[\/-]\d{1,2}\b/.test(c) || /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(c));
      if (scoreNums.length >= 2 || hasGameWords) {
        games.push({
          date: dateCell || cells[0] || '',
          time: cells.find(c => /\d{1,2}:\d{2}/.test(c)) || '',
          away: cells[1] || cells[0] || '',
          awayScore: scoreNums[0] ?? '',
          homeScore: scoreNums[1] ?? '',
          home: cells[cells.length - 2] || cells[cells.length - 1] || '',
          status: cells.find(c => /Final|Scheduled|OT|SO|Cancelled|Postponed|Forfeit/i.test(c)) || '',
          raw: line,
        });
      }
    });
  });

  if (!tables.length) warnings.push('No HTML tables found. GameSheet may require client-side rendering for this page; use CSV paste/export fallback.');
  if (!games.length && !playerStats.length) warnings.push('No games or player-stat rows found in public page. Try a GameSheet stats page URL or paste CSV export.');
  return { games: dedupeGames(games), playerStats: mergePlayerStats(playerStats), warnings };
}

function dedupeGames(games) {
  const seen = new Set();
  return games.filter(g => {
    const key = [g.date, g.time, g.away, g.awayScore, g.homeScore, g.home, g.status].join('|').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function mergePlayerStats(rows) {
  const map = new Map();
  rows.forEach(r => {
    const key = `${String(r.num || '').trim()}|${String(r.name || '').trim().toLowerCase()}`;
    if (!key.replace('|','')) return;
    const existing = map.get(key) || { ...r, gp: 0, g: 0, a: 0, pts: 0, pim: 0, sog: 0, ppg: 0, shg: 0 };
    ['gp','g','a','pts','pim','sog','ppg','shg'].forEach(k => { existing[k] = Math.max(toNumber(existing[k]), toNumber(r[k])); });
    existing.num = existing.num || r.num;
    existing.name = existing.name || r.name;
    existing.team = existing.team || r.team;
    map.set(key, existing);
  });
  return Array.from(map.values()).sort((a, b) => (b.pts || 0) - (a.pts || 0));
}

export function summarizeGames(games = [], teamName = 'Black Bear') {
  let wins = 0, losses = 0, ties = 0, goalsFor = 0, goalsAgainst = 0, counted = 0;
  games.forEach(g => {
    const a = Number(g.awayScore); const h = Number(g.homeScore);
    if (!Number.isFinite(a) || !Number.isFinite(h)) return;
    const haystack = `${g.away || ''} ${g.home || ''}`;
    const needle = String(teamName || 'Black Bear').replace(/s$/i, '');
    const teamRegex = new RegExp(needle, 'i');
    if (!teamRegex.test(haystack)) return;
    const isHome = teamRegex.test(g.home || '');
    const our = isHome ? h : a;
    const opp = isHome ? a : h;
    counted += 1;
    goalsFor += our;
    goalsAgainst += opp;
    if (our > opp) wins += 1;
    else if (our < opp) losses += 1;
    else ties += 1;
  });
  return { record: counted ? `${wins}-${losses}-${ties}` : '', wins, losses, ties, goalsFor, goalsAgainst, countedGames: counted || games.length };
}

export function buildImportSnapshot({ url = '', games = [], playerStats = [], teamStats = null, warnings = [], source = 'gamesheet' }) {
  return {
    id: `gs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    source,
    url,
    importedAt: new Date().toISOString(),
    gamesCount: games.length,
    playerStatsCount: playerStats.length,
    teamStats,
    warnings,
    games: games.slice(0, 150),
    playerStats: playerStats.slice(0, 300),
  };
}
