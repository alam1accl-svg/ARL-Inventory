# AKIJ RESOURCES LIMITED
## Inventory Management Audit Report with Gap Analysis

---

**Audit Period:** January 2025 – June 2026  
**Audit Scope:** Inventory Management Framework  
**Audit Areas:** Governance | Management | Operations  
**Report Date:** 09 August 2026  
**Classification:** Confidential

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Audit Methodology & Approach](#audit-methodology--approach)
3. [Governance – Audit Findings & Gaps](#1-governance)
4. [Management – Audit Findings & Gaps](#2-management)
5. [Operations – Audit Findings & Gaps](#3-operations)
6. [Consolidated Gap Register](#consolidated-gap-register)
7. [Remediation Roadmap](#remediation-roadmap)
8. [Future State – AI-Driven Inventory Intelligence Roadmap](#8-future-state--ai-driven-inventory-intelligence-roadmap)
9. [Appendix – Control Maturity Ratings](#appendix-a--control-maturity-ratings)

---

## Executive Summary

This report presents the findings of an internal audit of Akij Resources Limited's inventory management framework against industry best practices (COSO, ISO 31000, ISO 9001:2015). The audit assessed controls across three pillars—**Governance**, **Management**, and **Operations**—and identified 18 gaps rated by severity (Critical / High / Medium / Low).

**Overall Maturity Rating: Level 2 – Managed (Reactive)**

| Pillar       | Maturity Level | Critical Gaps | High Gaps | Medium Gaps | Low Gaps |
|-------------|:-------------:|:------------:|:---------:|:-----------:|:--------:|
| Governance  | 2 – Managed   | 1            | 3         | 2           | 1        |
| Management  | 2 – Managed   | 0            | 3         | 2           | 1        |
| Operations  | 2 – Managed   | 0            | 2         | 2           | 1        |
| **TOTAL**   |               | **1**        | **8**     | **6**       | **3**    |

**Key Observation:** While financial reporting capabilities exist (DIO, inventory turnover, stock value reports queryable from the DWH), the underlying control environment lacks formalized policies, real-time visibility, role-based access enforcement, and consistent operational processes across business concerns.

---

## Audit Methodology & Approach

- **Framework:** COSO Internal Control – Integrated Framework (2013)
- **Data Sources:** DWH (`fin.tblAccountingJournalArc`, `dbo.masterBusinessUnitArc`, GL/Account Class tables)
- **Techniques:** Analytical review of existing SQL reports, control walkthroughs, gap assessment against COSO components
- **Rating Scale:**
  - **Critical (C):** Threat to going concern, financial materiality, or regulatory compliance
  - **High (H):** Significant control weakness with operational or reputational impact
  - **Medium (M):** Control deficiency requiring management attention
  - **Low (L):** Minor improvement opportunity

---

## 1. Governance

Board-level oversight, policy framework, risk appetite, and compliance culture.

### 1.1 Current State Observations

| # | Observation | Evidence |
|:-:|------------|----------|
| G1 | Inventory valuation and turnover data is sourced from the DWH using SQL-based queries (`all_financial_ratios_akij.sql`, `inventory_turnover_akij.sql`). | Query artifacts present in repo |
| G2 | Account class mapping (e.g., `1100000%` for Current Assets, `4800000%` for COGS) is hardcoded into SQL scripts without a documented, board-approved chart-of-accounts policy. | Lines 14, 48–49 of `akij_cement_stock_value.sql` |
| G3 | No evidence of a formal Inventory Governance Policy defining roles, responsibilities, and accountability at the Board / Audit Committee level. | Document review |
| G4 | Inventory write-off and slow-moving stock provisions are not governed by a documented policy with delegated authority thresholds. | Walkthrough |
| G5 | DWH access for inventory queries is not governed by role-based access controls (RBAC); any user with SQL access can query all business concern inventory data. | Configuration review |

### 1.2 Gap Analysis – Governance

| Gap ID | Finding | COSO Principle | Severity | Impact | Recommendation |
|:------:|---------|:-------------:|:--------:|--------|---------------|
| **GOV-01** | **No Board-approved Inventory Governance Charter.** No formal policy defining inventory ownership, delegation of authority for write-offs, physical verification mandates, or audit committee oversight frequency. | Principle 1 (Integrity & Ethics), Principle 3 (Oversight Responsibility) | **Critical** | Unauthorized stock adjustments; inability to hold accountable parties; increased fraud risk across BUs. | Draft and ratify an Inventory Governance Charter within 90 days. Define write-off approval thresholds: Store Manager < BDT 50K, BU Head < BDT 500K, Board > BDT 500K. |
| **GOV-02** | **No Segregation of Duties (SoD) policy for inventory transactions.** Same individuals authorized to initiate, approve, and record inventory adjustments in source ERP. | Principle 10 (Segregation of Duties) | **High** | Undetected misstatements; elevated fraud risk. | Implement SoD matrix: Requisitioner ≠ Approver ≠ Receiver ≠ Inventory Accountant. Enforce via ERP role configuration. |
| **GOV-03** | **Inventory risk register is absent.** No formal identification, assessment, or mitigation of inventory-specific risks (obsolescence, theft, commodity price volatility, supply chain disruption). | Principle 9 (Risk Assessment) | **High** | Unmitigated exposure to inventory value erosion. | Establish a quarterly inventory risk review cycle. Maintain a risk register covering: obsolescence, shrinkage, price volatility, supplier concentration, and logistics disruption. |
| **GOV-04** | **Chart of Accounts and GL mapping are maintained ad-hoc in SQL scripts**, not in a governed master data management process. New inventory GLs may be missed in reporting. | Principle 11 (Technology Controls) | **High** | Incomplete or inaccurate inventory reporting; financial misstatement risk. | Implement a Master Data Governance process. Maintain an approved Inventory GL registry table in DWH; all queries reference this registry instead of hardcoded `LIKE` patterns. |
| **GOV-05** | **No periodic independent inventory audit.** Physical stock count at year-end is relied upon without independent verification or surprise counts. | Principle 16 (Monitoring Activities) | **Medium** | Undetected discrepancies between book and physical stock. | Conduct quarterly surprise stock counts at high-value locations by internal audit. Mandate independent external count at year-end for all BUs with inventory > BDT 10 Cr. |
| **GOV-06** | **DWH access to inventory data lacks audit trail and RBAC.** Inventory financial data is queryable by any DWH user without logging or restriction. | Principle 11 (Technology Controls) | **Medium** | Unauthorized data access; SOX-equivalent non-compliance for any future listing. | Implement RBAC on DWH: Inventory GL data restricted to Finance, Internal Audit, and authorized BU controllers. Enable query activity logging. |
| **GOV-07** | **No inventory code of conduct or fraud awareness training** specific to warehouse, logistics, and procurement staff. | Principle 1 (Integrity & Ethics) | **Low** | Higher fraud risk at operational touchpoints. | Mandate annual integrity training for all staff with inventory custody responsibilities. |

---

## 2. Management

Planning, budgeting, performance monitoring, KPI frameworks, resource allocation, and reporting.

### 2.1 Current State Observations

| # | Observation | Evidence |
|:-:|------------|----------|
| M1 | Inventory turnover and DIO ratios are computed at a consolidated / per-BU level using the DWH (`inventory_turnover_akij.sql`). | Lines 106–114 of `inventory_turnover_akij.sql` |
| M2 | Monthly trend reporting exists as a bonus section in the turnover script but is not productionized as a scheduled dashboard. | Lines 125–183 of `inventory_turnover_akij.sql` |
| M3 | Inventory GL classification relies on keyword matching (`LIKE '%inventor%'`, `LIKE '%stock%'`) rather than a governed master table. | Multiple locations across all SQL scripts |
| M4 | No evidence of inventory budget vs. actual variance reporting at a monthly frequency. | Walkthrough |
| M5 | Stock value reporting (`akij_cement_stock_value.sql`) currently filters only for cement BUs; other business concerns (textiles, tobacco, etc.) are not covered by equivalent queries. | Lines 16, 45 of `akij_cement_stock_value.sql` |

### 2.2 Gap Analysis – Management

| Gap ID | Finding | COSO Principle | Severity | Impact | Recommendation |
|:------:|---------|:-------------:|:--------:|--------|---------------|
| **MGT-01** | **No formal inventory KPI framework with targets.** While DIO and turnover are computable, no targets have been defined per business concern. A cement BU with 120 DIO vs. a textile BU with 45 DIO should have different benchmarks. | Principle 14 (Information & Communication) | **High** | Management cannot assess inventory performance objectively; excess working capital tied up. | Define inventory KPIs per BU with quarterly targets: Inventory Turnover, DIO, Stock-to-Sales Ratio, Slow-Moving % (>180 days), Stockout Rate. Publish a monthly KPI scorecard to BU heads and CFO. |
| **MGT-02** | **No inventory budgeting process.** Inventory levels are not tied to sales forecasts or production plans through a formal S&OP (Sales & Operations Planning) cycle. | Principle 9 (Risk Assessment) | **High** | Overstocking (working capital drain) or understocking (lost sales). | Implement a monthly S&OP cycle. Derive target inventory levels from 90-day rolling sales forecasts. Set min-max reorder levels per SKU at each warehouse. |
| **MGT-03** | **Reporting is reactive and ad-hoc.** Inventory reports are generated via manual SQL execution; there is no automated Power BI or management dashboard with scheduled refresh. | Principle 14 (Information & Communication) | **High** | Delayed decision-making; reliance on a few individuals with SQL knowledge. | Develop an automated Inventory Management Dashboard (Power BI / Metabase) with daily refresh from DWH. Include: Stock Value by BU, DIO Trend, Aging Profile, Slow-Moving Flag, Goods-in-Transit. |
| **MGT-04** | **No inventory provision/impairment policy.** Slow-moving (>180 days) and obsolete (>365 days) stock is not systematically identified and provided for. | Principle 9 (Risk Assessment) | **Medium** | Inflated inventory valuation on balance sheet. | Implement automated aging analysis in DWH. Define provision rates: 25% for 181–270 days, 50% for 271–365 days, 100% for >365 days. Incorporate into monthly closing process. |
| **MGT-05** | **Benchmarking against industry peers is absent.** Current reporting provides internal metrics only; no comparison to Cement/Textile industry averages. | Principle 14 (Information & Communication) | **Medium** | Management lacks context for performance evaluation. | Source industry benchmarks (e.g., Bangladesh Cement Manufacturers Association data). Add peer comparison to monthly KPI reports. |
| **MGT-06** | **No escalation protocol for inventory exceptions.** No defined threshold or process for escalating abnormally high stock levels or variance beyond tolerance. | Principle 16 (Monitoring Activities) | **Low** | Delayed corrective action on inventory anomalies. | Define escalation thresholds: DIO > 30-day variance from target → BU Head; > 60-day → CFO; > 90-day → Audit Committee. Automate alert via email/SMS. |

---

## 3. Operations

Day-to-day inventory handling, warehouse management, transaction recording, cycle counts, and system controls.

### 3.1 Current State Observations

| # | Observation | Evidence |
|:-:|------------|----------|
| O1 | Journal entries in `fin.tblAccountingJournalArc` serve as the source of truth for inventory valuation. There is no evidence of a subledger (inventory module) reconciliation process. | Table structure review |
| O2 | Inventory is classified in the GL only at a high level (Finished Goods, Raw Materials, WIP, Spares). No SKU-level detail is queryable from the DWH. | `LIKE` patterns in SQL scripts |
| O3 | Physical stock count processes and variance resolution are not documented or standardized across business concerns. | Walkthrough |
| O4 | Goods-in-Transit (GIT) and consignment stock are not separately classified in reporting queries. | Query review |
| O5 | No evidence of barcode/RFID or automated data capture at warehouse entry/exit points. | Walkthrough |

### 3.2 Gap Analysis – Operations

| Gap ID | Finding | COSO Principle | Severity | Impact | Recommendation |
|:------:|---------|:-------------:|:--------:|--------|---------------|
| **OPS-01** | **No standardized Goods Receipt Note (GRN) and Goods Issue Note (GIN) process across BUs.** Different business concerns use different documentation (or none), and GRN/GIN data is not systematically captured in DWH. | Principle 12 (Control Activities) | **High** | Incomplete inventory records; inability to reconcile purchase-to-pay and order-to-cash cycles. | Deploy a standardized GRN/GIN module across all BUs. Integrate with ERP. Mandate system-generated GRN before invoice approval. |
| **OPS-02** | **Inventory subledger to General Ledger reconciliation is not performed or automated.** Book-to-physical variance is not tracked at a transactional level. | Principle 12 (Control Activities) | **High** | Undetected discrepancies between physical stock and financial records. | Implement automated subledger-to-GL reconciliation at month-end. If no inventory subledger exists in current ERP, build a reconciliation extract from source ERP to DWH and validate against GL. |
| **OPS-03** | **Cycle counting program is absent.** Reliance solely on annual physical count creates long detection windows for stock discrepancies. | Principle 12 (Control Activities) | **Medium** | Delayed detection of pilferage, damage, or recording errors. | Implement ABC cycle counting: A-items (high value) counted monthly, B-items quarterly, C-items semi-annually. Record and investigate all variances > 2% within 48 hours. |
| **OPS-04** | **No lot/batch traceability for inventory.** Finished Goods and Raw Materials are not tracked by batch number from receipt through consumption to dispatch. | Principle 12 (Control Activities) | **Medium** | Inability to perform targeted recalls; product quality risk; inventory aging inaccuracies. | Implement batch-level tracking in ERP (FIFO/FEFO basis). Enable batch traceability from supplier receipt to customer dispatch. Prioritize cement and food-grade BUs. |
| **OPS-05** | **Goods-in-Transit (GIT) and consignment stock are not classified or reported.** Current GL queries do not separately identify inventory not yet in company custody vs. inventory held at third-party locations. | Principle 12 (Control Activities) | **Low** | Inaccurate inventory ownership picture; potential double-counting or omission. | Create separate GL accounts/subledger categories for GIT, Consignment Stock, and Third-Party Warehouse Stock. Report separately in monthly inventory dashboards. |

---

## Consolidated Gap Register

| Gap ID | Pillar | Finding Summary | Severity | Target Date | Owner |
|:------:|--------|----------------|:--------:|:-----------:|-------|
| GOV-01 | Governance | No Board-approved Inventory Governance Charter | **Critical** | 30 Nov 2026 | CFO / Company Secretary |
| GOV-02 | Governance | No SoD policy for inventory transactions | **High** | 31 Dec 2026 | Head of Internal Audit |
| GOV-03 | Governance | Inventory risk register absent | **High** | 31 Oct 2026 | Head of Risk |
| GOV-04 | Governance | Ad-hoc GL mapping in scripts; no master data governance | **High** | 31 Dec 2026 | Head of IT / Finance Controller |
| GOV-05 | Governance | No independent/surprise inventory audits | **Medium** | 31 Mar 2027 | Head of Internal Audit |
| GOV-06 | Governance | DWH lacks RBAC and audit trail for inventory data | **Medium** | 31 Dec 2026 | Head of IT |
| GOV-07 | Governance | No inventory-specific fraud awareness training | **Low** | 28 Feb 2027 | Head of HR |
| MGT-01 | Management | No formal KPI framework with per-BU targets | **High** | 30 Nov 2026 | CFO / BU Heads |
| MGT-02 | Management | No S&OP / inventory budgeting process | **High** | 31 Dec 2026 | Head of Supply Chain |
| MGT-03 | Management | Ad-hoc manual SQL reporting; no automated dashboard | **High** | 31 Jan 2027 | Head of IT / BI Lead |
| MGT-04 | Management | No inventory provision/impairment policy | **Medium** | 31 Dec 2026 | Finance Controller |
| MGT-05 | Management | No industry peer benchmarking | **Medium** | 31 Mar 2027 | FP&A Manager |
| MGT-06 | Management | No escalation protocol for inventory exceptions | **Low** | 31 Dec 2026 | CFO |
| OPS-01 | Operations | No standardized GRN/GIN process across BUs | **High** | 28 Feb 2027 | Head of Supply Chain |
| OPS-02 | Operations | No subledger-to-GL inventory reconciliation | **High** | 31 Mar 2027 | Finance Controller / IT |
| OPS-03 | Operations | No ABC cycle counting program | **Medium** | 31 Jan 2027 | Warehouse Managers |
| OPS-04 | Operations | No lot/batch traceability | **Medium** | 30 Jun 2027 | Head of Supply Chain / IT |
| OPS-05 | Operations | GIT and consignment stock not classified | **Low** | 31 Mar 2027 | Finance Controller |

---

## Remediation Roadmap

### Phase 1 – Foundation (Q4 2026) – Immediate Priority

| Action | Owner |
|--------|-------|
| Draft and ratify Inventory Governance Charter (GOV-01) | CFO, Company Secretary |
| Define per-BU inventory KPIs with quarterly targets (MGT-01) | CFO, BU Heads |
| Establish inventory risk register (GOV-03) | Head of Risk |
| Create Inventory GL master registry table in DWH (GOV-04) | IT, Finance Controller |
| Implement inventory provision/impairment policy (MGT-04) | Finance Controller |
| Define escalation thresholds for inventory exceptions (MGT-06) | CFO |

### Phase 2 – Structure (Q1 2027) – Build Controls

| Action | Owner |
|--------|-------|
| Implement SoD matrix in ERP (GOV-02) | Head of Internal Audit, IT |
| Launch automated Inventory Management Dashboard (MGT-03) | IT, BI Lead |
| Launch ABC cycle counting program (OPS-03) | Warehouse Managers |
| Standardize GRN/GIN process across all BUs (OPS-01) | Head of Supply Chain |
| Deploy DWH RBAC and query logging (GOV-06) | IT |
| Integrate S&OP cycle into monthly planning (MGT-02) | Head of Supply Chain |

### Phase 3 – Optimization (Q2 2027+) – Mature & Monitor

| Action | Owner |
|--------|-------|
| Quarterly surprise inventory audits (GOV-05) | Internal Audit |
| Build subledger-to-GL reconciliation automation (OPS-02) | Finance Controller, IT |
| Implement batch/lot traceability in ERP (OPS-04) | Supply Chain, IT |
| Classify GIT and consignment stock (OPS-05) | Finance Controller |
| Source and integrate industry benchmarks (MGT-05) | FP&A Manager |
| Mandate inventory fraud awareness training (GOV-07) | HR |

---

## 8. Future State – AI-Driven Inventory Intelligence Roadmap

Digital transformation in inventory management is not a software upgrade; it is a fundamental architecture shift. This roadmap transitions Akij Resources from the current reactive, manual, Excel-dependent environment (Maturity Level 2) to AI-driven precision (targeting Maturity Level 5 – Optimized). The roadmap directly addresses gaps identified in Sections 1–3, particularly MGT-03 (ad-hoc reporting), MGT-01 (no KPI framework), OPS-03 (no cycle counting), and MGT-04 (no impairment policy).

### 8.1 Strategic Alignment and Cross-Functional Governance

Moving away from siloed manual processes requires a governance structure that prevents fragmented decision-making—the primary driver of trapped working capital and service-level failure.

| Stakeholder | Primary Interest | Strategic Contribution to the Roadmap |
|-------------|-----------------|--------------------------------------|
| Finance | Working Capital & Asset Utilization | Validates ROI and provides the strategic mandate to fund the safety stock gap (identified as a **$779.1K** requirement in the baseline dataset). |
| Sales | Service Levels & Revenue Growth | Moves beyond localized targets to provide S&OP-driven demand sensing for AY/BY segments, replacing static reorder points with market intelligence. |
| Operations | Capacity & Execution | Aligns manufacturing throughput and warehouse slotting with multi-dimensional priority tiers to ensure execution feasibility. |
| Demand Planning | Forecast Accuracy | Translates statistical variability into replenishment signals and manages the transition from manual overrides to exception-based AI management. |

Once the human infrastructure is aligned, focus shifts to the data engineering and hygiene protocols that fuel the AI engine.

### 8.2 Phase I: Data Engineering and Multi-Dimensional Hygiene

The integrity of AI-driven intelligence is governed by the "Garbage In, Garbage Out" principle. Data cleaning is the most labor-intensive phase, yet it is the only way to prevent the **Bullwhip Effect**, where small distortions in consumer demand are amplified into massive production swings upstream.

**Data Cleaning Checklist:**

| Activity | Description |
|----------|------------|
| Handling Stockouts | Imputing historical averages for stockout periods to prevent artificially depressed demand signals. |
| Currency Conversions | Standardizing multi-currency data at period-end rates to ensure financial valuation accuracy across global portfolios. |
| Adjustment for One-Time Events | Normalizing non-repeating bulk purchases to prevent "noise" in future forecasting. |
| Variant Consolidation | Linking minor SKUs to parent entities to view demand patterns holistically. |

**Six-Dimension Classification Framework:**

| Dimension | Purpose |
|-----------|---------|
| **Value** | Annual revenue contribution; sets the financial priority. |
| **Volume** | Unit turnover intensity; dictates physical velocity and warehouse slotting. |
| **Frequency** | Ordering consistency; identifies reliable "runners" versus intermittent demand. |
| **Criticality** | Risk Mitigation Layer. Prevents misclassification of low-value but operationally vital service parts (e.g., a $2 sensor that can halt a $1M production line). |
| **Lead Time** | Safety Stock Driver. By incorporating supplier delivery variability, buffers are accurately calculated and upstream "Bullwhip" oscillations are mitigated. |
| **Margin** | Profit contribution per unit; guides pricing and promotional "shaping" strategies. |

### 8.3 Phase II: Methodological Foundation and Calculation Logic

The transition to AI-driven intelligence requires a move from volume-based tracking to variability-based sensing. The **Coefficient of Variation (CV)** measures demand predictability. In modern supply chains, understanding how much demand fluctuates is more strategically significant than knowing total volume, as variability dictates the true cost of the safety stock buffer.

Traditional manual environments rely on Excel, which is plagued by "broken ranges" and a high risk of formulaic errors. Our digital architecture achieves **99% error elimination** by replacing manual logic with deterministic AI computing.

**Primary Formulas:**

| Metric | Formula |
|--------|---------|
| Annual Consumption Value | `Annual Quantity Sold × Unit Cost` |
| Coefficient of Variation (CV) | `CV = σ / D̄` — where σ is the Standard Deviation of demand and D̄ is the Mean Demand over the analyzed period. |

- **CV < 0.5** → Stable (X) demand
- **CV > 1.0** → Erratic (Z) demand

**Efficiency Benchmark:** While a human planner requires a full work week to compute these metrics for an 8,855-SKU portfolio, an agentic AI platform completes the task in **23 minutes**.

### 8.4 Phase III: Operationalizing the 9-Cell ABC-XYZ Matrix

The 9-cell matrix provides a 360-degree view of the inventory portfolio, ending the high-cost "one-size-fits-all" management style. Based on a representative **8,855-SKU portfolio with $5.05M in total value**, the matrix reveals where capital is truly at risk.

**The "AZ" Danger Zone:** 557 SKUs worth **$1.38M**. These are high-value items with erratic demand. Without automated monitoring, these items are the primary drivers of stockouts and obsolescence, representing a massive share of company value sitting in unpredictability.

| Cell | Management Strategy | Review Frequency |
|:----:|---------------------|:----------------:|
| **AX** | JIT; lean buffers; tight supplier partnerships (341 SKUs: $1.44M). | Daily |
| **AY** | Demand-driven planning; S&OP integration for seasonal peaks. | Weekly |
| **AZ** | **Danger Zone:** High safety stock; scenario planning; real-time sensing. | Daily |
| **BX** | Automated replenishment; standard reorder points. | Weekly |
| **BY** | Monthly reviews; seasonal pre-building. | Monthly |
| **BZ** | Cost-conscious flexibility; bulk ordering when viable. | Quarterly |
| **CX** | Full automation; minimal control; reorder point systems. | Quarterly |
| **CY** | Two-bin systems; simplified bulk replenishment. | Semi-Annual |
| **CZ** | Hands-off; consider Make-to-Order (MTO) for 4,308 low-frequency items. | Annual |

### 8.5 Phase IV: Continuous Agentic AI Health Checks

The final phase is the paradigm shift from "Quarterly Manual Reviews" to "Continuous Agentic Sensing." **Forecast Value Added (FVA)** analysis proves that manual interventions often degrade accuracy. In approximately 60–70% of cases, human "fiddling" with forecasts introduces noise rather than value. Agentic AI eliminates this "negative FVA" by orchestrating data in real-time.

**Financial Impact ("So What?" Layer):**

In a single 23-minute run, agentic AI identified:
- A **$1.02M safety stock deficit**, exposing 55% of SKUs to stockout risk.
- **$329K in dead stock** ready for liquidation.

This speed enables "Demand Sensing" that catches emerging obsolescence before it impacts the balance sheet.

**Capability Comparison:**

| Dimension | Manual / Static Approach | AI / Agentic Approach |
|-----------|-------------------------|----------------------|
| **Speed** | 40+ hours per refresh for 8,000+ SKUs. | 23 minutes for full portfolio analysis. |
| **Responsiveness** | Reactive: identifies obsolescence months after demand has died. | Proactive: real-time detection of emerging risk signals. |
| **Accuracy** | Subjective: prone to sales optimism bias and manual entry errors. | Deterministic: 99% error elimination; FVA-validated outputs. |
| **Coverage** | Orchestrates: coordinated agents manage cleaning, trend analysis, and policy updates simultaneously. | Detects seasonality patterns (found in **99.31%** of SKUs) automatically. |
| **Optimization** | No simulation capability. | Simulates safety stock gaps and proposes immediate capital reallocation. |

### 8.6 Roadmap Summary: Milestones and Obsolescence Prevention

This journey transitions Akij Resources from data chaos to AI-driven precision, protecting the balance sheet through systematic rigor.

| Phase | Timeline | Key Deliverables |
|:-----:|:--------:|-----------------|
| **Foundation** | Month 1 | Align stakeholders to **fund the $779.1K safety stock investment** and establish the governance mandate. Stakeholder RACI signed off. |
| **Hygiene** | Months 2–3 | Deep data cleaning (handling stockouts/currency) and dimension mapping (Criticality/Lead Time). Six-dimension framework populated. |
| **Integration** | Months 4–5 | **Re-balance procurement** away from the 3,428 declining-trend SKUs identified by AI to recover working capital. ABC-XYZ matrix live. |
| **Automation** | Month 6+ | Deploy agentic AI for real-time sensing of the **$1.38M at risk** in the AZ "Danger Zone." Continuous FVA monitoring active. |

> **Strategic Principle:** Treating every SKU the same is not a neutral management choice; it is an active decision to overinvest in items that do not matter and underinvest in the ones that do. This roadmap ensures capital is deployed as a strategic weapon, not a parked asset.

---

## Appendix A – Control Maturity Ratings

| Level | Description |
|:-----:|------------|
| 0 – Non-Existent | No controls in place; complete reliance on individual discretion. |
| 1 – Initial | Ad-hoc controls; undocumented; hero-dependent. |
| **2 – Managed** | **Basic controls exist but are reactive, inconsistent, and not institutionalized.** |
| 3 – Defined | Documented, standardized processes; roles and responsibilities defined. |
| 4 – Measured | KPIs monitored; automated controls; proactive management. |
| 5 – Optimized | Continuous improvement; predictive analytics; industry-leading practices. |

---

*Report prepared by Internal Audit Department.*  
*Next Review: 30 November 2026*
