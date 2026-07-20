/* POST /api/log — synchronise un rituel vers la base Notion
   "Historique des Rituels · Teaven".
   Corps : {action:"upsert", entry:{id,date,site,mode,staff,pct,done,total,missed[]}}
        ou {action:"delete", id}
   503 si aucun jeton Notion n'est configuré (l'app bascule en mode local). */

const NOTION_VERSION = '2022-06-28';
const DB_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_DB_ID
  || '6a8ca5dfd83e460a9627dbe4e74f12d5'; /* Historique des Rituels · Teaven */

function notionToken() {
  const env = process.env;
  const direct = env.NOTION_TOKEN || env.NOTION_API_KEY || env.NOTION_SECRET || env.NOTION_API_TOKEN;
  if (direct) return direct;
  /* Tolérant au nom de variable : toute valeur au format jeton Notion convient,
     priorité aux variables dont le nom contient NOTION. */
  let fallback = null;
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === 'string' && /^(ntn_|secret_)[A-Za-z0-9]/.test(v)) {
      if (/NOTION/i.test(k)) return v;
      if (!fallback) fallback = v;
    }
  }
  return fallback;
}

async function notion(path, method, token, body) {
  const r = await fetch('https://api.notion.com/v1/' + path, {
    method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error('notion ' + r.status + ' ' + t.slice(0, 300));
  }
  return r.json();
}

async function findByEntryId(token, id) {
  const d = await notion('databases/' + DB_ID + '/query', 'POST', token, {
    filter: { property: 'ID', rich_text: { equals: id } },
    page_size: 1,
  });
  return d.results && d.results[0] ? d.results[0].id : null;
}

function rt(s) {
  return [{ text: { content: String(s == null ? '' : s).slice(0, 1900) } }];
}

function buildProps(e) {
  const missed = Array.isArray(e.missed) ? e.missed : [];
  const done = Number(e.done) || 0;
  const total = Number(e.total) || 0;
  return {
    'Rituel': { title: rt((e.mode || 'Rituel') + (e.site ? ' · ' + e.site : '') + (e.date ? ' · ' + e.date : '')) },
    'Date': e.date ? { date: { start: e.date } } : { date: null },
    'Site': e.site ? { select: { name: e.site } } : { select: null },
    'Type': e.mode ? { select: { name: e.mode } } : { select: null },
    'Personne': { rich_text: rt(e.staff || '') },
    'Gestes faits': { number: done },
    'Gestes manqués': { number: Math.max(0, total - done) },
    'Gestes total': { number: total },
    'Taux %': { number: Number(e.pct) || 0 },
    'Détail des manqués': { rich_text: rt(missed.join(' | ')) },
    'ID': { rich_text: rt(e.id) },
  };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }
  const token = notionToken();
  if (!token) { res.status(503).json({ error: 'notion_not_configured' }); return; }
  try {
    const body = req.body || {};
    if (body.action === 'delete') {
      if (!body.id) { res.status(400).json({ error: 'missing_id' }); return; }
      const pageId = await findByEntryId(token, body.id);
      if (pageId) await notion('pages/' + pageId, 'PATCH', token, { archived: true });
      res.status(200).json({ ok: true });
      return;
    }
    if (body.action === 'upsert' && body.entry && body.entry.id) {
      const e = body.entry;
      const pageId = await findByEntryId(token, e.id);
      if (pageId) await notion('pages/' + pageId, 'PATCH', token, { properties: buildProps(e) });
      else await notion('pages', 'POST', token, { parent: { database_id: DB_ID }, properties: buildProps(e) });
      res.status(200).json({ ok: true });
      return;
    }
    res.status(400).json({ error: 'bad_request' });
  } catch (err) {
    res.status(500).json({ error: String((err && err.message) || err) });
  }
};
