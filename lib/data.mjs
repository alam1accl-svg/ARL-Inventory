import sql from 'mssql';

const INV_GL = '32,33,38,41,42,43';

function getConfig() {
  return {
    user: process.env.MSSQL_USER || 'mcp_user',
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_SERVER || '203.202.241.211',
    port: parseInt(process.env.MSSQL_PORT || '1433', 10),
    database: process.env.MSSQL_DATABASE || 'DWH',
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30000 },
    connectionTimeout: 6000,
    requestTimeout: 10000
  };
}

async function queryPool(pool, q) {
  const r = await pool.request().query(q);
  return r.recordset;
}

export async function fetchAll() {
  if (!process.env.MSSQL_PASSWORD) {
    throw new Error('MSSQL_PASSWORD env not configured');
  }
  const pool = await sql.connect(getConfig());
  try {
    const [stock, pr, aging, dio, clearance] = await Promise.all([
      queryPool(pool, `SELECT TOP 40 bu.strBusinessUnit AS s, ISNULL(SUM(j.numAmount),0) AS v
        FROM saas.masterBusinessUnitArc bu
        LEFT JOIN fin.tblAccountingJournalArc j ON bu.intBusinessUnitId = j.intBusinessUnitId
          AND j.isActive=1 AND j.dteTransactionDate <= GETDATE() AND j.intGeneralLedgerId IN (${INV_GL})
        WHERE bu.isActive=1 AND bu.strBusinessUnit NOT LIKE '%Demo%'
        GROUP BY bu.strBusinessUnit
        HAVING ISNULL(SUM(j.numAmount),0) <> 0
        ORDER BY ISNULL(SUM(j.numAmount),0) DESC`),

      queryPool(pool, `SELECT TOP 15 h.strBusinessUnitName AS s,
          COUNT(DISTINCT h.intPurchaseRequestId) AS n,
          SUM(r.numRestQuantity) AS q,
          COUNT(DISTINCT r.strItemName) AS it,
          CONVERT(varchar, MAX(h.dteRequestDate), 23) AS d
        FROM pro.tblPurchaseRequestHeaderArc h
        JOIN pro.tblPurchaseRequestRowArc r ON h.intPurchaseRequestId = r.intPurchaseRequestId
        WHERE h.isActive=1 AND r.isActive=1 AND h.isComplete=0 AND h.strBusinessUnitName NOT LIKE '%Demo%'
        GROUP BY h.strBusinessUnitName
        ORDER BY SUM(r.numRestQuantity) DESC`),

      queryPool(pool, `SELECT bu.strBusinessUnit AS s,
          ISNULL(SUM(j.numAmount),0) AS v,
          DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) AS d,
          CASE WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) > 365 THEN 'Obsolete'
            WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 181 THEN 'Non-Moving'
            WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 91 THEN 'Slow-Moving'
            WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 31 THEN 'Moving'
            ELSE 'Fast-Moving' END AS c
        FROM saas.masterBusinessUnitArc bu
        LEFT JOIN fin.tblAccountingJournalArc j ON bu.intBusinessUnitId = j.intBusinessUnitId
          AND j.isActive=1 AND j.dteTransactionDate <= GETDATE() AND j.intGeneralLedgerId IN (${INV_GL})
        WHERE bu.isActive=1 AND bu.strBusinessUnit NOT LIKE '%Demo%'
        GROUP BY bu.strBusinessUnit
        HAVING MAX(j.dteTransactionDate) IS NOT NULL AND (DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) > 90 OR ISNULL(SUM(j.numAmount),0) <> 0)`),

      queryPool(pool, `SELECT bu.strBusinessUnit AS s,
          SUM(CASE WHEN j.intGeneralLedgerId IN (${INV_GL}) THEN j.numAmount ELSE 0 END) AS inv,
          ABS(SUM(CASE WHEN ac.strAccountClassCode LIKE '4800000%' THEN j.numAmount ELSE 0 END)) AS cogs
        FROM fin.tblAccountingJournalArc j
        JOIN fin.tblGeneralLedgerArc gl ON j.intGeneralLedgerId = gl.intGeneralLedgerId
        JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
        JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
        JOIN saas.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
        WHERE j.isActive=1 AND bu.isActive=1 AND bu.strBusinessUnit NOT LIKE '%Demo%'
          AND j.dteTransactionDate >= '2026-01-01' AND j.dteTransactionDate <= GETDATE()
        GROUP BY bu.strBusinessUnit
        HAVING ABS(SUM(CASE WHEN ac.strAccountClassCode LIKE '4800000%' THEN j.numAmount ELSE 0 END)) > 0
        ORDER BY SUM(CASE WHEN j.intGeneralLedgerId IN (${INV_GL}) THEN j.numAmount ELSE 0 END) DESC`),

      queryPool(pool, `SELECT TOP 40 strBusinessUnitName AS s, COUNT(*) AS c, ISNULL(SUM(numLastMonthSalary),0) AS sal
        FROM saas.EmpClearanceApplicationArc
        WHERE isActive=1 AND (strStatus='Pending' OR strStatus IS NULL)
        GROUP BY strBusinessUnitName
        ORDER BY COUNT(*) DESC`)
    ]);

    return {
      generatedAt: new Date().toISOString(),
      stock,
      pr,
      aging,
      dio,
      clearance
    };
  } finally {
    await pool.close();
  }
}

export const SNAPSHOT = {
  generatedAt: '2026-08-18T00:00:00.000Z',
  stock: [
    { s: 'Akij Ispat Limited', v: 3977004119 }, { s: 'Batayon Traders Ltd.', v: 2475120733 },
    { s: 'Hashem Rice Mills Ltd.', v: 1696324200 }, { s: 'Akij Agro Feed Ltd.', v: 1442015164 },
    { s: 'Nobayon Traders Ltd.', v: 1357283125 }, { s: 'Akij Cement Company Ltd.', v: 734171870 },
    { s: 'Akij Light Engineering Limited', v: 455965306 }, { s: 'Akij Poly Fibre Industries Ltd.', v: 391068210 },
    { s: 'Fariq Agro Ltd.', v: 260444793 }, { s: 'M/S The Successors', v: 256363772 },
    { s: 'Akij Ready Mix Concrete Ltd', v: 183253284 }, { s: 'Akij Building Solutions Limited', v: 165131514 },
    { s: 'Akij InfoTech Ltd.', v: 126655454 }, { s: 'AKIJ LifeCare Ltd.', v: 82525097 },
    { s: 'Lineasia Trading Co. Ltd.', v: 77258114 }, { s: 'AKIJ Automobile Industries Ltd.', v: 74628478 },
    { s: 'AKIJ Telecom Limited', v: 45218893 }, { s: 'ARL Traders Ltd.', v: 40050336 },
    { s: 'Akij Breeders Limited', v: 34405659 }, { s: 'AKIJ Consumer Electronics Limited', v: 32991387 },
    { s: 'Blue Pill Limited', v: 17934728 }, { s: 'Akij Resource', v: 5349000 },
    { s: 'Akij Electrofab Limited', v: 192518 }, { s: 'Akij Shipping Line Ltd.', v: 293950 },
    { s: 'Asia One Trading Company Ltd', v: -47896691 }, { s: 'Bongo Traders Ltd', v: -53521927 },
    { s: 'Daily Trading Company Ltd', v: -43713646 }, { s: 'Magnum Steel Industries Limited', v: -69870519 },
    { s: 'Direct Trading Company Ltd', v: -237392653 }, { s: 'Akij Commodities Ltd.', v: -239332546 },
    { s: 'Eurasia Trading Company Ltd', v: -420802148 }, { s: 'Akij Essentials Ltd.', v: -29149013847863 }
  ],
  pr: [
    { s: 'Kafil And Razzak Agro Ltd.', q: 798595196, n: 1292, it: 2313, d: '2025-11-19' },
    { s: 'Hashem Rice Mills Ltd.', q: 326111706, n: 3119, it: 4033, d: '2026-08-13' },
    { s: 'Akij Light Engineering Limited', q: 266287619, n: 2181, it: 5469, d: '2026-08-18' },
    { s: 'Akij Essentials Ltd.', q: 213250832, n: 9738, it: 10286, d: '2026-08-18' },
    { s: 'Akij Agro Feed Ltd.', q: 194438338, n: 4230, it: 6519, d: '2026-08-18' },
    { s: 'Daily Trading Company Ltd', q: 62751456, n: 184, it: 156, d: '2026-08-18' },
    { s: 'Akij Poly Fibre Industries Ltd.', q: 60424159, n: 3226, it: 8525, d: '2026-08-16' },
    { s: 'Akij Cement Company Ltd.', q: 50606345, n: 13571, it: 16214, d: '2026-08-18' },
    { s: 'Nobayon Traders Ltd.', q: 45968406, n: 69, it: 69, d: '2026-08-06' },
    { s: 'Akij Ready Mix Concrete Ltd', q: 24421225, n: 8984, it: 8479, d: '2026-08-18' }
  ],
  aging: [
    { s: 'Batayon Traders Ltd.', i: 'Inventory', v: 2475120733, d: 383, c: 'Obsolete' },
    { s: 'Lineasia Trading Co. Ltd.', i: 'Inventory', v: 77258114, d: 378, c: 'Obsolete' },
    { s: 'Eurasia Trading Company Ltd', i: 'Inventory', v: -420802148, d: 210, c: 'Non-Moving' },
    { s: 'Direct Trading Company Ltd', i: 'Inventory', v: -237392653, d: 199, c: 'Non-Moving' },
    { s: 'ARL Traders Ltd.', i: 'Inventory', v: 40050336, d: 107, c: 'Slow-Moving' },
    { s: 'Akij Resource', i: 'Inventory', v: 5349000, d: 107, c: 'Slow-Moving' },
    { s: 'M/S The Successors', i: 'Inventory', v: 256363772, d: 97, c: 'Slow-Moving' }
  ],
  dio: [
    { s: 'Akij Ispat Limited', inv: 447235999, cogs: 7410620801 },
    { s: 'Akij Agro Feed Ltd.', inv: 762916074, cogs: 5237737386 },
    { s: 'Akij Cement Company Ltd.', inv: 517951909, cogs: 7081633090 },
    { s: 'Hashem Rice Mills Ltd.', inv: 332484760, cogs: 2858204312 },
    { s: 'Akij Light Engineering Limited', inv: 293299777, cogs: 654864874 },
    { s: 'M/S The Successors', inv: 238461372, cogs: 1166678 },
    { s: 'Nobayon Traders Ltd.', inv: 77838124, cogs: 2295375368 },
    { s: 'AKIJ Automobile Industries Ltd.', inv: 68911629, cogs: 148742958 },
    { s: 'AKIJ Consumer Electronics Limited', inv: 32991387, cogs: 42184755 },
    { s: 'AKIJ LifeCare Ltd.', inv: 19173780, cogs: 300204508 },
    { s: 'Fariq Agro Ltd.', inv: 18195300, cogs: 382792832 },
    { s: 'Blue Pill Limited', inv: 12454287, cogs: 87665089 },
    { s: 'Akij Poly Fibre Industries Ltd.', inv: 12279064, cogs: 835756987 },
    { s: 'Akij Breeders Limited', inv: 7326314, cogs: 58217531 },
    { s: 'AKIJ Telecom Limited', inv: 1616463, cogs: 35488037 },
    { s: 'Akij Electrofab Limited', inv: 192518, cogs: 10886015 }
  ],
  clearance: [
    { s: 'Akij Cement Company Ltd.', c: 449, sal: 12165483 }, { s: 'Akij Essentials Ltd.', c: 202, sal: 6818570 },
    { s: 'Akij Ispat Limited', c: 129, sal: 3990021 }, { s: 'Akij Poly Fibre Industries Ltd.', c: 101, sal: 1862459 },
    { s: 'Akij Light Engineering Limited', c: 98, sal: 2286534 }, { s: 'Akij Ready Mix Concrete Ltd', c: 80, sal: 1619485 },
    { s: 'Akij Resource', c: 71, sal: 6797564 }, { s: 'Akij Agro Feed Ltd.', c: 69, sal: 2456482 },
    { s: 'Blue Pill Limited', c: 50, sal: 2266562 }, { s: 'Hashem Rice Mills Ltd.', c: 43, sal: 939315 },
    { s: 'Akij Air Service Ltd.', c: 33, sal: 449398 }, { s: 'AKIJ Telecom Limited', c: 29, sal: 872793 },
    { s: 'Bongo Traders Ltd', c: 28, sal: 658914 }, { s: 'Akij Shipping Line Ltd.', c: 21, sal: 888487 },
    { s: 'Akij Building Solutions Limited', c: 20, sal: 747175 }, { s: 'Akij Logistics Ltd.', c: 19, sal: 770259 }
  ]
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  try {
    const data = await fetchAll();
    res.status(200).json(data);
  } catch (e) {
    console.error('data fetch error:', e.message, '- serving snapshot');
    const snap = JSON.parse(JSON.stringify(SNAPSHOT));
    snap.generatedAt = new Date().toISOString();
    res.status(200).json({ ...snap, source: 'snapshot' });
  }
}
