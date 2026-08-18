# Skill: G-Drive Access

## Triggers
- Use when queries involve: "G drive", "google drive", "shared drives", "my drive", "drive files", "G: drive", "laptop drive files", "ARL files", "inventory files on drive".

## Overview
The G: drive is a **Google Drive Desktop Mount** containing all Akij Resource Limited inventory management documents. It has two main sections:

| Section | Files | Folders | Size |
|---|---|---|---|
| My Drive | 3,407 | 707 | 5.5 GB |
| Shared drives (INVENTORY MANAGMENT ARL) | 8,803 | 1,002 | 4.6 GB |
| **Total** | **12,210** | **1,709** | **10.15 GB** |

## Key Business Areas Accessible via G: Drive

### My Drive (Personal - BASHIR ALAM)
- Inventory Reports, Stock Reports, GRN Files, LC Update Files
- KPI Master Files, Performance Review, SCM Strategic Plan
- Training Materials (2026 sessions, videos)
- Ghat/Port Agreements, Mother Vessel Reconciliation
- Demand-Supply Alignment (with HTML dashboard reports)
- Warehouse Planning, ISO Files, Asset Projects
- HTML reports: ACCL Comprehensive Report, Gap Analysis, CEO Dashboard

### Shared Drives (Team - INVENTORY MANAGMENT ARL)
- ACCL (Cement), APFIL (Bags), AKIJ ISPAT (Steel)
- AEL Consumer, Feed Mill, Flour Mill
- Akij Commodities (largest), MTS Stone, ARMCL
- G2G Trading, Akij Agro Feed Trading
- Export, Lub Oil, ACCL Workshop
- Challan Received & MRR Status

## File Types
- **3,515 PDFs** (3.6 GB) - agreements, reports, invoices
- **3,303 JPGs** (572 MB) - photos, documentation
- **1,602 XLSX** (361 MB) - spreadsheets, trackers
- **1,544 .gsheet** - Google Sheets (online links)
- **403 .gdoc** - Google Docs (SOPs, policies, notes)
- **64 .gslides** - Presentations
- **8 MP4/WMV** (3.3 GB) - Training videos
- **1 PBIX** - Power BI report

## Step-by-Step Access
1. Navigate to `G:\` as root
2. `G:\My Drive\` for personal files
3. `G:\Shared drives\INVENTORY MANAGMENT ARL\` for team files
4. Use `Get-ChildItem -Recurse` to explore subdirectories
5. Filter by extension: `*.xlsx`, `*.pdf`, `*.gsheet`, `*.html`, etc.

## Constraints
- `.gsheet`, `.gdoc`, `.gslides` files are link placeholders (180 bytes) pointing to cloud Google Drive - cannot read content locally.
- Native Google formats require browser access and authentication.
- PDF, XLSX, DOCX, HTML, MD, CSV, TXT files can be read locally.
- Large video files (>1 GB) should not be loaded into context.
- ZIP archives contain agreement copies - extract to access.
- `$RECYCLE.BIN` and `.shortcut-targets-by-id` are system folders - skip.

## Full Inventory Reference
See `gdrive-inventory.json` in this skill directory for the complete file/folder listing.
