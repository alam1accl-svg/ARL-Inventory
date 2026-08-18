---
name: otif-management
description: On-Time In-Full (OTIF) delivery performance tracking for ARL. Use this skill whenever the user asks about OTIF, on-time delivery, in-full delivery, delivery performance, fill rate, line fill, order fill, delivery accuracy, or service level.
---

# Skill: OTIF Management

## Triggers
- Use this skill when queries involve: "OTIF", "on-time in-full", "on-time delivery", "in-full", "delivery performance", "fill rate", "line fill rate", "order fill rate", "delivery accuracy", "service level", "complete delivery", "timely delivery", "delivered on time", "short delivery", "order fulfillment".

## Required Inputs
- SBU or Business Unit name (optional - defaults to all)
- Date range (optional - defaults to current period)
- Item or customer filter (optional)

## OTIF Definition
| Component | Meaning |
|---|---|
| **On-Time (OT)** | Delivered by the agreed / promised date |
| **In-Full (IF)** | Delivered in the requested quantity (no shortage) |
| **OTIF** | Percentage of orders/deliveries meeting BOTH criteria |

`OTIF % = (Orders On-Time AND In-Full / Total Orders) * 100`

## MCP Data Sources
### DWH Database (203.202.241.211)
| Table | Purpose |
|---|---|
| `wms.tblInventoryTransactionHeaderArc` | Delivery transaction headers (`strBusinessUnitName`, `TransactionGroupName`, `dteTransactionDate`, `numTotalQty`) |
| `wms.tblInventoryTransactionRowArc` | Delivery line items (`strItemName`, `numTransactionQuantity`, `monTransactionValue`) |
| `wms.tblItemPlantWarehouseArc` | Stock availability at warehouses (fill-rate context) |
| `mes.tblGateEntryItemListHeaderArc` | GRN / receipt headers (`dteDate`, `strSupplierName`) |
| `pro.tblPurchaseRequestHeaderArc` | Demand origin / requested dates |
| `saas.masterBusinessUnitArc` | Business unit master |

> Note: OTIF source of truth may live in the iBOS/ERP (delivery orders). Confirm available delivery/promise-date tables before computing.

## Step-by-Step Procedures

### 1. On-Time Delivery %
```sql
-- Example: deliveries on/before promised date vs. total deliveries
SELECT strBusinessUnitName AS SBU,
  COUNT(DISTINCT intInventoryTransactionId) AS TotalDeliveries,
  SUM(CASE WHEN dteTransactionDate <= @PromisedDate THEN 1 ELSE 0 END) AS OnTimeDeliveries
FROM wms.tblInventoryTransactionHeaderArc
WHERE isActive = 1 AND strBusinessUnitName NOT LIKE '%Demo%'
GROUP BY strBusinessUnitName
```

### 2. In-Full Delivery %
- Compare ordered quantity vs. delivered quantity per line
- **Line Fill Rate** = `Delivered Qty / Ordered Qty`
- Full line = delivered >= ordered
- **Order Fill Rate** = orders where all lines delivered in full

### 3. OTIF Score
- Combine On-Time AND In-Full flags per order/line
- `OTIF = (orders that were both on-time and in-full / total orders) * 100`
- Break down by SBU, item, warehouse, and period

### 4. Root Cause & Action
- **Not On-Time**: supplier delay, logistics, transport capacity, warehouse congestion
- **Not In-Full**: stockouts, procurement shortfall, allocation issues
- Present top reasons and recommend corrective actions (replenishment, supplier follow-up, redistribution)

## Key Metrics
- **OTIF %**: Overall service level per SBU
- **OT%** and **IF%** separately to isolate the failure driver
- **Line Fill Rate**: Per-item fulfillment accuracy
- **Worst Performers**: SBUs/items with lowest OTIF
- **Stockout Impact**: In-full failures caused by insufficient stock

## Constraints
- Always use `isActive = 1` on all tables.
- Filter out `%Demo%` business units.
- Confirm the promised-date field exists; if only actual dates are available, state OT is unverifiable.
- Separate OT and IF metrics before combining into OTIF to pinpoint the gap.
- Report the period and SBU scope clearly.
