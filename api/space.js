const SHEET_ID = '1K2_eIjqKcv2qyGut_6iMGPu8_QuOZxP0qjv3fXo6InM';
const SHEET_GID = '0';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

let CACHE = null;
let CACHE_AT = 0;

function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (ch !== '\r') cur += ch;
    }
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

// Normalize a header cell: collapse whitespace/newlines inside quoted values.
function normHeader(s) {
  return (s || '').trim().replace(/\s+/g, ' ');
}

function toNum(v) {
  const s = String(v || '').replace(/[^0-9.\-]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function mapRow(r, h) {
  const get = (...keys) => {
    for (const k of keys) {
      const i = h.indexOf(k);
      if (i >= 0) return (r[i] || '').trim();
    }
    return '';
  };
  const sbu = get('Lead SBU');
  const wh = get('Name of Warehouse / Godown / Ghat(IBOS)');
  const dist = get('Location in District');
  return {
    sbu,
    wh,
    dist,
    totalArea: toNum(get('Total WH Area in SFT')),
    workway: toNum(get('Workway & Gangway in SFT (Approx 20%)')),
    occupied: toNum(get('Occupied Space in SFT (Approx)')),
    free: toNum(get('Free Space in SFT (Approx)'))
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (CACHE && Date.now() - CACHE_AT < 30000) {
    res.status(200).json(CACHE);
    return;
  }
  try {
    const resp = await fetch(CSV_URL);
    const text = await resp.text();
    const grid = parseCSV(text);
    if (!grid.length) throw new Error('empty sheet');
    const h = grid[0].map(normHeader);
    const slIdx = h.indexOf('SL');
    const out = grid.slice(1)
      .filter(r => slIdx >= 0 && r[slIdx] && r[slIdx].trim() && r[slIdx].trim() !== 'SL')
      .map(r => mapRow(r, h))
      .filter(x => x.wh || x.totalArea > 0 || x.occupied > 0 || x.free > 0);
    CACHE = out;
    CACHE_AT = Date.now();
    res.status(200).json(out);
  } catch (e) {
    console.error('space fetch error:', e.message);
    if (CACHE) { res.status(200).json(CACHE); return; }
    res.status(500).json({ error: e.message });
  }
}
