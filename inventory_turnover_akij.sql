-- =====================================================================
-- INVENTORY TURNOVER RATIO - ALL BUSINESS CONCERNS OF AKIJ RESOURCES
-- Run against: DWH (203.202.241.211)
-- Formula: Inventory Turnover = COGS / Average Inventory
-- Average Inventory = (Opening + Closing Inventory) / 2
-- =====================================================================

-- Step 1: Find Inventory GL accounts (Current Asset class)
-- Display all inventory-related GLs for reference
SELECT 
    gl.intGeneralLedgerId,
    gl.strGeneralLedgerCode,
    gl.strGeneralLedgerName,
    cc.strAccountClassName
FROM fin.tblGeneralLedgerArc gl
JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
JOIN fin.tblAccountClassArc cc ON gl.intAccountClassId = cc.intAccountClassId
WHERE gl.strGeneralLedgerName LIKE '%inventor%' 
   OR gl.strGeneralLedgerName LIKE '%stock%'
   OR gl.strGeneralLedgerName LIKE '%goods%'
   AND gl.isActive = 1
ORDER BY gl.strGeneralLedgerCode;

-- Step 2: Compute Inventory Turnover Ratio per Business Unit
-- Using period: Fiscal Year (you can adjust dates below)
DECLARE @PeriodStart DATE = '2025-01-01';
DECLARE @PeriodEnd   DATE = '2025-12-31';
DECLARE @PrevStart   DATE = '2024-01-01';
DECLARE @PrevEnd     DATE = '2024-12-31';

WITH 

-- All COGS accounts (Account Class 4800000)
COGS_GL AS (
    SELECT intGeneralLedgerId, strGeneralLedgerName
    FROM fin.tblGeneralLedgerArc
    WHERE intAccountClassId IN (
        SELECT intAccountClassId FROM fin.tblAccountClassArc
        WHERE strAccountClassCode LIKE '4800000%' AND isActive = 1
    )
    AND isActive = 1
),

-- All Inventory accounts (Current Asset, inventory-related)
Inventory_GL AS (
    SELECT intGeneralLedgerId, strGeneralLedgerName
    FROM fin.tblGeneralLedgerArc
    WHERE intAccountClassId IN (
        SELECT intAccountClassId FROM fin.tblAccountClassArc
        WHERE strAccountClassCode LIKE '1100000%' AND isActive = 1
    )
    AND (
        strGeneralLedgerName LIKE '%inventor%'
        OR strGeneralLedgerName LIKE '%stock%'
        OR strGeneralLedgerName LIKE '%goods%'
        OR strGeneralLedgerName LIKE '%Finished%'
        OR strGeneralLedgerName LIKE '%Raw Material%'
        OR strGeneralLedgerName LIKE '%WIP%'
        OR strGeneralLedgerName LIKE '%Work in Progress%'
    )
    AND isActive = 1
),

-- COGS for current period per business unit
CurrentCOGS AS (
    SELECT 
        j.intBusinessUnitId,
        SUM(ABS(j.numAmount)) AS COGS_Amount
    FROM fin.tblAccountingJournalArc j
    JOIN COGS_GL c ON j.intGeneralLedgerId = c.intGeneralLedgerId
    WHERE j.dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd
      AND j.isActive = 1
    GROUP BY j.intBusinessUnitId
),

-- Closing Inventory (end of period)
ClosingInventory AS (
    SELECT 
        j.intBusinessUnitId,
        SUM(j.numAmount) AS ClosingBal
    FROM fin.tblAccountingJournalArc j
    JOIN Inventory_GL inv ON j.intGeneralLedgerId = inv.intGeneralLedgerId
    WHERE j.dteTransactionDate <= @PeriodEnd
      AND j.isActive = 1
    GROUP BY j.intBusinessUnitId
),

-- Opening Inventory (end of prior period, same as closing of previous year)
OpeningInventory AS (
    SELECT 
        j.intBusinessUnitId,
        SUM(j.numAmount) AS OpeningBal
    FROM fin.tblAccountingJournalArc j
    JOIN Inventory_GL inv ON j.intGeneralLedgerId = inv.intGeneralLedgerId
    WHERE j.dteTransactionDate <= @PrevEnd
      AND j.isActive = 1
    GROUP BY j.intBusinessUnitId
)

SELECT 
    bu.strBusinessUnitName                                                          AS [Business Concern],
    COALESCE(cogs.COGS_Amount, 0)                                                  AS [COGS],
    COALESCE(oi.OpeningBal, 0)                                                     AS [Opening Inventory],
    COALESCE(ci.ClosingBal, 0)                                                     AS [Closing Inventory],
    (COALESCE(oi.OpeningBal, 0) + COALESCE(ci.ClosingBal, 0)) / 2.0               AS [Average Inventory],
    CASE 
        WHEN (COALESCE(oi.OpeningBal, 0) + COALESCE(ci.ClosingBal, 0)) = 0 
        THEN NULL
        ELSE ROUND(cogs.COGS_Amount / ((COALESCE(oi.OpeningBal, 0) + COALESCE(ci.ClosingBal, 0)) / 2.0), 2)
    END                                                                             AS [Inventory Turnover Ratio],
    CASE 
        WHEN COALESCE(cogs.COGS_Amount, 0) = 0 THEN NULL
        ELSE ROUND(365.0 / NULLIF(cogs.COGS_Amount / ((COALESCE(oi.OpeningBal, 0) + COALESCE(ci.ClosingBal, 0)) / 2.0), 0), 0)
    END                                                                             AS [Days in Inventory]
FROM dbo.masterBusinessUnitArc bu
LEFT JOIN CurrentCOGS cogs ON bu.intBusinessUnitId = cogs.intBusinessUnitId
LEFT JOIN OpeningInventory oi ON bu.intBusinessUnitId = oi.intBusinessUnitId
LEFT JOIN ClosingInventory ci ON bu.intBusinessUnitId = ci.intBusinessUnitId
WHERE bu.isActive = 1
ORDER BY [Inventory Turnover Ratio] DESC;


-- =====================================================================
-- BONUS: Detailed monthly trend per business unit
-- =====================================================================
WITH 

Inventory_GL AS (
    SELECT intGeneralLedgerId, strGeneralLedgerName
    FROM fin.tblGeneralLedgerArc
    WHERE intAccountClassId IN (
        SELECT intAccountClassId FROM fin.tblAccountClassArc
        WHERE strAccountClassCode LIKE '1100000%' AND isActive = 1
    )
    AND (
        strGeneralLedgerName LIKE '%inventor%'
        OR strGeneralLedgerName LIKE '%stock%'
        OR strGeneralLedgerName LIKE '%goods%'
        OR strGeneralLedgerName LIKE '%Finished%'
        OR strGeneralLedgerName LIKE '%Raw Material%'
        OR strGeneralLedgerName LIKE '%WIP%'
    )
    AND isActive = 1
),

COGS_GL AS (
    SELECT intGeneralLedgerId, strGeneralLedgerName
    FROM fin.tblGeneralLedgerArc
    WHERE intAccountClassId IN (
        SELECT intAccountClassId FROM fin.tblAccountClassArc
        WHERE strAccountClassCode LIKE '4800000%' AND isActive = 1
    )
    AND isActive = 1
),

MonthlyData AS (
    SELECT 
        j.intBusinessUnitId,
        FORMAT(j.dteTransactionDate, 'yyyy-MM') AS [Month],
        SUM(CASE WHEN j.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM COGS_GL) 
                 THEN ABS(j.numAmount) ELSE 0 END) AS COGS,
        SUM(CASE WHEN j.intGeneralLedgerId IN (SELECT intGeneralLedgerId FROM Inventory_GL) 
                 THEN j.numAmount ELSE 0 END) AS InvMovement
    FROM fin.tblAccountingJournalArc j
    WHERE j.dteTransactionDate BETWEEN '2025-01-01' AND '2025-12-31'
      AND j.isActive = 1
    GROUP BY j.intBusinessUnitId, FORMAT(j.dteTransactionDate, 'yyyy-MM')
)

SELECT 
    bu.strBusinessUnitName AS [Business Concern],
    md.[Month],
    md.COGS,
    SUM(md.InvMovement) OVER (PARTITION BY md.intBusinessUnitId ORDER BY md.[Month]) AS [Running Inventory Balance],
    CASE 
        WHEN ABS(SUM(md.InvMovement) OVER (PARTITION BY md.intBusinessUnitId ORDER BY md.[Month])) > 0
        THEN ROUND(md.COGS * 12.0 / ABS(SUM(md.InvMovement) OVER (PARTITION BY md.intBusinessUnitId ORDER BY md.[Month]) + 0.001), 2)
        ELSE NULL
    END AS [Monthly Annualized Turnover]
FROM MonthlyData md
JOIN dbo.masterBusinessUnitArc bu ON md.intBusinessUnitId = bu.intBusinessUnitId
WHERE bu.isActive = 1
ORDER BY bu.strBusinessUnitName, md.[Month];
