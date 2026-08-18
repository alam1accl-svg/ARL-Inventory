-- =============================================================================
-- ALL FINANCIAL RATIOS - AKIJ RESOURCES - ALL BUSINESS CONCERNS
-- Run against: DWH (203.202.241.211)
-- =============================================================================
-- 1. LIQUIDITY:      Current Ratio, Quick Ratio, Cash Ratio
-- 2. PROFITABILITY:  Gross Margin, Net Margin, ROA, ROE, EBITDA Margin
-- 3. LEVERAGE:       Debt-to-Equity, Debt-to-Assets, Interest Coverage
-- 4. EFFICIENCY:     Asset Turnover, Inventory Turnover, Receivables Turnover
-- =============================================================================

DECLARE @PeriodStart DATE = '2025-01-01';
DECLARE @PeriodEnd   DATE = '2025-12-31';
DECLARE @PrevEnd     DATE = '2024-12-31';   -- closing date of prior period

-- =============================================================================
-- STEP 0: Review GL account mappings before computing ratios
-- =============================================================================
SELECT 'ACCOUNT STRUCTURE' AS [Section], 'Verify classes below before running ratios' AS [Note];

SELECT 
    glp.intAccountGroupId,
    ag.strAccountGroupName,
    ac.intAccountClassId,
    ac.strAccountClassCode,
    ac.strAccountClassName,
    COUNT(gl.intGeneralLedgerId) AS GL_Count
FROM fin.tblAccountClassArc ac
JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
JOIN fin.tblAccountCategoryArc cat ON ac.intAccountClassId = cat.intAccountClassId
JOIN fin.tblGeneralLedgerArc gl ON cat.intAccountCategoryId = gl.intAccountCategoryId
WHERE ac.isActive = 1 AND ag.isActive = 1 AND gl.isActive = 1
GROUP BY glp.intAccountGroupId, ag.strAccountGroupName, ac.intAccountClassId, ac.strAccountClassCode, ac.strAccountClassName
ORDER BY glp.intAccountGroupId, ac.strAccountClassCode;

-- =============================================================================
-- STEP 1: All Ratios per Business Concern
-- =============================================================================

WITH

-- ------ ACCOUNT CLASSIFICATION ------

-- Total Assets (Group 1)
AssetGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
    WHERE ag.intAccountGroupId = 1 AND gl.isActive = 1 AND ag.isActive = 1
),

-- Current Assets only (Class 1100000)
CurrentAssetGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '1100000%' AND ac.isActive = 1 AND gl.isActive = 1
),

-- Cash & Bank (Current Asset GLs with cash/bank names)
CashBankGL AS (
    SELECT intGeneralLedgerId FROM CurrentAssetGL ca
    JOIN fin.tblGeneralLedgerArc gl ON ca.intGeneralLedgerId = gl.intGeneralLedgerId
    WHERE gl.strGeneralLedgerName LIKE '%cash%'
       OR gl.strGeneralLedgerName LIKE '%bank%'
       OR gl.strGeneralLedgerName LIKE '%Cash at%'
       OR gl.strGeneralLedgerName LIKE '%Bank%'
       OR gl.strGeneralLedgerCode LIKE '1110%'
),

-- Trade Receivables
ReceivableGL AS (
    SELECT intGeneralLedgerId FROM CurrentAssetGL ca
    JOIN fin.tblGeneralLedgerArc gl ON ca.intGeneralLedgerId = gl.intGeneralLedgerId
    WHERE gl.strGeneralLedgerName LIKE '%receivable%'
       OR gl.strGeneralLedgerName LIKE '%debtor%'
),

-- Inventory
InventoryGL AS (
    SELECT intGeneralLedgerId FROM CurrentAssetGL ca
    JOIN fin.tblGeneralLedgerArc gl ON ca.intGeneralLedgerId = gl.intGeneralLedgerId
    WHERE gl.strGeneralLedgerName LIKE '%inventor%'
       OR gl.strGeneralLedgerName LIKE '%stock%'
       OR gl.strGeneralLedgerName LIKE '%goods%'
       OR gl.strGeneralLedgerName LIKE '%Finished%'
       OR gl.strGeneralLedgerName LIKE '%Raw Material%'
       OR gl.strGeneralLedgerName LIKE '%WIP%'
),

-- Total Liabilities (Group 2)
LiabilityGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
    WHERE ag.intAccountGroupId = 2 AND gl.isActive = 1 AND ag.isActive = 1
),

-- Current Liabilities only (Class 2200000)
CurrentLiabilityGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '2200000%' AND ac.isActive = 1 AND gl.isActive = 1
),

-- Equity (Class 2000000)
EquityGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '2000000%' AND ac.isActive = 1 AND gl.isActive = 1
),

-- Revenue / Operating Income (Group 3)
RevenueGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
    WHERE ag.intAccountGroupId = 3 AND gl.isActive = 1 AND ag.isActive = 1
),

-- COGS (Class 4800000)
COGS_GL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4800000%' AND ac.isActive = 1 AND gl.isActive = 1
),

-- All Expenses (Group 4)
ExpenseGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
    WHERE ag.intAccountGroupId = 4 AND gl.isActive = 1 AND ag.isActive = 1
),

-- Depreciation (Class 4600000)
DepreciationGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4600000%' AND ac.isActive = 1 AND gl.isActive = 1
),

-- Financial Expenses / Interest (Class 4500000)
FinancialExpenseGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4500000%' AND ac.isActive = 1 AND gl.isActive = 1
),

-- Tax (Class 4700000)
TaxGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4700000%' AND ac.isActive = 1 AND gl.isActive = 1
),

-- ------ AGGREGATE JOURNAL DATA ------

JournalAgg AS (
    SELECT
        j.intBusinessUnitId,
        j.dteTransactionDate,
        j.numAmount,
        CASE WHEN agl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isAsset,
        CASE WHEN cagl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isCurrentAsset,
        CASE WHEN cbgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isCashBank,
        CASE WHEN rgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isReceivable,
        CASE WHEN igl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isInventory,
        CASE WHEN lgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isLiability,
        CASE WHEN clgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isCurrentLiability,
        CASE WHEN egl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isEquity,
        CASE WHEN revgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isRevenue,
        CASE WHEN cgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isCOGS,
        CASE WHEN expgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isExpense,
        CASE WHEN dgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isDepreciation,
        CASE WHEN fegl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isFinancialExpense,
        CASE WHEN tgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isTax
    FROM fin.tblAccountingJournalArc j
    LEFT JOIN AssetGL            agl  ON j.intGeneralLedgerId = agl.intGeneralLedgerId
    LEFT JOIN CurrentAssetGL     cagl ON j.intGeneralLedgerId = cagl.intGeneralLedgerId
    LEFT JOIN CashBankGL         cbgl ON j.intGeneralLedgerId = cbgl.intGeneralLedgerId
    LEFT JOIN ReceivableGL       rgl  ON j.intGeneralLedgerId = rgl.intGeneralLedgerId
    LEFT JOIN InventoryGL        igl  ON j.intGeneralLedgerId = igl.intGeneralLedgerId
    LEFT JOIN LiabilityGL        lgl  ON j.intGeneralLedgerId = lgl.intGeneralLedgerId
    LEFT JOIN CurrentLiabilityGL clgl ON j.intGeneralLedgerId = clgl.intGeneralLedgerId
    LEFT JOIN EquityGL           egl  ON j.intGeneralLedgerId = egl.intGeneralLedgerId
    LEFT JOIN RevenueGL          revgl ON j.intGeneralLedgerId = revgl.intGeneralLedgerId
    LEFT JOIN COGS_GL            cgl  ON j.intGeneralLedgerId = cgl.intGeneralLedgerId
    LEFT JOIN ExpenseGL          expgl ON j.intGeneralLedgerId = expgl.intGeneralLedgerId
    LEFT JOIN DepreciationGL     dgl  ON j.intGeneralLedgerId = dgl.intGeneralLedgerId
    LEFT JOIN FinancialExpenseGL fegl ON j.intGeneralLedgerId = fegl.intGeneralLedgerId
    LEFT JOIN TaxGL              tgl  ON j.intGeneralLedgerId = tgl.intGeneralLedgerId
    WHERE j.isActive = 1
),

-- BALANCE SHEET items (cumulative up to period end)
BalanceSheet AS (
    SELECT
        intBusinessUnitId,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isAsset = 1           THEN numAmount ELSE 0 END) AS TotalAssets,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isCurrentAsset = 1    THEN numAmount ELSE 0 END) AS CurrentAssets,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isCashBank = 1        THEN numAmount ELSE 0 END) AS CashBank,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isReceivable = 1      THEN numAmount ELSE 0 END) AS Receivables,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isInventory = 1       THEN numAmount ELSE 0 END) AS Inventory,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isLiability = 1       THEN numAmount ELSE 0 END) AS TotalLiabilities,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isCurrentLiability = 1 THEN numAmount ELSE 0 END) AS CurrentLiabilities,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isEquity = 1          THEN numAmount ELSE 0 END) AS Equity
    FROM JournalAgg
    GROUP BY intBusinessUnitId
),

-- Opening Inventory (cumulative up to prior year end)
OpeningInventory AS (
    SELECT
        intBusinessUnitId,
        SUM(CASE WHEN dteTransactionDate <= @PrevEnd AND isInventory = 1 THEN numAmount ELSE 0 END) AS OpeningInv
    FROM JournalAgg
    GROUP BY intBusinessUnitId
),

-- Opening Receivables (cumulative up to prior year end)
OpeningReceivables AS (
    SELECT
        intBusinessUnitId,
        SUM(CASE WHEN dteTransactionDate <= @PrevEnd AND isReceivable = 1 THEN numAmount ELSE 0 END) AS OpeningRec
    FROM JournalAgg
    GROUP BY intBusinessUnitId
),

-- INCOME STATEMENT items (period only)
IncomeStatement AS (
    SELECT
        intBusinessUnitId,
        SUM(CASE WHEN isRevenue = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS Revenue,
        SUM(CASE WHEN isCOGS = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS COGS,
        SUM(CASE WHEN isExpense = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS TotalExpenses,
        SUM(CASE WHEN isDepreciation = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS Depreciation,
        SUM(CASE WHEN isFinancialExpense = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS FinancialExpenses,
        SUM(CASE WHEN isTax = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS TaxExpense
    FROM JournalAgg
    GROUP BY intBusinessUnitId
)

-- ------ FINAL OUTPUT: ALL RATIOS ------
SELECT
    bu.strBusinessUnitCode                                                                    AS [BU Code],
    bu.strBusinessUnitName                                                                    AS [Business Concern],

    -- === BALANCE SHEET LINE ITEMS ===
    FORMAT(COALESCE(bs.TotalAssets, 0), 'N0')                                                AS [Total Assets],
    FORMAT(COALESCE(bs.CurrentAssets, 0), 'N0')                                              AS [Current Assets],
    FORMAT(COALESCE(bs.CashBank, 0), 'N0')                                                   AS [Cash & Bank],
    FORMAT(COALESCE(bs.Receivables, 0), 'N0')                                                AS [Trade Receivables],
    FORMAT(COALESCE(bs.Inventory, 0), 'N0')                                                  AS [Inventory],
    FORMAT(COALESCE(bs.TotalLiabilities, 0), 'N0')                                           AS [Total Liabilities],
    FORMAT(COALESCE(bs.CurrentLiabilities, 0), 'N0')                                         AS [Current Liabilities],
    FORMAT(COALESCE(bs.Equity, 0), 'N0')                                                     AS [Equity],

    -- === P&L LINE ITEMS ===
    FORMAT(COALESCE(IS2.Revenue, 0), 'N0')                                                   AS [Revenue],
    FORMAT(COALESCE(IS2.COGS, 0), 'N0')                                                      AS [COGS],
    FORMAT(COALESCE(IS2.TotalExpenses, 0), 'N0')                                             AS [Total Expenses],
    FORMAT(COALESCE(IS2.Depreciation, 0), 'N0')                                              AS [Depreciation],
    FORMAT(COALESCE(IS2.FinancialExpenses, 0), 'N0')                                         AS [Interest & Finance Cost],

    -- Gross Profit = Revenue - COGS (credit balances are negative, so Revenue = -numAmount, COGS = +numAmount)
    FORMAT(COALESCE(-IS2.Revenue, 0) - COALESCE(IS2.COGS, 0), 'N0')                          AS [Gross Profit],

    -- === 1. LIQUIDITY RATIOS ===
    CASE WHEN COALESCE(bs.CurrentLiabilities, 0) = 0 THEN NULL
         ELSE ROUND(COALESCE(bs.CurrentAssets, 0) / NULLIF(ABS(COALESCE(bs.CurrentLiabilities, 0)), 0), 2)
    END                                                                                      AS [Current Ratio],
    CASE WHEN COALESCE(bs.CurrentLiabilities, 0) = 0 THEN NULL
         ELSE ROUND((COALESCE(bs.CurrentAssets, 0) - COALESCE(bs.Inventory, 0))
              / NULLIF(ABS(COALESCE(bs.CurrentLiabilities, 0)), 0), 2)
    END                                                                                      AS [Quick Ratio],
    CASE WHEN COALESCE(bs.CurrentLiabilities, 0) = 0 THEN NULL
         ELSE ROUND(COALESCE(bs.CashBank, 0) / NULLIF(ABS(COALESCE(bs.CurrentLiabilities, 0)), 0), 2)
    END                                                                                      AS [Cash Ratio],

    -- === 2. PROFITABILITY RATIOS ===
    CASE WHEN COALESCE(IS2.Revenue, 0) = 0 THEN NULL
         ELSE ROUND((COALESCE(-IS2.Revenue, 0) - COALESCE(IS2.COGS, 0)) * 100.0
              / NULLIF(ABS(COALESCE(IS2.Revenue, 0)), 0), 2)
    END                                                                                      AS [Gross Margin %],
    CASE WHEN COALESCE(IS2.Revenue, 0) = 0 THEN NULL
         ELSE ROUND((COALESCE(-IS2.Revenue, 0) - COALESCE(IS2.TotalExpenses, 0)) * 100.0
              / NULLIF(ABS(COALESCE(IS2.Revenue, 0)), 0), 2)
    END                                                                                      AS [Net Margin %],
    CASE WHEN COALESCE(bs.TotalAssets, 0) = 0 THEN NULL
         ELSE ROUND((COALESCE(-IS2.Revenue, 0) - COALESCE(IS2.TotalExpenses, 0))
              / NULLIF(COALESCE(bs.TotalAssets, 0), 0), 2)
    END                                                                                      AS [ROA],
    CASE WHEN COALESCE(bs.Equity, 0) = 0 THEN NULL
         ELSE ROUND((COALESCE(-IS2.Revenue, 0) - COALESCE(IS2.TotalExpenses, 0))
              / NULLIF(ABS(COALESCE(bs.Equity, 0)), 0), 2)
    END                                                                                      AS [ROE],
    CASE WHEN COALESCE(IS2.Revenue, 0) = 0 THEN NULL
         ELSE ROUND((COALESCE(-IS2.Revenue, 0) - COALESCE(IS2.COGS, 0)
              - COALESCE(IS2.TotalExpenses, 0) + COALESCE(IS2.COGS, 0)
              + COALESCE(IS2.Depreciation, 0) + COALESCE(IS2.FinancialExpenses, 0)
              + COALESCE(IS2.TaxExpense, 0)) * 100.0
              / NULLIF(ABS(COALESCE(IS2.Revenue, 0)), 0), 2)
    END                                                                                      AS [EBITDA Margin %],

    -- === 3. LEVERAGE RATIOS ===
    CASE WHEN COALESCE(bs.Equity, 0) = 0 THEN NULL
         ELSE ROUND(ABS(COALESCE(bs.TotalLiabilities, 0))
              / NULLIF(ABS(COALESCE(bs.Equity, 0)), 0), 2)
    END                                                                                      AS [Debt-to-Equity],
    CASE WHEN COALESCE(bs.TotalAssets, 0) = 0 THEN NULL
         ELSE ROUND(ABS(COALESCE(bs.TotalLiabilities, 0))
              / NULLIF(COALESCE(bs.TotalAssets, 0), 0), 2)
    END                                                                                      AS [Debt-to-Assets],

    -- Interest Coverage = EBIT / Interest Expense
    CASE WHEN COALESCE(IS2.FinancialExpenses, 0) = 0 THEN NULL
         ELSE ROUND((COALESCE(-IS2.Revenue, 0) - COALESCE(IS2.TotalExpenses, 0)
              + COALESCE(IS2.FinancialExpenses, 0) + COALESCE(IS2.TaxExpense, 0))
              / NULLIF(COALESCE(IS2.FinancialExpenses, 0), 0), 2)
    END                                                                                      AS [Interest Coverage],

    -- === 4. EFFICIENCY RATIOS ===
    CASE WHEN COALESCE(bs.TotalAssets, 0) = 0 THEN NULL
         ELSE ROUND(ABS(COALESCE(IS2.Revenue, 0)) / NULLIF(COALESCE(bs.TotalAssets, 0), 0), 2)
    END                                                                                      AS [Asset Turnover],

    -- Inventory Turnover = COGS / Average Inventory
    CASE WHEN (COALESCE(oi.OpeningInv, 0) + COALESCE(bs.Inventory, 0)) = 0 THEN NULL
         ELSE ROUND(COALESCE(IS2.COGS, 0)
              / ((COALESCE(oi.OpeningInv, 0) + COALESCE(bs.Inventory, 0)) / 2.0), 2)
    END                                                                                      AS [Inventory Turnover],

    CASE WHEN COALESCE(IS2.COGS, 0) = 0 THEN NULL
         ELSE ROUND(365.0 / NULLIF(COALESCE(IS2.COGS, 0)
              / NULLIF((COALESCE(oi.OpeningInv, 0) + COALESCE(bs.Inventory, 0)) / 2.0, 0), 0), 0)
    END                                                                                      AS [Days in Inventory],

    -- Receivables Turnover = Revenue / Average Receivables
    CASE WHEN (COALESCE(or2.OpeningRec, 0) + COALESCE(bs.Receivables, 0)) = 0 THEN NULL
         ELSE ROUND(ABS(COALESCE(IS2.Revenue, 0))
              / NULLIF((COALESCE(or2.OpeningRec, 0) + COALESCE(bs.Receivables, 0)) / 2.0, 0), 2)
    END                                                                                      AS [Receivables Turnover],

    CASE WHEN COALESCE(IS2.Revenue, 0) = 0 THEN NULL
         ELSE ROUND(365.0 / NULLIF(ABS(COALESCE(IS2.Revenue, 0))
              / NULLIF((COALESCE(or2.OpeningRec, 0) + COALESCE(bs.Receivables, 0)) / 2.0, 0), 0), 0)
    END                                                                                      AS [Days Sales Outstanding]

FROM dbo.masterBusinessUnitArc bu
LEFT JOIN BalanceSheet       bs  ON bu.intBusinessUnitId = bs.intBusinessUnitId
LEFT JOIN IncomeStatement    IS2  ON bu.intBusinessUnitId = IS2.intBusinessUnitId
LEFT JOIN OpeningInventory   oi  ON bu.intBusinessUnitId = oi.intBusinessUnitId
LEFT JOIN OpeningReceivables or2 ON bu.intBusinessUnitId = oi.intBusinessUnitId
WHERE bu.isActive = 1
  AND (COALESCE(bs.TotalAssets, 0) <> 0 OR COALESCE(IS2.Revenue, 0) <> 0)
ORDER BY [Business Concern];


-- =============================================================================
-- STEP 2: CONSOLIDATED RATIOS (All Business Concerns Combined)
-- =============================================================================
WITH

-- (Same CTEs as above, duplicated for consolidated view)
AssetGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
    WHERE ag.intAccountGroupId = 1 AND gl.isActive = 1 AND ag.isActive = 1
),
CurrentAssetGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '1100000%' AND ac.isActive = 1 AND gl.isActive = 1
),
CashBankGL AS (
    SELECT intGeneralLedgerId FROM CurrentAssetGL ca
    JOIN fin.tblGeneralLedgerArc gl ON ca.intGeneralLedgerId = gl.intGeneralLedgerId
    WHERE gl.strGeneralLedgerName LIKE '%cash%' OR gl.strGeneralLedgerName LIKE '%bank%'
       OR gl.strGeneralLedgerName LIKE '%Cash at%' OR gl.strGeneralLedgerCode LIKE '1110%'
),
ReceivableGL AS (
    SELECT intGeneralLedgerId FROM CurrentAssetGL ca
    JOIN fin.tblGeneralLedgerArc gl ON ca.intGeneralLedgerId = gl.intGeneralLedgerId
    WHERE gl.strGeneralLedgerName LIKE '%receivable%' OR gl.strGeneralLedgerName LIKE '%debtor%'
),
InventoryGL AS (
    SELECT intGeneralLedgerId FROM CurrentAssetGL ca
    JOIN fin.tblGeneralLedgerArc gl ON ca.intGeneralLedgerId = gl.intGeneralLedgerId
    WHERE gl.strGeneralLedgerName LIKE '%inventor%' OR gl.strGeneralLedgerName LIKE '%stock%'
       OR gl.strGeneralLedgerName LIKE '%goods%' OR gl.strGeneralLedgerName LIKE '%Finished%'
       OR gl.strGeneralLedgerName LIKE '%Raw Material%' OR gl.strGeneralLedgerName LIKE '%WIP%'
),
LiabilityGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
    WHERE ag.intAccountGroupId = 2 AND gl.isActive = 1 AND ag.isActive = 1
),
CurrentLiabilityGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '2200000%' AND ac.isActive = 1 AND gl.isActive = 1
),
EquityGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '2000000%' AND ac.isActive = 1 AND gl.isActive = 1
),
RevenueGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
    WHERE ag.intAccountGroupId = 3 AND gl.isActive = 1 AND ag.isActive = 1
),
COGS_GL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4800000%' AND ac.isActive = 1 AND gl.isActive = 1
),
ExpenseGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    JOIN fin.tblAccountGroupArc ag ON ac.intAccountGroupId = ag.intAccountGroupId
    WHERE ag.intAccountGroupId = 4 AND gl.isActive = 1 AND ag.isActive = 1
),
DepreciationGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4600000%' AND ac.isActive = 1 AND gl.isActive = 1
),
FinancialExpenseGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4500000%' AND ac.isActive = 1 AND gl.isActive = 1
),
TaxGL AS (
    SELECT gl.intGeneralLedgerId FROM fin.tblGeneralLedgerArc gl
    JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
    JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
    WHERE ac.strAccountClassCode LIKE '4700000%' AND ac.isActive = 1 AND gl.isActive = 1
),
JournalAgg AS (
    SELECT
        j.intBusinessUnitId, j.dteTransactionDate, j.numAmount,
        CASE WHEN agl.intGeneralLedgerId  IS NOT NULL THEN 1 ELSE 0 END AS isAsset,
        CASE WHEN cagl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isCurrentAsset,
        CASE WHEN cbgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isCashBank,
        CASE WHEN rgl.intGeneralLedgerId  IS NOT NULL THEN 1 ELSE 0 END AS isReceivable,
        CASE WHEN igl.intGeneralLedgerId  IS NOT NULL THEN 1 ELSE 0 END AS isInventory,
        CASE WHEN lgl.intGeneralLedgerId  IS NOT NULL THEN 1 ELSE 0 END AS isLiability,
        CASE WHEN clgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isCurrentLiability,
        CASE WHEN egl.intGeneralLedgerId  IS NOT NULL THEN 1 ELSE 0 END AS isEquity,
        CASE WHEN revgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isRevenue,
        CASE WHEN cgl.intGeneralLedgerId  IS NOT NULL THEN 1 ELSE 0 END AS isCOGS,
        CASE WHEN expgl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isExpense,
        CASE WHEN dgl.intGeneralLedgerId  IS NOT NULL THEN 1 ELSE 0 END AS isDepreciation,
        CASE WHEN fegl.intGeneralLedgerId IS NOT NULL THEN 1 ELSE 0 END AS isFinancialExpense,
        CASE WHEN tgl.intGeneralLedgerId  IS NOT NULL THEN 1 ELSE 0 END AS isTax
    FROM fin.tblAccountingJournalArc j
    LEFT JOIN AssetGL            agl  ON j.intGeneralLedgerId = agl.intGeneralLedgerId
    LEFT JOIN CurrentAssetGL     cagl ON j.intGeneralLedgerId = cagl.intGeneralLedgerId
    LEFT JOIN CashBankGL         cbgl ON j.intGeneralLedgerId = cbgl.intGeneralLedgerId
    LEFT JOIN ReceivableGL       rgl  ON j.intGeneralLedgerId = rgl.intGeneralLedgerId
    LEFT JOIN InventoryGL        igl  ON j.intGeneralLedgerId = igl.intGeneralLedgerId
    LEFT JOIN LiabilityGL        lgl  ON j.intGeneralLedgerId = lgl.intGeneralLedgerId
    LEFT JOIN CurrentLiabilityGL clgl ON j.intGeneralLedgerId = clgl.intGeneralLedgerId
    LEFT JOIN EquityGL           egl  ON j.intGeneralLedgerId = egl.intGeneralLedgerId
    LEFT JOIN RevenueGL          revgl ON j.intGeneralLedgerId = revgl.intGeneralLedgerId
    LEFT JOIN COGS_GL            cgl  ON j.intGeneralLedgerId = cgl.intGeneralLedgerId
    LEFT JOIN ExpenseGL          expgl ON j.intGeneralLedgerId = expgl.intGeneralLedgerId
    LEFT JOIN DepreciationGL     dgl  ON j.intGeneralLedgerId = dgl.intGeneralLedgerId
    LEFT JOIN FinancialExpenseGL fegl ON j.intGeneralLedgerId = fegl.intGeneralLedgerId
    LEFT JOIN TaxGL              tgl  ON j.intGeneralLedgerId = tgl.intGeneralLedgerId
    WHERE j.isActive = 1
),
ConsBalance AS (
    SELECT
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isAsset = 1           THEN numAmount ELSE 0 END) AS TotalAssets,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isCurrentAsset = 1    THEN numAmount ELSE 0 END) AS CurrentAssets,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isCashBank = 1        THEN numAmount ELSE 0 END) AS CashBank,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isReceivable = 1      THEN numAmount ELSE 0 END) AS Receivables,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isInventory = 1       THEN numAmount ELSE 0 END) AS Inventory,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isLiability = 1       THEN numAmount ELSE 0 END) AS TotalLiabilities,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isCurrentLiability = 1 THEN numAmount ELSE 0 END) AS CurrentLiabilities,
        SUM(CASE WHEN dteTransactionDate <= @PeriodEnd AND isEquity = 1          THEN numAmount ELSE 0 END) AS Equity
    FROM JournalAgg
),
ConsOpeningInv AS (
    SELECT SUM(CASE WHEN dteTransactionDate <= @PrevEnd AND isInventory = 1  THEN numAmount ELSE 0 END) AS OpeningInv FROM JournalAgg
),
ConsOpeningRec AS (
    SELECT SUM(CASE WHEN dteTransactionDate <= @PrevEnd AND isReceivable = 1 THEN numAmount ELSE 0 END) AS OpeningRec FROM JournalAgg
),
ConsIS AS (
    SELECT
        SUM(CASE WHEN isRevenue = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS Revenue,
        SUM(CASE WHEN isCOGS = 1   AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS COGS,
        SUM(CASE WHEN isExpense = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS TotalExpenses,
        SUM(CASE WHEN isDepreciation = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS Depreciation,
        SUM(CASE WHEN isFinancialExpense = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS FinancialExpenses,
        SUM(CASE WHEN isTax = 1 AND dteTransactionDate BETWEEN @PeriodStart AND @PeriodEnd THEN numAmount ELSE 0 END) AS TaxExpense
    FROM JournalAgg
)

SELECT
    'CONSOLIDATED'                                                                             AS [Business Concern],
    'ALL UNITS'                                                                                AS [BU Code],
    FORMAT(bs.TotalAssets, 'N0')                                                               AS [Total Assets],
    FORMAT(bs.CurrentAssets, 'N0')                                                             AS [Current Assets],
    FORMAT(bs.TotalLiabilities, 'N0')                                                          AS [Total Liabilities],
    FORMAT(bs.CurrentLiabilities, 'N0')                                                        AS [Current Liabilities],
    FORMAT(IS2.Revenue, 'N0')                                                                   AS [Revenue],
    FORMAT(-IS2.Revenue - IS2.COGS, 'N0')                                                      AS [Gross Profit],

    -- Ratios
    ROUND(bs.CurrentAssets                  / NULLIF(ABS(bs.CurrentLiabilities), 0), 2)       AS [Current Ratio],
    ROUND((bs.CurrentAssets - bs.Inventory) / NULLIF(ABS(bs.CurrentLiabilities), 0), 2)       AS [Quick Ratio],
    ROUND((-IS2.Revenue - IS2.COGS) * 100.0 / NULLIF(ABS(IS2.Revenue), 0), 2)                AS [Gross Margin %],
    ROUND((-IS2.Revenue - IS2.TotalExpenses) * 100.0 / NULLIF(ABS(IS2.Revenue), 0), 2)       AS [Net Margin %],
    ROUND((-IS2.Revenue - IS2.TotalExpenses) / NULLIF(bs.TotalAssets, 0), 2)                  AS [ROA],
    ROUND((-IS2.Revenue - IS2.TotalExpenses) / NULLIF(ABS(bs.Equity), 0), 2)                  AS [ROE],
    ROUND(ABS(bs.TotalLiabilities)          / NULLIF(ABS(bs.Equity), 0), 2)                   AS [Debt-to-Equity],
    ROUND(ABS(IS2.Revenue)                  / NULLIF(bs.TotalAssets, 0), 2)                   AS [Asset Turnover],
    ROUND(IS2.COGS / NULLIF((oi.OpeningInv + bs.Inventory) / 2.0, 0), 2)                     AS [Inventory Turnover],
    CASE WHEN IS2.FinancialExpenses = 0 THEN NULL
         ELSE ROUND((-IS2.Revenue - IS2.TotalExpenses + IS2.FinancialExpenses + IS2.TaxExpense)
              / NULLIF(IS2.FinancialExpenses, 0), 2)
    END                                                                                        AS [Interest Coverage]
FROM ConsBalance      bs
CROSS JOIN ConsIS     IS2
CROSS JOIN ConsOpeningInv oi
CROSS JOIN ConsOpeningRec or2;
