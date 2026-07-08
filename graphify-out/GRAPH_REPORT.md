# Graph Report - .  (2026-07-07)

## Corpus Check
- 7 files · ~30,948 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 169 nodes · 317 edges · 12 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.68)
- Token cost: 4,200 input · 2,600 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Init & Event Wiring|App Init & Event Wiring]]
- [[_COMMUNITY_IndexedDB Repository|IndexedDB Repository]]
- [[_COMMUNITY_HTML App Shell & Styling|HTML App Shell & Styling]]
- [[_COMMUNITY_Page Layout Regions|Page Layout Regions]]
- [[_COMMUNITY_Data Components (ChartsCards)|Data Components (Charts/Cards)]]
- [[_COMMUNITY_Currency & Category Utils|Currency & Category Utils]]
- [[_COMMUNITY_PWA Icons|PWA Icons]]

## God Nodes (most connected - your core abstractions)
1. `$()` - 21 edges
2. `<body>` - 14 edges
3. `init()` - 13 edges
4. `<head>` - 10 edges
5. `formatBRL()` - 7 edges
6. `BaseRepo` - 7 edges
7. `$all()` - 7 edges
8. `openDB()` - 7 edges
9. `sanitize()` - 6 edges
10. `onClick()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `CategoryBars()` --calls--> `$()`  [EXTRACTED]
  src/components-data.js → src/core.js
- `TxList()` --calls--> `$()`  [EXTRACTED]
  src/components-data.js → src/core.js
- `PWA icon 192x192` --semantically_similar_to--> `VFIcon - Application icon/logo image (~61KB PNG)`  [INFERRED] [semantically similar]
  assets/icon-192.png → assets/VFIcon.png
- `VFLogo.png - app brand logo` --semantically_similar_to--> `VFIcon - Application icon/logo image (~61KB PNG)`  [INFERRED] [semantically similar]
  assets/VFLogo.png → assets/VFIcon.png
- `PWA icon 512x512` --semantically_similar_to--> `PWA icon 192x192`  [INFERRED] [semantically similar]
  assets/icon-512.png → assets/icon-192.png

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "App Init & Event Wiring"
Cohesion: 0.13
Nodes (32): $(), changeMonth(), DebtForm, getMonthLabel(), GoalForm, handleDelegatedAction(), init(), initEventDelegation() (+24 more)

### Community 1 - "IndexedDB Repository"
Cohesion: 0.12
Nodes (14): dbBulkImport(), dbClearAll(), dbDelete(), dbGetAll(), dbPut(), openDB(), PromiseShim(), _acquireLock() (+6 more)

### Community 2 - "HTML App Shell & Styling"
Cohesion: 0.09
Nodes (24): src/app.js, <body>, #clearDataBtn, #confirmDialog, Content-Security-Policy meta, css/app.css, css/base.css, css/tokens.css (+16 more)

### Community 3 - "Page Layout Regions"
Cohesion: 0.11
Nodes (23): .app-shell, .backup-actions, #balanceHero, .bottom-nav, #categoriesBreakdown, #donutCard, #mainContent, nav item: config (+15 more)

### Community 4 - "Data Components (Charts/Cards)"
Cohesion: 0.17
Nodes (18): BalanceHero(), CategoryBars(), DebtCard(), DonutChart(), GoalCard(), makeArcPath(), polarToXY(), TxItem() (+10 more)

### Community 5 - "Currency & Category Utils"
Cohesion: 0.17
Nodes (18): CATEGORY_COLORS, CATEGORY_ICONS, _cleanDate(), _cleanId(), _cleanNum(), _cleanStr(), EXPENSE_CATEGORIES, genId() (+10 more)

### Community 6 - "PWA Icons"
Cohesion: 0.50
Nodes (4): PWA icon 192x192, PWA icon 512x512, VFIcon - Application icon/logo image (~61KB PNG), VFLogo.png - app brand logo

## Knowledge Gaps
- **41 isolated node(s):** `INCOME_CATEGORIES`, `EXPENSE_CATEGORIES`, `MONTHS_PT`, `Transacao`, `DividasPage` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `$()` connect `App Init & Event Wiring` to `Data Components (Charts/Cards)`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._
- **Why does `<body>` connect `HTML App Shell & Styling` to `Page Layout Regions`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `.app-shell` connect `Page Layout Regions` to `HTML App Shell & Styling`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `INCOME_CATEGORIES`, `EXPENSE_CATEGORIES`, `MONTHS_PT` to the rest of the system?**
  _41 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Init & Event Wiring` be split into smaller, more focused modules?**
  _Cohesion score 0.1282051282051282 - nodes in this community are weakly interconnected._
- **Should `IndexedDB Repository` be split into smaller, more focused modules?**
  _Cohesion score 0.12413793103448276 - nodes in this community are weakly interconnected._
- **Should `HTML App Shell & Styling` be split into smaller, more focused modules?**
  _Cohesion score 0.08666666666666667 - nodes in this community are weakly interconnected._