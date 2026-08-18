-- ======================================================
-- AKIJ CEMENT - DAYS INVENTORY OUTSTANDING (DIO)
-- DIO = (Average Inventory / COGS) * 365
-- ======================================================
DECLARE @PeriodStart DATE = '2025-01-01';
DECLARE @PeriodEnd   DATE = '2025-12-31';
DECLARE @PrevEnd     DATE = '2024-12-31';

WITH
InventoryGL AS (
    SELECT gl.intGeneralLedgerId
    FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '1100000%' AND ac.isActive = 1 AND gl.isActive = 1
      AND (gl.strGeneralLedgerName LIKE '%inventor%'
        OR gl.strGeneralLedgerName LIKE '%stock%'
        OR gl.strGeneralLedgerName LIKE '%goods%'
        OR gl.strGeneralLedgerName LIKE '%Finished%'
        OR gl.strGeneralLedgerName LIKE '%Raw Material%'
        OR gl.strGeneralLedgerName LIKE '%WIP%')
),
COGS_GL AS (
    SELECT gl.intGeneralLedgerId
    FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4800000%' AND ac.isActive = 1 AND gl.isActive = 1
)
SELECT
    bu.strBusinessUnitName                                                   AS [Business Concern],
    SUM(CASE WHEN j.dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd
              AND gl.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM COGS_GL)
             THEN ABS(j.numAmount) ELSE 0 END)                              AS [COGS],

    SUM(CASE WHEN j.dteTransactionDate <= @PeriodEnd
              AND gl2.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM InventoryGL)
             THEN j.numAmount ELSE 0 END)                                   AS [Closing Inventory],

    SUM(CASE WHEN j.dteTransactionDate <= @PrevEnd
              AND gl3.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM InventoryGL)
             THEN j.numAmount ELSE 0 END)                                   AS [Opening Inventory],

    ( SUM(CASE WHEN j.dteTransactionDate <= @PeriodEnd
               AND gl2.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM InventoryGL)
              THEN j.numAmount ELSE 0 END)
    + SUM(CASE WHEN j.dteTransactionDate <= @PrevEnd
               AND gl3.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM InventoryGL)
              THEN j.numAmount ELSE 0 END) ) / 2.0                          AS [Average Inventory],

    -- Inventory Turnover
    SUM(CASE WHEN j.dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd
              AND gl.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM COGS_GL)
             THEN ABS(j.numAmount) ELSE 0 END)
    / NULLIF( ( SUM(CASE WHEN j.dteTransactionDate <= @PeriodEnd
                         AND gl2.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM InventoryGL)
                        THEN j.numAmount ELSE 0 END)
              + SUM(CASE WHEN j.dteTransactionDate <= @PrevEnd
                         AND gl3.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM InventoryGL)
                        THEN j.numAmount ELSE 0 END) ) / 2.0, 0)           AS [Inventory Turnover],

    -- DIO = 365 / Inventory Turnover
    365.0 / NULLIF(
        SUM(CASE WHEN j.dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd
                 AND gl.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM COGS_GL)
                THEN ABS(j.numAmount) ELSE 0 END)
        / NULLIF( ( SUM(CASE WHEN j.dteTransactionDate <= @PeriodEnd
                             AND gl2.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM InventoryGL)
                            THEN j.numAmount ELSE 0 END)
                  + SUM(CASE WHEN j.dteTransactionDate <= @PrevEnd
                             AND gl3.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM InventoryGL)
                            THEN j.numAmount ELSE 0 END) ) / 2.0, 0), 0
    )                                                                       AS [DIO (Days)]

FROM dbo.masterBusinessUnitArc bu
LEFT JOIN fin.tblAccountingJournalArc j   ON bu.intBusinessUnitId = j.intBusinessUnitId
LEFT JOIN fin.tblGeneralLedgerArc   gl  ON j.intGeneralLedgerId  = gl.intGeneralLedgerId
LEFT JOIN fin.tblGeneralLedgerArc   gl2 ON j.intGeneralLedgerId  = gl2.intGeneralLedgerId
LEFT JOIN fin.tblGeneralLedgerArc   gl3 ON j.intGeneralLedgerId  = gl3.intGeneralLedgerId
WHERE bu.strBusinessUnitName LIKE '%cement%'
  AND bu.isActive = 1
  AND j.isActive = 1
GROUP BY bu.strBusinessUnitName;
