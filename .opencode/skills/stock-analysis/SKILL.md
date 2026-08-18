# Skill: Stock Analysis

## Triggers
- Use this skill when queries involve: "closing stock", "stock value", "inventory value", "negative stock", "stock position", "current stock", "stock qty", "item stock", "stock balance", "inventory balance", "stock report", "valuation".

## Required Inputs
- SBU name (optional - defaults to all)
- Item name or GL category (optional)
- As-of date (optional - defaults to GETDATE())

## MCP Data Sources
### DWH Database (203.202.241.211)
| Table | Purpose |
|---|---|
| `fin.tblAccountingJournalArc` | Stock values by GL account (financial view) |
| `fin.tblGeneralLedgerArc` | GL categories: Raw Materials, Finished Goods, Trading Goods, WIP |
| `fin.tblAccountClassArc` | Asset class filter (1100000% = Current Asset) |
| `wms.tblItemPlantWarehouseArc` | Item-level stock qty with location, capacity, reorder levels |
| `wms.tblInventoryLocationArc` | Location hierarchy |
| `wms.tblPlantWarehouseArc` | Plant-warehouse mapping |
| `saas.masterBusinessUnitArc` | Business unit names |

## Inventory GL Categories
| Code | Name |
|---|---|
| 1110001 | Raw Materials |
| 1110002 | Raw Materials in Transit |
| 1110007 | Semi Finished Goods |
| 1110010 | Finished Goods in Stock |
| 1110011 | Finished Goods in Transit/Purchase |
| 1110012 | Trading Goods |

## Step-by-Step Procedures

### 1. Total Stock Value (All SBUs)
```sql
SELECT bu.strBusinessUnit AS SBU,
  ISNULL(SUM(j.numAmount), 0) AS NetStockValue,
  SUM(CASE WHEN j.numAmount > 0 THEN j.numAmount ELSE 0 END) AS PositiveValue,
  SUM(CASE WHEN j.numAmount < 0 THEN ABS(j.numAmount) ELSE 0 END) AS NegativeValue
FROM saas.masterBusinessUnitArc bu
LEFT JOIN fin.tblAccountingJournalArc j ON bu.intBusinessUnitId = j.intBusinessUnitId
  AND j.isActive = 1 AND j.dteTransactionDate <= GETDATE()
  AND j.intGeneralLedgerId IN (inventory GL filter)
WHERE bu.isActive = 1
GROUP BY bu.strBusinessUnit
ORDER BY ISNULL(SUM(j.numAmount), 0) DESC
```

### 2. Negative Stock Analysis
- Filter: `SUM(j.numAmount) < 0`
- Group by SBU and GL category to identify which items are negative
- Highlight high-impact negatives (> BDT 10M)
- Check if caused by returns, adjustments, or missing receipts

### 3. Item-wise Current Stock (WMS)
```sql
SELECT strBusinessUnitName, strItemName, strWareHouseName,
  numCurrentStock, numBlockStock, numMaximumQuantity,
  numReorderLevel, numSafetyStockQuantity, numMinimumStockQuantity
FROM wms.tblItemPlantWarehouseArc
WHERE isActive = 1 AND numCurrentStock > 0
```
- Shows physical stock quantities per item per warehouse
- Compare with max/min levels for replenishment alerts

### 4. Stock Valuation by Category
- Break down each SBU's stock by: Raw Materials, WIP, Finished Goods, Trading Goods
- Calculate % distribution per category
- Highlight overweight categories (e.g., >60% in Raw Materials)

## Key Metrics
- **Total Closing Stock Value**: Sum of positive net positions
- **Negative Stock Count**: Number of GL categories with negative balance
- **Stock Concentration**: Top 5 SBUs as % of total
- **Days Since Last Movement**: `DATEDIFF(DAY, MAX(dteTransactionDate), GETDATE())`

## Constraints
- Always use `isActive = 1` on all tables.
- Filter out `%Demo%` business units.
- Stock values from accounting journal represent cumulative debits/credits to GL.
- WMS quantities are physical units; GL values are financial (BDT).
- Negative GL stock may indicate timing differences between receipt and invoice posting.
