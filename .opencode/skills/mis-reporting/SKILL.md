# Skill: MIS Reporting

## Triggers
- Use this skill when queries involve: "MIS report", "integrated report", "dashboard", "management report", "aging analysis", "warehouse space", "capacity utilization", "inventory turnover", "DIO", "days inventory", "financial report", "summary report".

## Required Inputs
- Report type (closing stock / aging / warehouse / receipts / turnover)
- SBU filter (optional)
- Date range (optional, defaults to current)

## MCP Data Sources
### DWH Database (203.202.241.211)
| Table | Purpose |
|---|---|
| `fin.tblAccountingJournalArc` | All financial transactions with amounts |
| `fin.tblGeneralLedgerArc` | GL account master (join: `intGeneralLedgerId`) |
| `fin.tblAccountClassArc` | Account classification (1100000% = inventory) |
| `wms.tblInventoryTransactionHeaderArc` | WMS transaction headers |
| `wms.tblInventoryTransactionRowArc` | WMS transaction line items |
| `wms.tblItemPlantWarehouseArc` | Item-warehouse stock levels with capacity |
| `wms.tblWarehouseArc` | Warehouse master |
| `saas.masterBusinessUnitArc` | Business unit master |

## Report Types

### 1. Closing Stock Report
```sql
SELECT bu.strBusinessUnit, SUM(j.numAmount) AS NetStockValue
FROM saas.masterBusinessUnitArc bu
LEFT JOIN fin.tblAccountingJournalArc j ON bu.intBusinessUnitId = j.intBusinessUnitId
WHERE j.intGeneralLedgerId IN (inventory GLs) AND j.dteTransactionDate <= GETDATE()
GROUP BY bu.strBusinessUnit
```
- Filters: AccountClass `1100000%`, GL names containing inventory/stock/goods/Finished/Raw/WIP/spare

### 2. Aging Analysis
- **Obsolete**: Last GL transaction > 365 days
- **Non-Moving**: Last GL transaction 180-365 days
- **Slow-Moving**: Last GL transaction 90-180 days
- Query: Same as closing stock but add `MAX(j.dteTransactionDate)` and `DATEDIFF` classification

### 3. Warehouse Space Calculation
```sql
SELECT strBusinessUnitName, strWareHouseName, COUNT(*) AS Items,
  SUM(numCurrentStock) AS Current, SUM(numMaximumQuantity) AS MaxCapacity,
  SUM(numBlockStock) AS Blocked
FROM wms.tblItemPlantWarehouseArc
WHERE isActive = 1 AND numMaximumQuantity > 0
GROUP BY strBusinessUnitName, strWareHouseName
```
- Utilization % = Current / MaxCapacity * 100
- Overstock = items where `numCurrentStock > numMaximumQuantity`

### 4. Receipts & Issues Report
```sql
SELECT strBusinessUnitName,
  SUM(CASE WHEN TransactionGroupName IN ('Received From Production','Receive Inventory','Service Receive','Asset Receive','Transfer In') THEN numTotalAmount ELSE 0 END) AS Receipts,
  SUM(CASE WHEN TransactionGroupName IN ('Issue Inventory','Transfer Out') THEN numTotalAmount ELSE 0 END) AS Issues
FROM wms.tblInventoryTransactionHeaderArc
WHERE isActive = 1
GROUP BY strBusinessUnitName
```

### 5. Inventory Turnover (DIO)
- Formula: `DIO = (Average Inventory / COGS) * 365`
- COGS: AccountClass `4800000%`
- Average Inventory = (Opening + Closing) / 2

## Constraints
- Always filter out `%Demo%` from business unit names.
- Use `isActive = 1` on all joins.
- BDT values are from `numAmount` (journal) or `monTransactionValue` (WMS rows) or `numTotalAmount` (WMS headers).
- Negative stock values indicate returns/credits/adjustments exceeding debits.
- WMS values are cumulative transaction totals, not current balances.
