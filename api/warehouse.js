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

function mapRow(r, h) {
  const get = (...keys) => {
    for (const k of keys) {
      const i = h.indexOf(k);
      if (i >= 0) return (r[i] || '').trim();
    }
    return '';
  };
  return {
    sl: get('SL'),
    rp: get('Responsible Person'),
    contact: get('Responsible Contact No.'),
    sbu: get('Agreement with the SBU'),
    vendor: get('Vendor Name', 'Trade Name'),
    dist: get('Location in District'),
    gmap: get('G-Map'),
    valid: get('Validity Status'),
    area: get('Area in SFT'),
    file: get('Agreement File', 'Document Agreement File')
  };
}

// Extract a lat,lng string from a G-Map value (handles @lat,lng, DMS, goo.gl links).
function extractCoords(g) {
  if (!g) return '';
  const m = g.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) return m[1] + ',' + m[2];
  const dm = g.match(/(\d+)[\u00b0 ]\s*(\d+)'[ ]*([\d.]+)?[" ]*\s*([NSns])\s*(\d+)[\u00b0 ]\s*(\d+)'[ ]*([\d.]+)?[" ]*\s*([EWew])/);
  if (dm) {
    let lat = (+dm[1]) + (+dm[2]) / 60 + ((dm[3] ? +dm[3] : 0)) / 3600;
    let lng = (+dm[5]) + (+dm[6]) / 60 + ((dm[7] ? +dm[7] : 0)) / 3600;
    if (/[Ss]/.test(dm[4])) lat = -lat;
    if (/[Ww]/.test(dm[8])) lng = -lng;
    return lat.toFixed(6) + ',' + lng.toFixed(6);
  }
  return '';
}

// Resolve goo.gl / maps.app.goo.gl short links to coordinates (with a small cache).
const LINK_CACHE = {};
async function resolveLinkCoords(url) {
  if (LINK_CACHE[url]) return LINK_CACHE[url];
  let out = '';
  try {
    const r = await fetch(url, { redirect: 'follow' });
    const fin = r.url || '';
    const m = fin.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) ||
              fin.match(/[?&](?:q|query|daddr|saddr|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (m) out = m[1] + ',' + m[2];
  } catch (e) {
    out = '';
  }
  LINK_CACHE[url] = out;
  return out;
}

// Add a "coords" field to each row: resolved lat,lng for the pin.
async function enrichRows(rows) {
  for (const x of rows) {
    const g = (x.gmap || '').trim();
    if (!g) { x.coords = ''; continue; }
    const direct = extractCoords(g);
    if (direct) { x.coords = direct; continue; }
    const link = g.match(/https?:\/\/[^\s]+/);
    if (link && /goo\.gl|maps\.app\.goo\.gl|google\.com\/maps/.test(link[0])) {
      x.coords = await resolveLinkCoords(link[0]);
    } else {
      x.coords = '';
    }
  }
  return rows;
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
    const h = grid[0].map(x => x.trim());
    const slIdx = h.indexOf('SL');
    const out = grid.slice(1)
      .filter(r => slIdx >= 0 && r[slIdx] && r[slIdx].trim() && r[slIdx].trim() !== 'SL')
      .map(r => mapRow(r, h));
    await enrichRows(out);
    CACHE = out;
    CACHE_AT = Date.now();
    res.status(200).json(out);
  } catch (e) {
    console.error('warehouse fetch error:', e.message);
    if (CACHE) { res.status(200).json(CACHE); return; }
    res.status(500).json({ error: e.message });
  }
}
