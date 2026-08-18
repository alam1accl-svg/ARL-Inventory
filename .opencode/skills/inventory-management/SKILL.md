---
name: inventory-management
description: Manage stock levels, add items, log shipments, and query warehouse databases. Use this skill whenever the user asks about product availability, stock counts, or inventory tracking.
---

# Inventory Management Guidelines

## Triggers
- Use this skill when queries involve: "stock", "inventory", "add item", "shipment", "warehouse count", or "low stock".

## Required Inputs
- Item SKU or Name
- Quantity change (positive for restock, negative for fulfillment)
- Location or Warehouse ID (if multi-location)

## Step-by-Step Procedures
1. **Identify Intent**: Determine if the user wants to *query* stock, *add/update* stock, or *audit* levels.
2. **Validate Data**: Ensure the SKU matches the database schema format (`SKU-[A-Z0-9]{5}`).
3. **Execute Action**: Perform the corresponding inventory lookup or write operation. Never drop tables or clear data without explicit confirmation.
4. **Report Response**: State the updated stock level, remaining threshold warnings, and transaction timestamp clearly.

## Constraints
- Do not allow stock values to drop below zero unless backorders are explicitly enabled.
- Always log changes with a timestamp and user/agent signature.
