# Akij Resources — Building Materials Inventory Audit & Gap Report

**Date:** 09-Aug-2026  
**Database:** DWH (203.202.241.211:1433)  
**Scope:** Building Materials — Governance, Management, Operations

---

## Category-Specific Context

Building materials (cement, steel rods, bricks, sand, aggregates, tiles, sanitary ware, etc.) carry unique risks that generic inventory systems often miss:

- **Bulk vs. discrete units**: Cement in tons/bags, steel in kg/bundles, sand in CFT — unit conversion errors are common.
- **Wastage & breakage**: 5-15% material loss is standard in construction; untracked wastage bleeds margins.
- **Project/site-level consumption**: Materials move from central warehouse → site → consumption, often with poor traceability at the last mile.
- **Quality grades**: Same SKU can have multiple grades (e.g., 40-grade rod vs. 60-grade rod). Mismatch = structural risk.
- **Supplier lot traceability**: Recalls require tracing which batch went to which project.

---

## 1. Governance Gaps

| # | Gap | Severity | Evidence | Impact on Building Materials |
|---|-----|----------|----------|------------------------------|
| 1.1 | **No material grade enforcement** — `tblItemArc`/`tblItemMasterArc` likely lack mandatory grade/spec fields. | **Critical** | No `Grade`, `Specification`, `IS_Standard` columns visible in schema. | Sub-standard steel or cement reaching project sites with no system block. |
| 1.2 | **No supplier quality approval table** — no link between supplier, material lot, and quality inspection result. | **Critical** | No tables matching `*Quality*`, `*Inspection*`, or `*TestCertificate*` exist. | Untested materials entering inventory. No audit trail for mill test certificates. |
| 1.3 | **No rejection/return-to-vendor workflow** — `tblSalesReturnHeaderArc`/`RowArc` exist for sales returns but no `tblPurchaseReturn` for returning defective materials to suppliers. | **High** | Purchase return table absent from 300+ table list. | Defective cement/steel stays in inventory or is consumed without traceable rejection. |
| 1.4 | **No hold/quarantine status on inventory** — no `HoldStatus`, `QuarantineFlag`, or `BlockedStock` fields in transaction tables. | **High** | Inventory transaction tables (`tblInventoryTransaction*Arc`) show `TransactionType` but no quality-hold dimension. | Failed batch can still be issued to a construction site. |
| 1.5 | **No wastage tolerance policy table** — no configurable wastage thresholds per material type. | **Medium** | No `tblWastageConfig` or `tblMaterialAllowance` table. | No governance on acceptable wastage; excess loss goes undetected. |

---

## 2. Management Gaps

| # | Gap | Severity | Evidence | Impact on Building Materials |
|---|-----|----------|----------|------------------------------|
| 2.1 | **No project/site-level stock ledger** — inventory transactions don't appear linked to projects or construction sites. | **Critical** | `tblProjectArc` exists but no `ProjectID` visible in inventory transaction tables. | Cannot answer: "How much steel was consumed at Site X this month?" |
| 2.2 | **No unit-of-measure conversion table** — building materials are received in tons, stored in bags, issued in pieces. | **Critical** | No `tblUOMConversion` or `tblUnitOfMeasure` table in schema. | 1 ton = how many rods? Conversion errors inflate or deflate stock silently. |
| 2.3 | **No BOM (Bill of Materials) linkage to inventory** — `tblBillOfMaterialHeaderArc`/`RowArc` exist but no evidence they deduct inventory on production/work-order consumption. | **High** | BOM tables exist but no `WorkOrderConsumption` or `BOMIssue` transaction type. | Theoretical consumption vs. actual consumption never reconciled. |
| 2.4 | **No material requisition-to-issue tracking** — `tblItemRequestHeaderArc`/`RowArc` and `tblRequisitionHeaderArc`/`RowArc` exist but no unified request → issue → consumption lifecycle. | **High** | Three separate request systems with no end-to-end traceability. | Over-issuing or duplicate issuing to sites with no reconciliation. |
| 2.5 | **No supplier performance scoring** — no table tracking supplier delivery timeliness, quality rejection rate, or price variance. | **Medium** | No `tblSupplierScorecard` or `tblSupplierPerformance` table. | Low-quality suppliers retained without data-driven review. |
| 2.6 | **No site-level stock reconciliation** — site returns/surplus not systematically tracked back to central warehouse. | **Medium** | No `tblSiteReturn` or `tblSurplusReturn` table. | Leftover materials at completed projects go unaccounted. |

---

## 3. Operations Gaps

| # | Gap | Severity | Evidence | Impact on Building Materials |
|---|-----|----------|----------|------------------------------|
| 3.1 | **No weighbridge integration** — bulk materials (sand, aggregate, cement bulkers) should be weighed-in and weighed-out. No weighbridge table exists. | **Critical** | No `tblWeighbridge`, `tblWeighment`, or `tblWeightTicket` table. | Bulk material received based on supplier invoice quantity, not actual weight. 10-15% loss risk. |
| 3.2 | **No lot/batch traceability** — cement and steel are batch-manufactured. Batch number must follow each bag/rod to site. | **Critical** | No `tblBatch`, `tblLot`, or `tblSerialNumber` table. | Structural failure → impossible to trace back to supplier batch. Massive liability risk. |
| 3.3 | **No breakage/damage registration at receipt** — `tblAdjustedDamageItemArc` exists but not linked to receipt/gate-entry. | **High** | Damage table is standalone; receipt tables (`tblGateEntryItemArc`) have no `DamageQty` or `RejectedQty` field. | Broken bricks, chipped tiles accepted into inventory at full quantity. |
| 3.4 | **Gate pass for materials leaving site** — `tblGatePassHeaderArc`/`RowArc` exist but no material-return-to-warehouse type. | **High** | Gate pass types unknown, but no `ReturnToWarehouse` or `SiteTransfer` type visible. | Materials leaving site without system record; potential pilferage. |
| 3.5 | **No vehicle/vendor tracking at gate** — `tblVehicleArc` exists but no link to gate entry tables. | **Medium** | Vehicle master present but gate entry tables may not reference `VehicleID`. | Cannot track which transporter delivered which material. |
| 3.6 | **No stacking/storage location within warehouse** — `tblInventoryLocationArc` exists but likely lacks bin/rack/row/aisle granularity. | **Medium** | Location table present but no `BinNumber`, `RackID`, or `ZoneID` columns confirmed. | Rod bundles, cement stacks misplaced; picking time wasted. |
| 3.7 | **No open-stock vs. covered-stock distinction** — cement and other moisture-sensitive materials need covered storage. No storage-condition flag visible. | **Low** | No `StorageCondition` or `StorageType` fields. | Cement stored in open yard degrades; quality loss not tracked. |

---

## Summary

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Governance | 2 | 2 | 1 | 0 | 5 |
| Management | 2 | 2 | 2 | 0 | 6 |
| Operations | 2 | 2 | 2 | 1 | 7 |
| **Total** | **6** | **6** | **5** | **1** | **18** |

---

## Top 5 Priority Actions for Building Materials

| Priority | Action | Business Impact |
|----------|--------|-----------------|
| **P1** | Implement weighbridge integration — auto-capture actual weight at gate entry | Stop paying for materials not received (10-15% cost leakage) |
| **P2** | Add lot/batch traceability — batch number mandatory at receipt, issue, and site consumption | Liability protection; recall capability |
| **P3** | Link inventory transactions to projects/sites — add `ProjectID` to all material movements | Site-wise consumption visibility; project margin accuracy |
| **P4** | Add quality hold/quarantine workflow — block issue of uninspected or failed materials | Prevent structural failures from substandard materials |
| **P5** | Implement UOM conversion master — define conversions for each material (ton↔bag↔piece) | Eliminate silent stock errors from unit mismatches |

---

*Note: Based on schema analysis of the DWH database. Live data queries were not possible due to MCP connection drop. A data-level audit (actual stock discrepancies, gate-pass-to-inventory mismatches, site consumption variance) requires database reconnection.*
