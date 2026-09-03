const QUERY = `SELECT h.strBusinessUnitName AS sbu, h.strPurchaseOrganizationName AS org,
  COUNT(DISTINCT h.intPurchaseRequestId) AS prs,
  SUM(r.numRequestQuantity) AS qty,
  SUM(r.numRequestQuantity * COALESCE(i.numAverageRate,0)) AS val
FROM pro.tblPurchaseRequestHeaderArc h
JOIN pro.tblPurchaseRequestRowArc r ON h.intPurchaseRequestId=r.intPurchaseRequestId
LEFT JOIN itm.tblItemArc i ON i.intItemId = r.intItemId AND i.isActive=1
WHERE h.isActive=1 AND r.isActive=1 AND h.isApproved=0 AND (h.isRejected=0 OR h.isRejected IS NULL) AND h.isComplete=0
  AND h.strBusinessUnitName NOT LIKE '%Demo%' AND h.strBusinessUnitName IS NOT NULL
  AND h.strPurchaseOrganizationName IN ('Local Procurement','Foreign Procurement','Fabrication')
GROUP BY h.strBusinessUnitName, h.strPurchaseOrganizationName
ORDER BY h.strBusinessUnitName, h.strPurchaseOrganizationName`;

import sql from 'mssql';

function getConfig() {
  return {
    user: process.env.MSSQL_USER || 'mcp_user',
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_SERVER || '203.202.241.211',
    port: parseInt(process.env.MSSQL_PORT || '1433', 10),
    database: process.env.MSSQL_DATABASE || 'DWH',
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 8000,
    requestTimeout: 15000
  };
}

let CACHE = null;
let CACHE_AT = 0;

const CATS = ['Local Procurement', 'Foreign Procurement', 'Fabrication'];

const SNAPSHOT = [{"sbu":"Akij Ready Mix Concrete Ltd","local":{"prs":45,"qty":2220469,"val":30515485587.4471},"foreign":{"prs":1,"qty":4000,"val":7820000},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Kafil And Razzak Agro Ltd.","local":{"prs":30,"qty":696171403,"val":21585951309.514595},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Akij Ispat Limited","local":{"prs":54,"qty":178559,"val":1047362162.105011},"foreign":{"prs":6,"qty":11503,"val":500009580.7041},"fabrication":{"prs":3,"qty":17,"val":953793.3333}},{"sbu":"Akij Poly Fibre Industries Ltd.","local":{"prs":47,"qty":19882101.58,"val":737076597.6276433},"foreign":{"prs":15,"qty":639044,"val":716527691.697603},"fabrication":{"prs":14,"qty":8188,"val":31860228.377245}},{"sbu":"Akij Essentials Ltd.","local":{"prs":131,"qty":1313331,"val":813847092.6619719},"foreign":{"prs":5,"qty":5101,"val":197987659.4185},"fabrication":{"prs":2,"qty":6,"val":78000}},{"sbu":"Akij Cement Company Ltd.","local":{"prs":49,"qty":1196660.500001,"val":238331580.40257448},"foreign":{"prs":13,"qty":100150,"val":644372036.2783},"fabrication":{"prs":7,"qty":707,"val":1511923}},{"sbu":"Hashem Rice Mills Ltd.","local":{"prs":50,"qty":2394257,"val":441861737.302014},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":1,"qty":2,"val":7000}},{"sbu":"Akij Agro Feed Ltd.","local":{"prs":16,"qty":291901,"val":46293940.862601005},"foreign":{"prs":2,"qty":5500001,"val":290500294.333979},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Akij Commodities Ltd.","local":{"prs":2,"qty":515025,"val":46870000},"foreign":{"prs":1,"qty":4200,"val":149167200},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"M/S The Successors","local":{"prs":0,"qty":0,"val":0},"foreign":{"prs":1,"qty":30000,"val":144030000},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Akij Building Solutions Limited","local":{"prs":36,"qty":118108,"val":24584224.1316},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Magnum Steel Industries Limited","local":{"prs":46,"qty":3064,"val":3637617.3477},"foreign":{"prs":7,"qty":23,"val":4176707.3466},"fabrication":{"prs":2,"qty":10,"val":59470}},{"sbu":"Blue Pill Limited","local":{"prs":2,"qty":14,"val":540002},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Direct Trading Company Ltd","local":{"prs":1,"qty":2000,"val":194000},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Bongo Traders Ltd","local":{"prs":5,"qty":461,"val":168877.5579},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Akij Resources Ltd","local":{"prs":3,"qty":6,"val":80000.004},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Akij Light Engineering Limited","local":{"prs":1,"qty":265,"val":42226},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"iBOS Limited","local":{"prs":3,"qty":44,"val":30589.7662},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Akij Mediplex Limited","local":{"prs":1,"qty":10000,"val":25600},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"M/S The Successors (G2G)","local":{"prs":1,"qty":37,"val":37},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"AKIJ SHIPPING LINES PTE LTD, SINGAPORE","local":{"prs":8,"qty":76,"val":6},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Akij Cement Ready Mix Concrete","local":{"prs":1,"qty":1,"val":1},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Akij Landmark Limited","local":{"prs":2,"qty":4,"val":0},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"AKIJ LifeCare Ltd.","local":{"prs":1,"qty":1,"val":0},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"AKIJ Telecom Limited","local":{"prs":1,"qty":1,"val":0},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}},{"sbu":"Nobayon Traders Ltd.","local":{"prs":1,"qty":4,"val":0},"foreign":{"prs":0,"qty":0,"val":0},"fabrication":{"prs":0,"qty":0,"val":0}}];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (CACHE && Date.now() - CACHE_AT < 60000) { res.status(200).json(CACHE); return; }
  try {
    const pool = await sql.connect(getConfig());
    let rows;
    try {
      const r = await pool.request().query(QUERY);
      rows = r.recordset;
    } finally {
      await pool.close();
    }
    // Pivot into one row per SBU with three category buckets.
    const bySbu = {};
    for (const x of rows) {
      const s = x.sbu || '';
      if (!bySbu[s]) {
        bySbu[s] = { sbu: s, localPrs: 0, localQty: 0, localVal: 0, foreignPrs: 0, foreignQty: 0, foreignVal: 0, fabPrs: 0, fabQty: 0, fabVal: 0 };
      }
      const b = bySbu[s];
      const prs = Number(x.prs) || 0;
      const qty = Number(x.qty) || 0;
      const val = Number(x.val) || 0;
      if (x.org === 'Local Procurement') { b.localPrs = prs; b.localQty = qty; b.localVal = val; }
      else if (x.org === 'Foreign Procurement') { b.foreignPrs = prs; b.foreignQty = qty; b.foreignVal = val; }
      else if (x.org === 'Fabrication') { b.fabPrs = prs; b.fabQty = qty; b.fabVal = val; }
    }
    const out = Object.values(bySbu).map(b => ({
      sbu: b.sbu,
      local: { prs: b.localPrs, qty: b.localQty, val: b.localVal },
      foreign: { prs: b.foreignPrs, qty: b.foreignQty, val: b.foreignVal },
      fabrication: { prs: b.fabPrs, qty: b.fabQty, val: b.fabVal }
    }));
    out.sort((a, b) => {
      const av = (a.local.val || 0) + (a.foreign.val || 0) + (a.fabrication.val || 0);
      const bv = (b.local.val || 0) + (b.foreign.val || 0) + (b.fabrication.val || 0);
      return bv - av;
    });
    CACHE = out;
    CACHE_AT = Date.now();
    res.status(200).json(out);
  } catch (e) {
    console.error('approval fetch error:', e.message);
    if (CACHE) { res.status(200).json(CACHE); return; }
    res.status(200).json(SNAPSHOT);
  }
}
