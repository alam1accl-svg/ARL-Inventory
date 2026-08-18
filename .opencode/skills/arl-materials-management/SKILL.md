# ARL Materials Management - Master Skill

## Overview
This is the **master skill** for **Akij Resource Limited (ARL) Inventory Material Department** under **BASHIR ALAM (HOD)**. It covers the complete materials management ecosystem: dashboards, database queries, Google Sheets, G-Drive files, and all 67+ SBUs.

**Department**: Inventory Material Department (Demand & Supply)  
**Organization**: Akij Resource Limited  
**MCP Server**: DWH @ 203.202.241.211:1433 (user: mcp_user)

---

## 1. GOOGLE SHEET MASTER TRACKER

**URL**: `https://docs.google.com/spreadsheets/d/1jDp9tL2aGrVpvPJWbb6VynamxOBNY9C46FmQraTpLko/edit`

### Tabs:

#### HOME (Budget Section)
| # | Report | Frequency |
|---|--------|-----------|
| 1 | ABP Inventory Budget 2026-2031 | Annually |
| 2 | ARL Departmental Budget 2026-2031 | Annually |
| 3 | ARL Departmental Budget 2026-27 | Annually |
| 4 | Safety Budget & Security Register | Annually |
| 6 | BS Lubricant Monthly Consumptions | Monthly |

#### DATA (18 Categories, 110+ Reports)

| Category | Count | Key Reports |
|----------|-------|------------|
| DAILY & WEEKLY REPORT | 9 | Stock Report, Delivery Reconciliation, Cycle Count, PR Pending, GRN Pending, Sales Plan vs Actual, Asset Parking, Stock Value, Diesel Stock |
| MONTHLY REPORT | 13 | Aging Report, Physical Inventory, Cycle Count, Inventory Adjustment, FG Reconciliation, Sales & Demand Forecast, Production Plan vs Actual, Materials Planning RM, Fixed Asset, Material Reconciliation, Bag Plan, Empty Cement Bag |
| PERIODIC REPORT | 6 | Mother Vessel Reconciliation, Mother Vessel 2021-2024, Lighter Vessel, Loan Summary, Fumigation, All Report Link Organizer |
| MONTHLY TRAINING | 1 | Monthly Training Report |
| INVENTORY TEAM | 27 | AGRILIFE, AUTOMOBILE, ABSL, ACCL FACTORY, ACCL WORKSHOP, COMMODITIES F&B, COMMODITIES DATES, ACEL, ELECTROFAB, COMMODITIES TRADING, INFOTECH, AIL, LOGISTICS, MEDIPLEX, APFIL, ARMCL-01 to 05, TELECOM, BLUE PILL, BONGO, DAILY, DIRECT, MTS STONE, NOBAYON |
| INVENTORY RECORD | 5 | ARL Inventory Hierarchy, Role Profiling, iBOS Access, Stock Level Formula, Spare Consumption |
| AUDIT | 2 | Audit Report, Self Report |
| EMPLOYEE DATABASE | 10 | Organogram, Team List, Man Power Rotation, Supervisor List, Workforce Alignment, Employee List, Depot-wise, New Manpower Requisition, Employee Clearance, Team & Responsibility |
| KPI | 6 | SCM Team KPI, BASHIR ALAM KPI, Full Team KPI, MMT KPI 2026-2027, Weekly KPI, Template |
| WAREHOUSE PROFILE | 9 | Compliance Tracker, Agreement Details, Capacity Register, Responsible Person, Workflow, Warehouse List with Product, WIP Process, Common Problems |
| TEMPLATE | 3 | TA/DA Register, Eid Checklist, 5S Tracker |
| POLICY & SOP | 6 | ARL Inventory Policy, SOP, Process Flow Chart, Loan Transfer Process, Work Sequence, Task List |
| ITEM PROFILE | 7 | Item Creation Template, Item Profiling, Service Item Old to New, ItemMaster, Item Master Code, Item List, Item Setup Form |
| EC MEETING | 15 | Warehouse Compliance, Business Rule Register, Audit Report, Inventory Mgmt Framework 2026, SSOT, Aging Report & Permission, Risk Assessment, Threat Register, Issue Register, Root Cause, PR Risk Decision, AIL_EC Meeting, Loss Gain Report, Provision Report, Mother Vessel 2022-2026 |
| OPERATION MEETING | 7 | ABC Analysis, Pending PO Against PR, LC Reconciliation, Inventory Leakage, Cycle Count, Physical Inventory, Yard Management |
| BUDGET | 4 | ABP Inventory Budget, ARL Departmental Budget, Safety Budget |
| MEETING & MINUTES | 9 | Meeting Link, Daily Meeting Host List, Meeting Minutes, Agenda, Inventory Website Link, Inventory Forms, Info Cube, IT Service Desk, HOD Switchboard |
| SBU LIST | 50+ | All Akij Group SBUs |

#### COLOR PALETTE
Dashboard colors: `#003333`, `#0EA5A4`, `#1d243c`, `#0F172A`, `#FBBF24`, `#57C3FF`, `#9A91FB`, `#BAFFF5`, `#FFDBBB`, `#AFEEEE`, `#85DECB`

---

## 2. DASHBOARDS CREATED

### 2.1 Main Dashboard (`dashboard.html`)
- Sidebar with 15+ navigation sections
- KPI cards (reports, categories, team, closing stock)
- Charts: Reports by Category, Frequency, Stock Value, Team Distribution
- Sections: Overview, Closing Stock, Aging Analysis, Warehouse Space, Inventory Team, SBU List, Calendar
- Features: Collapsible sidebar (Ctrl+B), Search (Ctrl+K), CSV export, Detail modals, Keyboard shortcuts
- Links to integrated_report.html and materials_dashboard.html

### 2.2 Integrated Report (`integrated_report.html`)
- 4 tabs: Overview, Negative Stock Items, Receipts & Issues, Item-wise Stock
- 32 SBUs with net stock values
- 18 negative GL items
- 23 SBUs with WMS receipts/issues
- 24 top items with qty, value, unit price

### 2.3 Materials Management Dashboard (`materials_dashboard.html`)
- 4 tabs: Closing Stock, PR Pending, GRN Items, Receipts & Issues
- PR pending: 27 SBUs, 57K+ PRs, 1.78B pending qty
- GRN: Magnum Steel gate entries
- Receipts/Issues: 23 SBUs from WMS

---

## 3. MCP DATABASE (DWH)

**Server**: 203.202.241.211:1433  
**Database**: DWH  
**User**: mcp_user  

### Key Tables Reference

#### Financial (GL Accounting)
| Table | Purpose |
|-------|---------|
| `fin.tblAccountingJournalArc` | All GL transactions (numAmount, dteTransactionDate, intBusinessUnitId, intGeneralLedgerId) |
| `fin.tblGeneralLedgerArc` | GL account master (strGeneralLedgerName, strGeneralLedgerCode) |
| `fin.tblAccountClassArc` | Account classes (strAccountClassCode: 1100000%=inventory, 4800000%=COGS) |
| `fin.tblAccountCategoryArc` | Account categories (link between GL and Class) |

#### Inventory GL Categories
```sql
SELECT gl.strGeneralLedgerCode, gl.strGeneralLedgerName
FROM fin.tblGeneralLedgerArc gl
JOIN fin.tblAccountCategoryArc cat ON gl.intAccountCategoryId = cat.intAccountCategoryId
JOIN fin.tblAccountClassArc ac ON cat.intAccountClassId = ac.intAccountClassId
WHERE ac.strAccountClassCode LIKE '1100000%' AND ac.isActive = 1 AND gl.isActive = 1
  AND (gl.strGeneralLedgerName LIKE '%inventor%' OR gl.strGeneralLedgerName LIKE '%stock%'
    OR gl.strGeneralLedgerName LIKE '%goods%' OR gl.strGeneralLedgerName LIKE '%Finished%'
    OR gl.strGeneralLedgerName LIKE '%Raw Material%' OR gl.strGeneralLedgerName LIKE '%WIP%'
    OR gl.strGeneralLedgerName LIKE '%spare%')
```
Results: 1110001-Raw Materials, 1110002-Raw Materials in Transit, 1110007-Semi Finished Goods, 1110010-Finished Goods in Stock, 1110011-Finished Goods in Transit/Purchase, 1110012-Trading Goods

#### WMS (Warehouse Management)
| Table | Purpose |
|-------|---------|
| `wms.tblInventoryTransactionHeaderArc` | Transaction headers (strBusinessUnitName, TransactionGroupName, dteTransactionDate, numTotalAmount, numTotalQty) |
| `wms.tblInventoryTransactionRowArc` | Transaction rows (strItemName, numTransactionQuantity, monTransactionValue, strInventoryLocationName) |
| `wms.tblItemPlantWarehouseArc` | Item-warehouse stock (numCurrentStock, numBlockStock, numMaximumQuantity, numReorderLevel, numSafetyStockQuantity, numMinimumStockQuantity) |
| `wms.tblWarehouseArc` | Warehouse master |
| `wms.tblInventoryLocationArc` | Location hierarchy |
| `wms.tblPlantWarehouseArc` | Plant-warehouse mapping |

Transaction Groups:
- **Receipts (Inbound)**: Received From Production, Receive Inventory, Service Receive, Asset Receive, Transfer In
- **Issues (Outbound)**: Issue Inventory, Transfer Out, Issue Return
- **Adjustments**: Adjust Inventory

#### Procurement
| Table | Purpose |
|-------|---------|
| `pro.tblPurchaseRequestHeaderArc` | PR headers (strBusinessUnitName, isComplete, isApproved, dteRequestDate) |
| `pro.tblPurchaseRequestRowArc` | PR items (strItemName, numRequestQuantity, numRestQuantity, numPurchaseOrderQuantity) |
| `mes.tblGateEntryItemListHeaderArc` | GRN headers (intBusinessUnitId, dteDate, strSupplierName, strTruckNumber) |
| `mes.tblGateEntryItemListRowArc` | GRN items (strItemName, numQuantity) |

#### Master Data
| Table | Purpose |
|-------|---------|
| `saas.masterBusinessUnitArc` | Business unit master (strBusinessUnit, intBusinessUnitId) - 67 active SBUs |

---

## 4. KEY SQL QUERIES

### 4.1 Closing Stock (All SBUs)
```sql
SELECT bu.strBusinessUnit AS SBU,
  ISNULL(SUM(j.numAmount), 0) AS NetStockValue,
  SUM(CASE WHEN j.numAmount > 0 THEN j.numAmount ELSE 0 END) AS PositiveValue,
  SUM(CASE WHEN j.numAmount < 0 THEN ABS(j.numAmount) ELSE 0 END) AS NegativeValue
FROM saas.masterBusinessUnitArc bu
LEFT JOIN fin.tblAccountingJournalArc j ON bu.intBusinessUnitId = j.intBusinessUnitId
  AND j.isActive = 1 AND j.dteTransactionDate <= GETDATE()
  AND j.intGeneralLedgerId IN (inventory GL filter - see section 3)
WHERE bu.isActive = 1
GROUP BY bu.strBusinessUnit
ORDER BY ISNULL(SUM(j.numAmount), 0) DESC
```

### 4.2 Stock by Category (SBU-wise, GL-wise)
```sql
SELECT bu.strBusinessUnit AS SBU, gl.strGeneralLedgerName AS Category,
  SUM(j.numAmount) AS StockValue, MAX(j.dteTransactionDate) AS LastGLDate
FROM fin.tblAccountingJournalArc j
JOIN fin.tblGeneralLedgerArc gl ON j.intGeneralLedgerId = gl.intGeneralLedgerId
JOIN saas.masterBusinessUnitArc bu ON j.intBusinessUnitId = bu.intBusinessUnitId
WHERE (inventory GL filter) AND j.isActive = 1 AND j.dteTransactionDate <= GETDATE()
GROUP BY bu.strBusinessUnit, gl.strGeneralLedgerName
```

### 4.3 Aging Analysis (Obsolete/Non-Moving/Slow-Moving)
- **Obsolete**: `DATEDIFF(DAY, MAX(dteTransactionDate), GETDATE()) > 365`
- **Non-Moving**: Between 180-365 days
- **Slow-Moving**: Between 90-180 days
- Query: Same as closing stock + `MAX(j.dteTransactionDate)` + `DATEDIFF` classification

### 4.4 PR Pending
```sql
SELECT h.strBusinessUnitName AS SBU, COUNT(DISTINCT h.intPurchaseRequestId) AS PR_Count,
  SUM(r.numRequestQuantity) AS TotalPR_Qty, SUM(r.numRestQuantity) AS Pending_Qty,
  COUNT(DISTINCT r.strItemName) AS Items, MAX(h.dteRequestDate) AS LastPR
FROM pro.tblPurchaseRequestHeaderArc h
JOIN pro.tblPurchaseRequestRowArc r ON h.intPurchaseRequestId = r.intPurchaseRequestId
WHERE h.isActive = 1 AND r.isActive = 1 AND h.isComplete = 0
  AND h.strBusinessUnitName NOT LIKE '%Demo%'
GROUP BY h.strBusinessUnitName
ORDER BY SUM(r.numRestQuantity) DESC
```

### 4.5 GRN Gate Entries
```sql
SELECT bu.strBusinessUnit AS SBU, r.strItemName,
  SUM(r.numQuantity) AS Received, COUNT(DISTINCT h.intGateEntryItemListId) AS Entries,
  MAX(h.dteDate) AS LastGRN
FROM mes.tblGateEntryItemListHeaderArc h
JOIN mes.tblGateEntryItemListRowArc r ON h.intGateEntryItemListId = r.intGateEntryItemListId
JOIN saas.masterBusinessUnitArc bu ON h.intBusinessUnitId = bu.intBusinessUnitId
WHERE h.isActive = 1 AND r.isActive = 1
GROUP BY bu.strBusinessUnit, r.strItemName
```

### 4.6 Receipts vs Issues (WMS)
```sql
SELECT strBusinessUnitName AS SBU,
  SUM(CASE WHEN TransactionGroupName IN ('Received From Production','Receive Inventory','Service Receive','Asset Receive','Transfer In') THEN numTotalAmount ELSE 0 END) AS Receipts,
  SUM(CASE WHEN TransactionGroupName IN ('Issue Inventory','Transfer Out','Issue Return') THEN numTotalAmount ELSE 0 END) AS Issues,
  COUNT(DISTINCT CASE WHEN ... THEN intInventoryTransactionId END) AS ReceiptTxns,
  COUNT(DISTINCT CASE WHEN ... THEN intInventoryTransactionId END) AS IssueTxns
FROM wms.tblInventoryTransactionHeaderArc
WHERE isActive = 1 AND strBusinessUnitName NOT LIKE '%Demo%'
GROUP BY strBusinessUnitName
```

### 4.7 Warehouse Space
```sql
SELECT strBusinessUnitName, strWareHouseName, COUNT(*) AS Items,
  SUM(numCurrentStock) AS Current, SUM(numMaximumQuantity) AS MaxCapacity,
  SUM(numBlockStock) AS Blocked,
  SUM(CASE WHEN numCurrentStock > numMaximumQuantity AND numMaximumQuantity > 0 THEN 1 ELSE 0 END) AS Overstock
FROM wms.tblItemPlantWarehouseArc
WHERE isActive = 1 AND numMaximumQuantity > 0
GROUP BY strBusinessUnitName, strWareHouseName
```

### 4.8 All Business Units
```sql
SELECT strBusinessUnit, strShortCode FROM saas.masterBusinessUnitArc WHERE isActive = 1 ORDER BY strBusinessUnit
```

---

## 5. G: DRIVE ACCESS

### Structure
- **My Drive** (`G:\My Drive\`): 3,407 files, 5.5 GB
  - INVENTORY REPORT, ZZ STOCK REPORT, KPI files, GRN FILE, LC UPDATE FILE
  - GHAT AGREEMENT, MOTHER VESSEL RECONCILATION, WAREHOUSE PLANING
  - DEMANDand SUPPLY ALINMENT (HTML dashboards), Training Session-2026
  - Key HTML: ACCL_SBU_Comprehensive_Report_Aug2026.html, ACCL_Inventory_Gap_Analysis_Aug2026.html, ACCL_CEO_Inventory_Planning_Dashboard_Aug2026.html

- **Shared drives** (`G:\Shared drives\INVENTORY MANAGMENT ARL\`): 8,803 files, 4.6 GB
  - 17 team folders: ACCL, APFIL, AKIJ ISPAT, CONSUMER AEL, FLOUR MILL, FEED MILL, G2G, MTS STONE, Akij Commodities, ARMCL, EXPORT, LUB OIL, Akij Agro Feed Trading, ACCL Workshop, AAR-COMMON, Challan Received

### File Types
- 3,515 PDFs (3.6 GB), 3,303 JPGs, 1,602 XLSX, 1,544 gsheet links, 403 gdoc links
- 8 MP4/WMV videos (3.3 GB training), 1 Power BI report

---

## 6. ALL SKILLS IN ECOSYSTEM

| Skill | Purpose |
|-------|---------|
| `arl-materials-management` (this) | Master skill - complete ecosystem overview |
| `inventory-management` | Stock level queries, warehouse DB |
| `procurement-management` | PR pending, GRN tracking, purchase orders |
| `mis-reporting` | Integrated reports, aging, warehouse space, DIO |
| `stock-analysis` | Closing stock, negative stock, item-wise valuation |
| `gdrive-access` | Navigate G: drive, access files |

---

## 7. QUICK REFERENCE

### All SBUs with Inventory (32 active from GL)
Akij Ispat Limited (BDT 4B), Batayon Traders (BDT 2.47B), Hashem Rice Mills (BDT 1.79B), Akij Agro Feed (BDT 1.44B), Nobayon Traders (BDT 1.37B), Akij Cement (BDT 869M), Akij Light Engineering (BDT 478M), Akij Poly Fibre (BDT 366M), M/S The Successors (BDT 256M), Fariq Agro (BDT 250M), Akij Ready Mix Concrete (BDT 174M), Akij Building Solutions (BDT 162M), Akij InfoTech (BDT 127M), AKIJ LifeCare (BDT 97M), Lineasia Trading (BDT 77M), AKIJ Automobile (BDT 57M), AKIJ Telecom (BDT 47M), ARL Traders (BDT 40M), Akij Breeders (BDT 43M), AKIJ Consumer Electronics (BDT 28M), Blue Pill (BDT 18M), Akij Resource (BDT 5.3M), Akij Electrofab (BDT 422K), Akij Shipping Line (BDT 294K) — + 8 negative SBUs

### Top Negative Stock SBUs
Akij Essentials Ltd. (BDT -29.15T), Eurasia Trading (BDT -421M), Direct Trading (BDT -237M), Akij Commodities (BDT -230M), Magnum Steel (BDT -65M), Asia One Trading (BDT -48M), Daily Trading (BDT -40M), Bongo Traders (BDT -31M)

### Top PR Pending SBUs
Kafil & Razzak Agro (798M pending), Hashem Rice Mills (327M), Akij Light Engineering (266M), Akij Essentials (214M), Akij Agro Feed (196M)

### Dashboard Files Location
All in `C:\Users\Bashir Alam\Documents\Default Project\`:
- `dashboard.html`
- `integrated_report.html`
- `materials_dashboard.html`

### Data Files
- `all_financial_ratios_akij.sql`
- `akij_cement_stock_value.sql`
- `akij_cement_dio.sql`
- `inventory_turnover_akij.sql`
- `opencode.json` (MCP server config)
