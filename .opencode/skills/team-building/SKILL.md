---
name: team-building
description: Team building, employee management, and KPI tracking for the ARL Inventory Material Department. Use this skill whenever the user asks about team structure, employee lists, organogram, workforce planning, manpower requisition, team KPIs, supervisor lists, responsibilities, or training.
---

# Skill: Team Building

## Triggers
- Use this skill when queries involve: "team building", "team list", "organogram", "employee list", "supervisor list", "workforce", "manpower", "manpower rotation", "workforce alignment", "new manpower requisition", "employee clearance", "team responsibility", "team KPI", "SCM team", "training", "HOD switchboard", "team & responsibility", "people".

## Overview
The **Inventory Material Department** at Akij Resource Limited (ARL) is headed by **BASHIR ALAM (HOD)**. This skill covers the team, people, KPI, and engagement data across the department.

## Required Inputs
- Team member name or designation (optional)
- Report type (organogram / KPI / manpower / training) (optional)
- SBU or depot filter (optional)

## Data Sources
### Google Sheets Master Tracker
**URL**: `https://docs.google.com/spreadsheets/d/1jDp9tL2aGrVpvPJWbb6VynamxOBNY9C46FmQraTpLko/edit`

| Tab | Purpose |
|---|---|
| EMPLOYEE DATABASE | Organogram, Team List, Man Power Rotation, Supervisor List, Workforce Alignment, Employee List, Depot-wise, New Manpower Requisition, Employee Clearance, Team & Responsibility |
| KPI | SCM Team KPI, BASHIR ALAM KPI, Full Team KPI, MMT KPI 2026-2027, Weekly KPI, Template |
| MEETING & MINUTES | Meeting Link, Daily Meeting Host List, Meeting Minutes, Agenda, Inventory Forms, IT Service Desk, HOD Switchboard |
| MONTHLY TRAINING | Monthly Training Report |

### G-Drive (Training & Records)
- `G:\My Drive\` - KPI master files, performance review, SCM strategic plan, training sessions (2026, videos)
- Shared drives `INVENTORY MANAGMENT ARL` - 17 team folders per SBU (ACCL, APFIL, AKIJ ISPAT, etc.)

## Step-by-Step Procedures
1. **Identify Intent**: Determine if the user wants team structure, people data, KPI performance, or training info.
2. **Team Structure**: Reference EMPLOYEE DATABASE tabs for organogram, supervisor lists, team lists, and role responsibilities.
3. **KPI Tracking**: Reference KPI tabs (SCM Team KPI, Full Team KPI, Weekly KPI) for individual and team performance.
4. **Manpower Planning**: Check Man Power Rotation, Workforce Alignment, New Manpower Requisition for staffing decisions.
5. **Training & Development**: Pull Monthly Training Report and training materials from G-Drive.
6. **Present Results**: Show team structure, key roles, KPI highlights, and any manpower gaps or requisitions.

## Key Metrics
- **Team Size**: Headcount from Team List / Employee List
- **Supervisor Coverage**: Supervisor List vs. team members per depot
- **KPI Performance**: SCM Team KPI, BASHIR ALAM KPI, Weekly KPI scores
- **Open Requisitions**: New Manpower Requisition items pending
- **Clearance Status**: Employee Clearance records
- **Training Hours**: Monthly Training Report totals

## Constraints
- Employee/KPI data lives in Google Sheets (needs browser/gsheet access) and G-Drive.
- Native Google formats (.gsheet, .gdoc) are link placeholders - cannot read locally.
- Local HTML dashboards reference team data: `dashboard.html`, `materials_dashboard.html`.
