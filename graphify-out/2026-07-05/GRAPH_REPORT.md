# Graph Report - GerenciadorFinanceiro  (2026-07-05)

## Corpus Check
- 15 files · ~24,480 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 149 nodes · 327 edges · 17 communities (11 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2d921a37`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_App Shell + Routing|App Shell + Routing]]
- [[_COMMUNITY_Data Layer (IndexedDB + Repo)|Data Layer (IndexedDB + Repo)]]
- [[_COMMUNITY_HTML UI Scaffold|HTML UI Scaffold]]
- [[_COMMUNITY_Data Components + Services|Data Components + Services]]
- [[_COMMUNITY_Currency Utils + Models|Currency Utils + Models]]
- [[_COMMUNITY_Confirm Dialog|Confirm Dialog]]
- [[_COMMUNITY_Edit Goal Drawer|Edit Goal Drawer]]
- [[_COMMUNITY_Google Fonts|Google Fonts]]
- [[_COMMUNITY_Goal Action Drawer|Goal Action Drawer]]
- [[_COMMUNITY_New Goal Drawer|New Goal Drawer]]
- [[_COMMUNITY_Pay Debt Drawer|Pay Debt Drawer]]
- [[_COMMUNITY_core.js|core.js]]

## God Nodes (most connected - your core abstractions)
1. `$$` - 21 edges
2. `init()` - 13 edges
3. `sanitize()` - 10 edges
4. `openDB()` - 7 edges
5. `formatBRL()` - 7 edges
6. `BaseRepo` - 7 edges
7. `$all()` - 6 edges
8. `onClick()` - 6 edges
9. `sanitizeTx()` - 6 edges
10. `sanitizeGoal()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `handleDelegatedAction()` --calls--> `$$`  [EXTRACTED]
  src/app.js → src/core.js
- `init()` --calls--> `onClick()`  [EXTRACTED]
  src/app.js → src/core.js
- `BalanceHero()` --calls--> `$$`  [EXTRACTED]
  src/components-data.js → src/core.js
- `DonutChart()` --calls--> `$$`  [EXTRACTED]
  src/components-data.js → src/core.js
- `CategoryBars()` --calls--> `$$`  [EXTRACTED]
  src/components-data.js → src/core.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Payment Method Enumeration** — index_tx_drawer, index_edit_tx_drawer, index_tx_filters, index_payment_methods [EXTRACTED 0.95]
- **CRUD Drawer Form Flow** — index_tx_drawer, index_goal_drawer, index_debt_drawer, index_edit_tx_drawer, index_edit_goal_drawer, index_edit_debt_drawer, index_goal_action_drawer, index_pay_debt_drawer [INFERRED 0.85]
- **LGPD Privacy Scaffold** — index_csp_meta, index_lgpd_banner, index_backup_actions, index_page_config_section [INFERRED 0.85]

## Communities (17 total, 6 thin omitted)

### Community 0 - "App Shell + Routing"
Cohesion: 0.13
Nodes (29): $$, changeMonth(), DebtForm, getMonthLabel(), GoalForm, handleDelegatedAction(), init(), initEventDelegation() (+21 more)

### Community 1 - "Data Layer (IndexedDB + Repo)"
Cohesion: 0.12
Nodes (14): dbBulkImport(), dbClearAll(), dbDelete(), dbGetAll(), dbPut(), openDB(), PromiseShim(), _acquireLock() (+6 more)

### Community 2 - "HTML UI Scaffold"
Cohesion: 0.08
Nodes (26): App Shell (UI scaffold), Backup Actions (export/share/import JSON), Balance Hero (saldo disponível + entradas + saídas), Bootstrap Script (ES module entry → src/app.js), Bottom Nav (page switcher: dashboard/transacoes/objetivos/dividas/config), Categories Breakdown (gastos por categoria), Content-Security-Policy Meta (connect-src 'none' — offline, LGPD), CSS Links (tokens → base → app) (+18 more)

### Community 3 - "Data Components + Services"
Cohesion: 0.21
Nodes (17): BalanceHero(), CategoryBars(), DebtCard(), DonutChart(), GoalCard(), makeArcPath(), polarToXY(), TxItem() (+9 more)

### Community 4 - "Currency Utils + Models"
Cohesion: 0.27
Nodes (13): CATEGORY_COLORS, CATEGORY_ICONS, _cleanDate(), _cleanId(), _cleanNum(), _cleanStr(), EXPENSE_CATEGORIES, INCOME_CATEGORIES (+5 more)

### Community 16 - "core.js"
Cohesion: 0.23
Nodes (9): DB_STORES, EventBus, onClick(), state, storage, ConfigPage, DividasPage, Router (+1 more)

## Knowledge Gaps
- **26 isolated node(s):** `repos`, `TxForm`, `GoalForm`, `DebtForm`, `DB_STORES` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TransacaoRepo` connect `Data Layer (IndexedDB + Repo)` to `App Shell + Routing`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `$$` connect `App Shell + Routing` to `core.js`, `Data Components + Services`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `repos`, `TxForm`, `GoalForm` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell + Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.13446969696969696 - nodes in this community are weakly interconnected._
- **Should `Data Layer (IndexedDB + Repo)` be split into smaller, more focused modules?**
  _Cohesion score 0.12413793103448276 - nodes in this community are weakly interconnected._
- **Should `HTML UI Scaffold` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._