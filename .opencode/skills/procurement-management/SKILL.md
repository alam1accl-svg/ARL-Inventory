# Skill: Procurement Management

## Triggers
- Use this skill when queries involve: "PR", "Purchase Requisition", "GRN", "Goods Received Note", "Gate Entry", "pending PR", "pending GRN", "PO", "Purchase Order", "procurement", "material receipt".

## Required Inputs
- SBU name or Business Unit name
- Item name or category (optional)
- Date range (optional)

## MCP Data Sources
### DWH Database (203.202.241.211)
| Table | Purpose |
|---|---|
| `pro.tblPurchaseRequestHeaderArc` | PR headers - SBU, status, dates |
| `pro.tblPurchaseRequestRowArc` | PR line items - item, qty, pending, PO qty |
| `mes.tblGateEntryItemListHeaderArc` | GRN headers - supplier, vehicle, dates |
| `mes.tblGateEntryItemListRowArc` | GRN line items - item, qty |
| `saas.masterBusinessUnitArc` | Business unit master (join key: `intBusinessUnitId`) |

### PR Key Fields
- `tblPurchaseRequestHeaderArc`: `strBusinessUnitName`, `isComplete`, `isClosed`, `dteRequestDate`, `isApproved`
- `tblPurchaseRequestRowArc`: `strItemName`, `numRequestQuantity`, `numRestQuantity`, `numPurchaseOrderQuantity`, `numApprovedQuantity`

### GRN Key Fields
- `tblGateEntryItemListHeaderArc`: `intBusinessUnitId`, `dteDate`, `strSupplierName`, `strTruckNumber`, `strPoNo`
- `tblGateEntryItemListRowArc`: `strItemName`, `numQuantity`

## Step-by-Step Procedures
1. **Identify Intent**: Determine if query is for PR tracking, GRN tracking, or both.
2. **Query PR Pending**:
   ```sql
   SELECT h.strBusinessUnitName, r.strItemName, SUM(r.numRequestQuantity) AS Requested, SUM(r.numRestQuantity) AS Pending, SUM(r.numPurchaseOrderQuantity) AS PO_Qty
   FROM pro.tblPurchaseRequestHeaderArc h
   JOIN pro.tblPurchaseRequestRowArc r ON h.intPurchaseRequestId = r.intPurchaseRequestId
   WHERE h.isActive = 1 AND r.isActive = 1 AND h.isComplete = 0
   GROUP BY h.strBusinessUnitName, r.strItemName
   ORDER BY SUM(r.numRestQuantity) DESC
   ```
3. **Query GRN Receipts**:
   ```sql
   SELECT bu.strBusinessUnit, r.strItemName, SUM(r.numQuantity) AS Received, COUNT(DISTINCT h.intGateEntryItemListId) AS Entries
   FROM mes.tblGateEntryItemListHeaderArc h
   JOIN mes.tblGateEntryItemListRowArc r ON h.intGateEntryItemListId = r.intGateEntryItemListId
   JOIN saas.masterBusinessUnitArc bu ON h.intBusinessUnitId = bu.intBusinessUnitId
   WHERE h.isActive = 1 AND r.isActive = 1
   GROUP BY bu.strBusinessUnit, r.strItemName
   ```
4. **Present Results**: Show pending PRs with qty and age, GRN receipts with dates, highlight stale PRs (>30 days).

## Constraints
- Always filter out Demo Business Unit.
- PR queries must check `isComplete = 0` for pending items.
- GRN data is primarily from Magnum Steel (gate entry system).
- Date filtering uses `dteRequestDate` for PR, `dteDate` for GRN.
