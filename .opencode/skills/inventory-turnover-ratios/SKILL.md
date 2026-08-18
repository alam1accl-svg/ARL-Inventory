---
name: inventory-turnover-ratios
description: Inventory turnover ratio and DIO analysis across ARL SBUs. Use this skill whenever the user asks about inventory turnover, stock turnover ratio, inventory efficiency, COGS-based metrics, or how fast inventory sells.
---

# Skill: Inventory Turnover Ratios

## Triggers
- Use this skill when queries involve: "inventory turnover", "stock turnover", "turnover ratio", "inventory efficiency", "turnover days", "inventory days", "COGS", "cost of goods sold", "how fast stock moves", "stock cycle", "turnover rate", "ratio analysis".

## Required Inputs
- SBU or Business Unit name (optional - defaults to all)
- Period / fiscal year (optional - defaults to current)
- GL category filter (optional)

## Key Formulas
| Metric | Formula |
|---|---|
| **Inventory Turnover Ratio** | `COGS / Average Inventory` |
| **Days Inventory Outstanding (DIO)** | `(Average Inventory / COGS) * 365` |
| **Average Inventory** | `(Opening Inventory + Closing Inventory) / 2` |
| **COGS** | Sum of `numAmount` where AccountClass = `4800000%` |
| **Inventory (Current Asset)** | Sum of `numAmount` where AccountClass = `1100000%` |

## MCP Data Sources
### DWH Database (203.202.241.211)
| Table | Purpose |
|---|---|
| `fin.tblAccountingJournalArc` | All GL transactions (`numAmount`, `dteTransactionDate`, `intBusinessUnitId`, `intGeneralLedgerId`) |
| `fin.tblGeneralLedgerArc` | GL account master (join: `intGeneralLedgerId`) |
| `fin.tblAccountClassArc` | Account classes: `1100000%` = inventory, `4800000%` = COGS |
| `fin.tblAccountCategoryArc` | Links GL to Class |
| `saas.masterBusinessUnitArc` | Business unit master |

## Step-by-Step Procedures

### 1. COGS by SBU
```sql
SELECT bu.strBusinessUnit AS SBU,
  SUM(CASE WHEN j.dteTransactionDate >= @PeriodStart AND j.dteTransactionDate <= @PeriodEnd THEN j.numAmount ELSE 0 END) AS COGS
FROM fin.tblAccountingJournalArc j
JOIN fin.tblGeneralLedgerArc gl ON j.intGeneralLedgerId = gl.intGeneralLedgerId
JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
JOIN saas.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
WHERE ac.strAccountClassCode LIKE '4800000%' AND j.isActive = 1
  AND bu.isActive = 1 AND bu.strBusinessUnit NOT LIKE '%Demo%'
GROUP BY bu.strBusinessUnit
ORDER BY COGS DESC
```

### 2. Average Inventory (Opening + Closing)
```sql
-- Opening (period start)
SELECT bu.strBusinessUnit, SUM(j.numAmount) AS OpeningInventory
FROM fin.tblAccountingJournalArc j
JOIN saas.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
WHERE j.intGeneralLedgerId IN (inventory GL filter - 1100000%)
  AND j.isActive = 1 AND j.dteTransactionDate < @PeriodStart
GROUP BY bu.strBusinessUnit

-- Closing (period end)
SELECT bu.strBusinessUnit, SUM(j.numAmount) AS ClosingInventory
FROM fin.tblAccountingJournalArc j
JOIN saas.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
WHERE j.intGeneralLedgerId IN (inventory GL filter - 1100000%)
  AND j.isActive = 1 AND j.dteTransactionDate <= @PeriodEnd
GROUP BY bu.strBusinessUnit
```

### 3. Turnover Ratio & DIO by SBU
```sql
SELECT bu.strBusinessUnit AS SBU,
  @COGS AS COGS, @AvgInventory AS AverageInventory,
  (@COGS / NULLIF(@AvgInventory, 0)) AS InventoryTurnover,
  ((@AvgInventory / NULLIF(@COGS, 0)) * 365) AS DIO_Days
FROM saas.masterBusinessUnitArc bu
WHERE bu.isActive = 1 AND bu.strBusinessUnit NOT LIKE '%Demo%'
```

### 4. Interpretation
- **High turnover / low DIO**: Efficient inventory management, fast-moving goods
- **Low turnover / high DIO**: Slow-moving / excess / obsolete stock, cash tied up
- Compare against SBU benchmarks and prior periods to spot trends
- Flag SBUs with DIO above target as action candidates

## Key Metrics
- **Inventory Turnover Ratio**: Times per year inventory cycles
- **DIO (Days Inventory Outstanding)**: Average days stock sits before sale
- **Best Performers**: SBUs with highest turnover
- **At-Risk SBUs**: SBUs with high DIO (excess/obsolete stock risk)

## Constraints
- Always use `isActive = 1` on all tables.
- Filter out `%Demo%` business units.
- COGS class = `4800000%`, Inventory class = `1100000%`.
- Period boundaries from `dteTransactionDate` (inclusive).
- Turnover is a period metric - always state the period used.
