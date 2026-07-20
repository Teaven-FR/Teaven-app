/* GET /api/history — renvoie l'historique des rituels depuis la base Notion
   "Historique des Rituels · Teaven" sous la forme {entries:[...]}.
   Sans jeton Notion configuré (ou en cas d'erreur), renvoie {entries:[]} :
   l'app reste alors sur son historique local. */

const NOTION_VERSION = '2022-06-28';
const DB_ID = process.env.NOTION_DATABASE_ID || process.env.NOTION_DB_ID
  || '6a8ca5dfd83e460a9627dbe4e74f12d5'; /* Historique des Rituels · Teaven */

function notionToken() {
  const env = process.env;
  const direct = env.NOTION_TOKEN || env.NOTION_API_KEY || env.NOTION_SECRET || env.NOTION_API_TOKEN;
  if (direct) return direct;
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

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const token = notionToken();
  if (!token) { res.status(200).json({ entries: [] }); return; }
  try {
    const entries = [];
    let cursor;
    do {
      const q = { page_size: 100, sorts: [{ property: 'Date', direction: 'descending' }] };
      if (cursor) q.start_cursor = cursor;
      const d = await notion('databases/' + DB_ID + '/query', 'POST', token, q);
      for (const p of d.results || []) {
        const pr = p.properties || {};
        const txt = (o) => (o && o.rich_text && o.rich_text.map((t) => t.plain_text).join('')) || '';
        const id = txt(pr['ID']);
        if (!id) continue;
        const missedRaw = txt(pr['Détail des manqués']);
        entries.push({
          id,
          date: (pr['Date'] && pr['Date'].date && pr['Date'].date.start) || '',
          site: (pr['Site'] && pr['Site'].select && pr['Site'].select.name) || '',
          mode: (pr['Type'] && pr['Type'].select && pr['Type'].select.name) || '',
          staff: txt(pr['Personne']),
          done: (pr['Gestes faits'] && pr['Gestes faits'].number) || 0,
          total: (pr['Gestes total'] && pr['Gestes total'].number) || 0,
          pct: (pr['Taux %'] && pr['Taux %'].number) || 0,
          missed: missedRaw ? missedRaw.split(' | ') : [],
        });
      }
      cursor = d.has_more ? d.next_cursor : undefined;
    } while (cursor);
    res.status(200).json({ entries });
  } catch (err) {
    res.status(200).json({ entries: [] });
  }
};
