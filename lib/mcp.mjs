// iBOS ERP MCP client — fetch core inventory KPIs via the MCP (read-only)
const MCP_URL = 'https://arl-mcp.ibos.io/mcp';

const KEYS = {
  dom: process.env.IBOS_MCP_DOM_KEY || 'ibos_mcp_sec_dom_4f8a9b0c_1d2e_2f3a_4b5c_6d7e8f9a0b1c_D0mn',
  fin: process.env.IBOS_MCP_FIN_KEY || 'ibos_mcp_sec_fin_9c3d4e5f_6a7b_8c9d_0e1f_2a3b4c5d6e7f_F1n4',
  pro: process.env.IBOS_MCP_PRO_KEY || 'ibos_mcp_sec_pro_8b2c3d4e_5f6a_7b8c_9d0e_1f2a3b4c5d6e_Pr0c',
  wms: process.env.IBOS_MCP_WMS_KEY || 'ibos_mcp_sec_wms_1e5f6a7b_8c9d_0e1f_2a3b_4c5d6e7f8a9b_WmS9',
};

const INV_GL = '32,33,38,41,42,43';

function parseCell(s) {
  const t = String(s == null ? '' : s).trim();
  if (t === '' || t === '-') return '';
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : t;
}

function parseMarkdownTable(text) {
  const rows = [];
  for (const line of String(text || '').split('\n')) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    rows.push(t.split('|').slice(1, -1).map((c) => c.trim()));
  }
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(2).map((r) => {
    const o = {};
    headers.forEach((h, i) => { o[h] = parseCell(r[i]); });
    return o;
  });
}

export async function mcpQuery(sql, limit = 200, module = 'dom') {
  const res = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'X-API-Key': KEYS[module] || KEYS.dom,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name: 'ExecuteReadOnlyQueryAsync', arguments: { sqlQuery: sql, limit } },
    }),
  });
  const j = await res.json();
  const text = j && j.result && j.result.content && j.result.content[0] ? j.result.content[0].text : '';
  return parseMarkdownTable(text);
}

export async function fetchCoreData() {
  const [stock, pr, aging, dio, businessUnits] = await Promise.all([
    mcpQuery(
      `SELECT bu.strBusinessUnitName AS s, ISNULL(SUM(j.numAmount),0) AS v
       FROM dco.tblBusinessUnit bu
       LEFT JOIN fin.tblAccountingJournal j ON bu.intBusinessUnitId = j.intBusinessUnitId
         AND j.isActive=1 AND j.intGeneralLedgerId IN (${INV_GL})
       WHERE bu.isActive=1
       GROUP BY bu.strBusinessUnitName
       HAVING ISNULL(SUM(j.numAmount),0) <> 0
       ORDER BY ISNULL(SUM(j.numAmount),0) DESC`,
      200, 'fin',
    ),
    mcpQuery(
      `SELECT TOP 15 h.strBusinessUnitName AS s,
         COUNT(DISTINCT h.intPurchaseRequestId) AS n,
         SUM(r.numRestQuantity) AS q,
         COUNT(DISTINCT r.strItemName) AS it,
         CONVERT(varchar, MAX(h.dteRequestDate), 23) AS d
       FROM pro.tblPurchaseRequestHeader h
       JOIN pro.tblPurchaseRequestRow r ON h.intPurchaseRequestId = r.intPurchaseRequestId
       WHERE h.isActive=1 AND r.isActive=1 AND h.isComplete=0 AND h.strBusinessUnitName NOT LIKE '%Demo%'
       GROUP BY h.strBusinessUnitName
       ORDER BY SUM(r.numRestQuantity) DESC`,
      100, 'pro',
    ),
    mcpQuery(
      `SELECT bu.strBusinessUnitName AS s,
         ISNULL(SUM(j.numAmount),0) AS v,
         DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) AS d,
         CASE WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) > 365 THEN 'Obsolete'
              WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 181 THEN 'Non-Moving'
              WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 91 THEN 'Slow-Moving'
              WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 31 THEN 'Moving'
              ELSE 'Fast-Moving' END AS c
       FROM dco.tblBusinessUnit bu
       LEFT JOIN fin.tblAccountingJournal j ON bu.intBusinessUnitId = j.intBusinessUnitId
         AND j.isActive=1 AND j.intGeneralLedgerId IN (${INV_GL})
       WHERE bu.isActive=1
       GROUP BY bu.strBusinessUnitName
       HAVING MAX(j.dteTransactionDate) IS NOT NULL
         AND (DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) > 90 OR ISNULL(SUM(j.numAmount),0) <> 0)`,
      200, 'fin',
    ),
    mcpQuery(
      `SELECT bu.strBusinessUnitName AS s,
         SUM(CASE WHEN j.intGeneralLedgerId IN (${INV_GL}) THEN j.numAmount ELSE 0 END) AS inv,
         ABS(SUM(CASE WHEN j.strGeneralLedgerCode LIKE '4810%' THEN j.numAmount ELSE 0 END)) AS cogs
       FROM fin.tblAccountingJournal j
       JOIN dco.tblBusinessUnit bu ON j.intBusinessUnitId = bu.intBusinessUnitId
       WHERE j.isActive=1 AND bu.isActive=1 AND j.dteTransactionDate >= '2026-01-01'
       GROUP BY bu.strBusinessUnitName
       HAVING ABS(SUM(CASE WHEN j.strGeneralLedgerCode LIKE '4810%' THEN j.numAmount ELSE 0 END)) > 0
       ORDER BY SUM(CASE WHEN j.intGeneralLedgerId IN (${INV_GL}) THEN j.numAmount ELSE 0 END) DESC`,
      200, 'fin',
    ),
    mcpQuery(
      `SELECT strBusinessUnitName AS s
       FROM dco.tblBusinessUnit
       WHERE isActive=1 AND strBusinessUnitName IS NOT NULL AND strBusinessUnitName <> ''
       ORDER BY strBusinessUnitName`,
      200, 'dom',
    ),
  ]);

  return {
    stock: stock.map((r) => ({ s: r.s, v: Number(r.v) || 0 })),
    pr: pr.map((r) => ({ s: r.s, q: Number(r.q) || 0, n: Number(r.n) || 0, it: Number(r.it) || 0, d: r.d })),
    aging: aging.map((r) => ({ s: r.s, i: 'Inventory', v: Number(r.v) || 0, d: Number(r.d) || 0, c: r.c })),
    dio: dio.map((r) => ({ s: r.s, inv: Number(r.inv) || 0, cogs: Number(r.cogs) || 0 })),
    businessUnits: businessUnits.map((r) => r.s),
  };
}
