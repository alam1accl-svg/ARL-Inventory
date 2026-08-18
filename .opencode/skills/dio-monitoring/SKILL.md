---
name: dio-monitoring
description: Days Inventory Outstanding (DIO) tracking and trend monitoring across ARL SBUs. Use this skill whenever the user asks about DIO, days inventory outstanding, inventory holding days, stock days, inventory reduction, or DIO targets.
---

# Skill: DIO Monitoring

## Triggers
- Use this skill when queries involve: "DIO", "days inventory outstanding", "inventory days", "stock days", "inventory holding days", "days of supply", "inventory reduction", "DIO target", "DIO trend", "working capital", "cash tied in inventory", "inventory optimization", "stock days coverage".

## Required Inputs
- SBU or Business Unit name (optional - defaults to all)
- Period / month for monitoring (optional - defaults to current)
- Comparison period (optional - for trend analysis)

## Formula
`DIO = (Average Inventory / COGS) * 365`

Or monthly approximation:
`DIO = (Average Inventory / Monthly COGS) * 30`

- **Average Inventory** = (Opening + Closing) / 2 from inventory GL (`1100000%`)
- **COGS** from GL class `4800000%`

## MCP Data Sources
### DWH Database (203.202.241.211)
| Table | Purpose |
|---|---|
| `fin.tblAccountingJournalArc` | GL transactions (`numAmount`, `dteTransactionDate`, `intBusinessUnitId`, `intGeneralLedgerId`) |
| `fin.tblGeneralLedgerArc` | GL master (inventory & COGS accounts) |
| `fin.tblAccountClassArc` | `1100000%` inventory, `4800000%` COGS |
| `fin.tblAccountCategoryArc` | GL-to-Class link |
| `saas.masterBusinessUnitArc` | Business unit master |

## Step-by-Step Procedures

### 1. Monthly DIO by SBU (Trend Series)
```sql
SELECT bu.strBusinessUnit AS SBU,
  DATEPART(YEAR, j.dteTransactionDate) AS [Year],
  DATEPART(MONTH, j.dteTransactionDate) AS [Month],
  SUM(j.numAmount) AS InventoryValue,
  (SUM(j.numAmount) / NULLIF(monthly COGS, 0)) * 30 AS DIO_Days
FROM fin.tblAccountingJournalArc j
JOIN fin.tblGeneralLedgerArc gl ON j.intGeneralLedgerId = gl.intGeneralLedgerId
JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
JOIN saas.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
WHERE ac.strAccountClassCode LIKE '1100000%' AND j.isActive = 1
  AND bu.isActive = 1 AND bu.strBusinessUnit NOT LIKE '%Demo%'
  AND j.dteTransactionDate >= @FromDate
GROUP BY bu.strBusinessUnit, DATEPART(YEAR, j.dteTransactionDate), DATEPART(MONTH, j.dteTransactionDate)
ORDER BY [Year], [Month], DIO_Days DESC
```

### 2. DIO Trend Analysis
- Compare current month DIO vs. previous months and prior year
- Compute change in days (MoM, YoY)
- Flag SBUs with rising DIO (3+ consecutive months up) as action items
- Benchmark against department target / industry norm

### 3. Top & Bottom SBUs
- **Best**: Lowest DIO (fast-moving, efficient stock)
- **Worst**: Highest DIO (excess/obsolete risk, cash locked up)

### 4. DIO Reduction Recommendations
- Obsolete/non-moving write-offs or liquidation (see `inventory-aging` skill)
- Reorder-level and safety-stock recalibration
- Procurement alignment with demand (PR/PO scheduling)
- Redistribution of slow-moving stock across warehouses

## Key Metrics
- **Current DIO**: Days stock is held for each SBU
- **DIO Trend**: MoM and YoY movement
- **Target Gap**: Actual DIO vs. target DIO
- **Cash Impact**: Value of inventory reduction potential
- **Alerts**: SBUs with persistent DIO increases

## Constraints
- Always use `isActive = 1` on all tables.
- Filter out `%Demo%` business units.
- Inventory class = `1100000%`, COGS class = `4800000%`.
- State the period basis (365-day annual or 30-day monthly) when reporting.
- Rising DIO often signals slowing demand or excess procurement - pair with aging analysis.
