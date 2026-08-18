# Akij Resources — Inventory Audit & Gap Report

**Date:** 09-Aug-2026  
**Database:** DWH (203.202.241.211:1433)  
**Scope:** Governance, Management, Operations

---

## 1. Governance Gaps

| # | Gap | Severity | Evidence from Schema | Recommendation |
|---|-----|----------|---------------------|----------------|
| 1.1 | **All tables are archive copies (Arc suffix)** — no live transactional tables visible. Governance policies cannot be enforced on archived data alone. | **Critical** | Every inventory table ends with `Arc` (e.g., `tblInventoryTransactionHeaderArc`, `tblItemArc`, `tblWarehouseArc`). No live OLTP tables present in DWH. | Establish a connection to the live ERP database (likely iBOS or another source) and verify that DWH syncs correctly. |
| 1.2 | **No audit trail table** — there is no dedicated audit log table (e.g., `tblInventoryAuditLog`) to track who changed what and when. | **Critical** | Searched all 300+ tables. No table named with "Audit", "AuditLog", or "ChangeLog" related to inventory exists. | Create an `tblInventoryAuditLog` table capturing `UserID`, `Timestamp`, `TableName`, `Action`, `OldValue`, `NewValue`. |
| 1.3 | **No role-based access control visible** — no tables for user roles, permissions, or segregation of duties. | **High** | `tblUserArc` / `tblUserGroupArc` exist (from get_database_info) but no inventory-specific permission tables. | Implement role-based access: Receiving Clerk, Inventory Manager, Auditor. Enforce SOD so the person who adjusts stock cannot approve their own adjustments. |
| 1.4 | **Adjustment journals exist but no approval workflow table** — `tblAdjustmentApprovalArc` exists, but no evidence of mandatory approval before posting. | **High** | `tblAdjustmentJournalHeaderArc` and `tblAdjustmentApprovalArc` are separate — potential gap where adjustments post without approval. | Enforce a workflow: Adjustment → Approval → Post. Reject adjustments that bypass the approval table. |
| 1.5 | **No cycle count/scheduled count tables** — no physical inventory count reconciliation mechanism. | **High** | No tables like `tblCycleCountHeader`, `tblPhysicalInventory`, or `tblStockTake`. | Implement scheduled cycle counts with variance tracking and sign-off. |
| 1.6 | **No policy compliance flags** — tables lack fields for compliance status, regulatory flags, or retention periods. | **Medium** | Schema not inspectable live, but based on Arc table patterns, compliance metadata columns are likely absent. | Add `IsCompliant`, `RetentionDate`, `RegulationCode` columns to inventory tables. |

---

## 2. Management Gaps

| # | Gap | Severity | Evidence | Recommendation |
|---|-----|----------|----------|----------------|
| 2.1 | **No inventory snapshot/balance table** — there is no current stock-on-hand summary table. Only transaction-level data in Arc tables. | **Critical** | `tblInventoryTransactionHeaderArc`/`RowArc` store movements, but no `tblStockBalance` or `tblInventoryOnHand` table exists. | Create a materialized stock balance view or table refreshed daily from transaction data. |
| 2.2 | **No reorder level or safety stock configuration** — `tblItemMasterArc` and `tblItemPlantWarehouseArc` likely lack min/max/reorder fields. | **High** | No dedicated fields for `MinStock`, `MaxStock`, `ReorderPoint`, `SafetyStock` visible in the Arc schema. | Add reorder parameters to `tblItemPlantWarehouseArc` and set up automated low-stock alerts. |
| 2.3 | **No demand planning integration** — demand plan tables (`tblDemandPlanHeaderArc`, `tblDemandPlanRowArc`, `tblDemandPlanSummaryHeaderArc`, `tblDemandPlanSummaryRowArc`) exist but are disconnected from inventory transactions. | **High** | Demand plans are stored but there is no visible bridge table linking demand forecasts to actual stock movements. | Link demand plans to inventory via a common Item/Plant dimension and generate forecast-vs-actual deviation reports. |
| 2.4 | **No ABC classification** — no item categorization by value/velocity. | **Medium** | `tblItemCategoryArc` and `tblItemMasterCategoryArc` exist but no ABC/XYZ classification fields visible. | Add ABC classification based on consumption value. Focus cycle counts on A-items. |
| 2.5 | **No inventory aging report tables** — no slow-moving or obsolete stock tracking. | **Medium** | No tables like `tblInventoryAging`, `tblSlowMovingStock`, or `LastMovementDate` columns. | Add `LastTransactionDate` to item-warehouse mapping and generate aging reports weekly. |
| 2.6 | **Disconnected virtual warehouse** — `tblVirtualWarehouseTransactionHeaderArc`/`RowArc` exists alongside physical inventory transactions, but no reconciliation table between virtual and physical stock. | **Medium** | Two separate inventory transaction tables (physical + virtual) with no bridge/reconciliation mechanism. | Implement a reconciliation report that flags mismatches between virtual and physical warehouse counts. |

---

## 3. Operations Gaps

| # | Gap | Severity | Evidence | Recommendation |
|---|-----|----------|----------|----------------|
| 3.1 | **No real-time stock visibility** — all data is in Arc (archive) tables, suggesting batch replication. Operations staff may work with stale data. | **Critical** | Entire DWH uses `Arc` suffix tables — likely replicated on a schedule, not real-time. | Reduce replication lag or connect directly to the operational ERP for real-time queries. |
| 3.2 | **RTM (Route-to-Market) inventory is siloed** — separate `tblRtmInventoryTransactionHeaderArc`/`RowArc` tables not integrated with main inventory. | **High** | Two separate inventory systems: `tblInventoryTransaction*Arc` and `tblRtmInventoryTransaction*Arc`. | Unify inventory views or at minimum reconcile RTM stock with central warehouse stock daily. |
| 3.3 | **No barcode/serial/lot tracking** — no tables for batch numbers, serial numbers, or expiry dates. | **High** | No tables matching *Batch*, *Serial*, *Lot*, *Expiry* exist in the schema. | Add `tblBatchMaster` and `tblSerialTracking` tables, especially for perishable/regulated goods. |
| 3.4 | **Gate entry disconnected from inventory** — `tblGateEntryItemArc`, `tblGateEntryItemListHeaderArc`, `tblGateEntryItemListRowArc`, and `tblGatePassHeaderArc`/`RowArc` exist but likely not auto-posting to inventory. | **High** | Gate entries and gate passes are separate tables with no visible trigger/auto-post mechanism to inventory transactions. | Auto-post gate entries to inventory on approval — no manual re-entry. |
| 3.5 | **Damaged items handled in isolation** — `tblAdjustedDamageItemArc` exists but not linked to inventory on-hand. | **Medium** | Damaged items adjustments may not reduce available stock automatically. | Link damage adjustments to real-time stock reduction with reason codes. |
| 3.6 | **No pick/pack/ship workflow tables** — while `tblDeliveryHeaderArc`/`RowArc`, `tblShipmentHeaderArc`/`RowArc` exist, there's no picking/packing confirmation step. | **Medium** | Delivery and shipment tables exist but no pick-list or packing-slip tables (e.g., `tblPickList`, `tblPackingSlip`). | Implement pick confirmation that decrements inventory at the point of pick, not at shipment. |
| 3.7 | **Multiple warehouse types with no unified view** — `tblWarehouseArc`, `tblPlantWarehouseArc`, `tblVirtualPlantWarehouseArc`, `tblShipPointWarehouseArc` all exist separately. | **Medium** | Four different warehouse tables with no unified warehouse master or hierarchy. | Create a single `DimWarehouse` view consolidating all warehouse types with clear hierarchy. |

---

## Summary

| Category | Critical | High | Medium | Total |
|----------|----------|------|--------|-------|
| Governance | 2 | 3 | 1 | 6 |
| Management | 2 | 2 | 2 | 6 |
| Operations | 2 | 3 | 2 | 7 |
| **Total** | **6** | **8** | **5** | **19** |

### Top 5 Priority Actions

1. Connect to live ERP (not just DWH archives) for real-time inventory data.
2. Implement an audit trail/log table for all inventory changes.
3. Create a consolidated stock-on-hand balance table/view.
4. Unify RTM inventory with central warehouse inventory.
5. Auto-post gate entries to inventory transactions (eliminate manual re-entry).

---

*Note: This report is based on schema analysis only. Live data querying was unavailable due to MSSQL MCP connection drop. A deeper data-level audit (transaction volumes, stock discrepancies, user activity) requires reconnection to the database.*
