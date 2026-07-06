# Graph Report - GerenciadorFinanceiro  (2026-07-06)

## Corpus Check
- 15 files · ~30,902 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 126 nodes · 310 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b77b7e11`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Data Persistence Layer|Data Persistence Layer]]
- [[_COMMUNITY_App Bootstrap & Routing|App Bootstrap & Routing]]
- [[_COMMUNITY_Data Views & Services|Data Views & Services]]
- [[_COMMUNITY_UI Shell & Notifications|UI Shell & Notifications]]
- [[_COMMUNITY_Currency & Sanitization Utils|Currency & Sanitization Utils]]
- [[_COMMUNITY_PWA Branding & Manifest|PWA Branding & Manifest]]
- [[_COMMUNITY_Privacy Policy (LGPDCSP)|Privacy Policy (LGPD/CSP)]]
- [[_COMMUNITY_Bottom Navigation|Bottom Navigation]]

## God Nodes (most connected - your core abstractions)
1. `$$` - 21 edges
2. `init()` - 13 edges
3. `sanitize()` - 10 edges
4. `$all()` - 7 edges
5. `openDB()` - 7 edges
6. `formatBRL()` - 7 edges
7. `BaseRepo` - 7 edges
8. `onClick()` - 6 edges
9. `sanitizeTx()` - 6 edges
10. `sanitizeGoal()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `App Shell Layout` --references--> `VFIcon - Application icon/logo image (~61KB PNG)`  [EXTRACTED]
  index.html → assets/VFIcon.png
- `PWA Manifest Link` --references--> `PWA icon 192x192`  [EXTRACTED]
  index.html → assets/icon-192.png
- `VFLogo.png - app brand logo` --semantically_similar_to--> `VFIcon - Application icon/logo image (~61KB PNG)`  [INFERRED] [semantically similar]
  assets/VFLogo.png → assets/VFIcon.png
- `PWA icon 192x192` --semantically_similar_to--> `VFIcon - Application icon/logo image (~61KB PNG)`  [INFERRED] [semantically similar]
  assets/icon-192.png → assets/VFIcon.png
- `PWA icon 512x512` --semantically_similar_to--> `PWA icon 192x192`  [INFERRED] [semantically similar]
  assets/icon-512.png → assets/icon-192.png

## Import Cycles
- None detected.

## Communities (13 total, 2 thin omitted)

### Community 0 - "Data Persistence Layer"
Cohesion: 0.12
Nodes (14): dbBulkImport(), dbClearAll(), dbDelete(), dbGetAll(), dbPut(), openDB(), PromiseShim(), _acquireLock() (+6 more)

### Community 1 - "App Bootstrap & Routing"
Cohesion: 0.13
Nodes (27): $$, changeMonth(), DebtForm, getMonthLabel(), GoalForm, handleDelegatedAction(), init(), initEventDelegation() (+19 more)

### Community 2 - "Data Views & Services"
Cohesion: 0.20
Nodes (17): BalanceHero(), CategoryBars(), DebtCard(), DonutChart(), GoalCard(), makeArcPath(), polarToXY(), TxItem() (+9 more)

### Community 3 - "UI Shell & Notifications"
Cohesion: 0.22
Nodes (11): ConfirmDialog, EmptyState(), MonthNav, smoothScroll(), ToastStack, DB_STORES, EventBus, onClick() (+3 more)

### Community 4 - "Currency & Sanitization Utils"
Cohesion: 0.27
Nodes (13): CATEGORY_COLORS, CATEGORY_ICONS, _cleanDate(), _cleanId(), _cleanNum(), _cleanStr(), EXPENSE_CATEGORIES, INCOME_CATEGORIES (+5 more)

### Community 5 - "PWA Branding & Manifest"
Cohesion: 0.40
Nodes (6): PWA icon 192x192, PWA icon 512x512, VFIcon - Application icon/logo image (~61KB PNG), VFLogo.png - app brand logo, App Shell Layout, PWA Manifest Link

## Knowledge Gaps
- **11 isolated node(s):** `repos`, `TxForm`, `GoalForm`, `DebtForm`, `DB_STORES` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TransacaoRepo` connect `Data Persistence Layer` to `App Bootstrap & Routing`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `$$` connect `App Bootstrap & Routing` to `Data Views & Services`, `UI Shell & Notifications`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `repos`, `TxForm`, `GoalForm` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data Persistence Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.12413793103448276 - nodes in this community are weakly interconnected._
- **Should `App Bootstrap & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.1330049261083744 - nodes in this community are weakly interconnected._