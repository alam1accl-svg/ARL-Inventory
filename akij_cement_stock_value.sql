-- ======================================================
-- AKIJ CEMENT - TOTAL STOCK (INVENTORY) VALUE
-- ======================================================
DECLARE @AsOfDate DATE = '2026-08-09';

SELECT 
    bu.strBusinessUnitName                                    AS [Business Concern],
    FORMAT(SUM(j.numAmount), 'N0')                            AS [Total Stock Value],
    FORMAT(COUNT(DISTINCT gl.strGeneralLedgerCode), 'N0')     AS [GL Accounts],
    FORMAT(MAX(j.dteTransactionDate), 'yyyy-MM-dd')           AS [Last Transaction]
FROM fin.tblAccountingJournalArc j
JOIN fin.tblGeneralLedgerArc gl ON j.intGeneralLedgerId = gl.intGeneralLedgerId
JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
JOIN dbo.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
WHERE bu.strBusinessUnitName LIKE '%cement%'
  AND bu.isActive = 1
  AND ac.strAccountClassCode LIKE '1100000%'
  AND ac.isActive = 1
  AND gl.isActive = 1
  AND j.isActive = 1
  AND j.dteTransactionDate <= @AsOfDate
  AND (gl.strGeneralLedgerName LIKE '%inventor%'
    OR gl.strGeneralLedgerName LIKE '%stock%'
    OR gl.strGeneralLedgerName LIKE '%goods%'
    OR gl.strGeneralLedgerName LIKE '%Finished%'
    OR gl.strGeneralLedgerName LIKE '%Raw Material%'
    OR gl.strGeneralLedgerName LIKE '%WIP%'
    OR gl.strGeneralLedgerName LIKE '%spare%')
GROUP BY bu.strBusinessUnitName

UNION ALL

-- Stock breakdown by GL account
SELECT 
    gl.strGeneralLedgerName + ' (' + gl.strGeneralLedgerCode + ')' AS [Business Concern],
    FORMAT(SUM(j.numAmount), 'N0')                                  AS [Total Stock Value],
    NULL                                                           AS [GL Accounts],
    NULL                                                           AS [Last Transaction]
FROM fin.tblAccountingJournalArc j
JOIN fin.tblGeneralLedgerArc gl ON j.intGeneralLedgerId = gl.intGeneralLedgerId
JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
JOIN dbo.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
WHERE bu.strBusinessUnitName LIKE '%cement%'
  AND bu.isActive = 1
  AND ac.strAccountClassCode LIKE '1100000%'
  AND ac.isActive = 1
  AND gl.isActive = 1
  AND j.isActive = 1
  AND j.dteTransactionDate <= @AsOfDate
  AND (gl.strGeneralLedgerName LIKE '%inventor%'
    OR gl.strGeneralLedgerName LIKE '%stock%'
    OR gl.strGeneralLedgerName LIKE '%goods%'
    OR gl.strGeneralLedgerName LIKE '%Finished%'
    OR gl.strGeneralLedgerName LIKE '%Raw Material%'
    OR gl.strGeneralLedgerName LIKE '%WIP%'
    OR gl.strGeneralLedgerName LIKE '%spare%')
GROUP BY gl.strGeneralLedgerName, gl.strGeneralLedgerCode
ORDER BY [Business Concern];
