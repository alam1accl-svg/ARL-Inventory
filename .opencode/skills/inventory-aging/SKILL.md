---
name: inventory-aging
description: Inventory aging analysis for obsolete, non-moving, slow-moving, and fast-moving stock by SBU and item. Use this skill whenever the user asks about aging, obsolete stock, non-moving items, slow-moving inventory, days since last movement, or stock age analysis.
---

# Skill: Inventory Aging

## Triggers
- Use this skill when queries involve: "aging", "aging analysis", "obsolete stock", "obsolete inventory", "non-moving", "slow-moving", "fast-moving", "dead stock", "stock age", "days since last movement", "last transaction date", "idle inventory", "non-moving items".

## Required Inputs
- SBU or Business Unit name (optional - defaults to all)
- Item name or GL category (optional)
- Classification cutoff days (optional - defaults to standard buckets)
- Date range / as-of date (optional - defaults to GETDATE())

## Classification Buckets
| Category | Days Since Last Transaction |
|---|---|
| **Fast-Moving** | 0 - 30 days |
| **Moving** | 31 - 90 days |
| **Slow-Moving** | 91 - 180 days |
| **Non-Moving** | 181 - 365 days |
| **Obsolete / Dead Stock** | > 365 days |

## MCP Data Sources
### DWH Database (203.202.241.211)
| Table | Purpose |
|---|---|
| `fin.tblAccountingJournalArc` | Financial transactions with `dteTransactionDate`, `numAmount`, `intBusinessUnitId`, `intGeneralLedgerId` |
| `fin.tblGeneralLedgerArc` | GL account master (join: `intGeneralLedgerId`) |
| `fin.tblAccountClassArc` | Account classification (1100000% = inventory) |
| `wms.tblInventoryTransactionHeaderArc` | WMS transaction headers (`dteTransactionDate`, `strBusinessUnitName`) |
| `wms.tblInventoryTransactionRowArc` | WMS transaction line items |
| `wms.tblItemPlantWarehouseArc` | Item-warehouse stock with `numCurrentStock`, reorder levels |
| `saas.masterBusinessUnitArc` | Business unit master |

## Inventory GL Filter
```sql
SELECT gl.intGeneralLedgerId, gl.strGeneralLedgerCode, gl.strGeneralLedgerName
FROM fin.tblGeneralLedgerArc gl
JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
WHERE ac.strAccountClassCode LIKE '1100000%' AND ac.isActive = 1 AND gl.isActive = 1
  AND (gl.strGeneralLedgerName LIKE '%inventor%' OR gl.strGeneralLedgerName LIKE '%stock%'
    OR gl.strGeneralLedgerName LIKE '%goods%' OR gl.strGeneralLedgerName LIKE '%Finished%'
    OR gl.strGeneralLedgerName LIKE '%Raw Material%' OR gl.strGeneralLedgerName LIKE '%WIP%'
    OR gl.strGeneralLedgerName LIKE '%spare%')
```

## Step-by-Step Procedures

### 1. Aging Analysis by SBU (Financial View)
```sql
SELECT bu.strBusinessUnit AS SBU,
  ISNULL(SUM(j.numAmount), 0) AS StockValue,
  MAX(j.dteTransactionDate) AS LastTransactionDate,
  DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) AS DaysSinceLastMovement,
  CASE
    WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) > 365 THEN 'Obsolete'
    WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 181 THEN 'Non-Moving'
    WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 91 THEN 'Slow-Moving'
    WHEN DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) >= 31 THEN 'Moving'
    ELSE 'Fast-Moving'
  END AS AgingBucket
FROM saas.masterBusinessUnitArc bu
LEFT JOIN fin.tblAccountingJournalArc j ON bu.intBusinessUnitId = j.intBusinessUnitId
  AND j.isActive = 1 AND j.dteTransactionDate <= GETDATE()
  AND j.intGeneralLedgerId IN (SELECT inventory GL ids from filter above)
WHERE bu.isActive = 1
GROUP BY bu.strBusinessUnit
ORDER BY DaysSinceLastMovement DESC
```

### 2. Aging by Item / GL Category
```sql
SELECT bu.strBusinessUnit AS SBU, gl.strGeneralLedgerName AS Category,
  SUM(j.numAmount) AS StockValue,
  MAX(j.dteTransactionDate) AS LastTransactionDate,
  DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) AS DaysIdle
FROM fin.tblAccountingJournalArc j
JOIN fin.tblGeneralLedgerArc gl ON j.intGeneralLedgerId = gl.intGeneralLedgerId
JOIN saas.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
WHERE (inventory GL filter) AND j.isActive = 1 AND j.dteTransactionDate <= GETDATE()
GROUP BY bu.strBusinessUnit, gl.strGeneralLedgerName
HAVING DATEDIFF(DAY, MAX(j.dteTransactionDate), GETDATE()) > 90
ORDER BY DaysIdle DESC
```

### 3. Aging Bucket Summary (All SBUs)
- Group the results of query 1 into buckets
- Count SBUs and sum stock value per bucket
- Show % of total inventory tied up in each bucket
- Highlight total value at risk (Slow-Moving + Non-Moving + Obsolete)

### 4. WMS Item-level Aging (Physical View)
```sql
SELECT strBusinessUnitName AS SBU, strItemName, strWareHouseName,
  numCurrentStock, numBlockStock,
  DATEDIFF(DAY, MAX(dteTransactionDate), GETDATE()) AS DaysIdle
FROM wms.tblInventoryTransactionHeaderArc h
JOIN wms.tblInventoryTransactionRowArc r ON h.intInventoryTransactionId = r.intInventoryTransactionId
WHERE h.isActive = 1 AND r.isActive = 1
GROUP BY strBusinessUnitName, strItemName, strWareHouseName
HAVING DATEDIFF(DAY, MAX(dteTransactionDate), GETDATE()) > 180
```

## Key Metrics
- **Total Obsolete Value**: Inventory with > 365 days no movement
- **Non-Moving Value**: Inventory idle 181-365 days
- **Slow-Moving Value**: Inventory idle 91-180 days
- **Value at Risk**: Sum of Obsolete + Non-Moving + Slow-Moving
- **Worst SBUs**: Top SBUs by idle value and days idle
- **Disposal / Write-off Candidates**: Obsolete items with significant value

## Constraints
- Always use `isActive = 1` on all tables.
- Filter out `%Demo%` business units.
- Financial aging (`fin.`) uses cumulative GL balances; WMS aging uses physical transactions.
- `DATEDIFF(DAY, MAX(dteTransactionDate), GETDATE())` measures days since last recorded movement.
- Present results with the aging bucket label, stock value, and days idle for management action.
