# FuelEU Maritime Compliance Dashboard

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full Motoko backend storing routes, bank entries, pool records
- React frontend with 4 tabs: Routes, Compare, Banking, Pooling
- Seed data: 5 routes (R001–R005), R001 as default baseline
- Core compliance formulas (CB, energy in scope, compliant flag)

### Modify
- N/A (new project)

### Remove
- N/A

## Implementation Plan

### Backend (Motoko)
- Route type: routeId, vesselType, fuelType, year, ghgIntensity, fuelConsumption, distance, totalEmissions, isBaseline
- BankEntry type: routeId, year, bankedAmount, usedAmount
- PoolRecord type: poolId, members (routeId, cb_before, cb_after), valid, timestamp
- Seed 5 routes on init, R001 as baseline
- Queries: getRoutes, getBaseline, getBankEntry, getPools
- Updates: setBaseline, bankSurplus, applyBankedSurplus, createPool
- All CB calculations done on-chain

### Frontend
- Tab 1 (Routes): filterable table, Set Baseline button per row
- Tab 2 (Compare): comparison table with %diff and compliant flag, recharts bar chart with target line at 89.3368
- Tab 3 (Banking): route selector, CB KPI cards, Bank Surplus / Apply Banked Surplus actions
- Tab 4 (Pooling): multi-select routes, greedy allocation preview, Create Pool action, pool sum indicator
- Color coding: green surplus/compliant, red deficit/non-compliant
