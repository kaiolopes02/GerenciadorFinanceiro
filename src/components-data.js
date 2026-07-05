/* ============================================================
   components-data.js — BalanceHero + DonutChart + CategoryBars + TxList + GoalCard + DebtCard
   ============================================================ */
import { sanitize, formatBRL, formatDate, CATEGORY_ICONS, CATEGORY_COLORS, PAYMENT_BADGES } from './currency-utils.js';
import { BalanceService, CategoryService, DebtStatusService } from './services.js';
import { Objetivo, Divida } from './models.js';
import { $ } from './core.js';

/* === BALANCE HERO === */
/**
 * Render balance hero (updates DOM in place)
 * @param {Object} balance - { income, expense, balance }
 */
export function BalanceHero(balance) {
  var balEl = $('balanceAmount');
  if (balEl) {
    balEl.textContent = formatBRL(balance.balance);
    balEl.className = 'balance-hero__amount ' + BalanceService.balanceClass(balance.balance);
  }
  var incEl = $('totalIncome');
  var expEl = $('totalExpense');
  if (incEl) incEl.textContent = formatBRL(balance.income);
  if (expEl) expEl.textContent = formatBRL(balance.expense);
}

/* === DONUT CHART (pure SVG, no libs) === */
var SIZE = 180;
var CX = SIZE / 2, CY = SIZE / 2;
var R_OUTER = 78, R_INNER = 50;

function polarToXY(cx, cy, r, angleDeg) {
  var rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function makeArcPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
  var s1 = polarToXY(cx, cy, rOuter, startDeg);
  var e1 = polarToXY(cx, cy, rOuter, endDeg);
  var s2 = polarToXY(cx, cy, rInner, endDeg);
  var e2 = polarToXY(cx, cy, rInner, startDeg);
  var largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
  return [
    'M', s1.x, s1.y,
    'A', rOuter, rOuter, 0, largeArc, 1, e1.x, e1.y,
    'L', s2.x, s2.y,
    'A', rInner, rInner, 0, largeArc, 0, e2.x, e2.y,
    'Z'
  ].join(' ');
}

/**
 * Render donut chart
 * @param {number} income - Total income
 * @param {number} expense - Total expense
 * @param {Array} expenses - Expense transactions
 */
export function DonutChart(income, expense, expenses) {
  var wrap   = $('donutWrap');
  var legend = $('donutLegend');
  if (!wrap) return;

  if (income <= 0 && expense <= 0) {
    wrap.innerHTML = '<div class="donut-empty"><p class="empty-state__icon" style="font-size:36px;opacity:.4">🍩</p><p style="font-size:.8125rem;color:var(--clr-text-dim);margin-top:8px">Sem dados no mês</p></div>';
    if (legend) legend.innerHTML = '';
    return;
  }

  var cats = CategoryService.agrupar(expenses);
  var remaining = Math.max(0, income - expense);
  var total     = income > 0 ? income : expense;

  var segments = [];
  if (remaining > 0) {
    segments.push({ label: 'Disponível', icon: '💰', value: remaining, color: 'var(--clr-disponivel)' });
  }
  var catKeys = Object.keys(cats).sort((a, b) => cats[b] - cats[a]);
  catKeys.forEach(cat => {
    segments.push({
      label: cat,
      icon: CATEGORY_ICONS[cat] || '📦',
      value: cats[cat],
      color: CATEGORY_COLORS[cat] || '#7a8a88'
    });
  });
  if (income <= 0) total = expense;

  var GAP_DEG = segments.length > 1 ? 1.5 : 0;

  var paths = '';
  var currentAngle = 0;
  segments.forEach(seg => {
    var pct    = total > 0 ? seg.value / total : 0;
    var sweep  = pct * 360;
    if (sweep < 0.5) return;
    var start  = currentAngle + GAP_DEG / 2;
    var end    = currentAngle + sweep - GAP_DEG / 2;
    currentAngle += sweep;
    var segPct = Math.round(pct * 100);
    var tooltip = sanitize(seg.icon + ' ' + seg.label + ': ' + formatBRL(seg.value) + ' (' + segPct + '%)');
    paths += '<path d="' + makeArcPath(CX, CY, R_OUTER, R_INNER, start, end) +
             '" fill="' + seg.color + '" opacity="0.92" role="img" aria-label="' + tooltip + '">' +
             '<title>' + tooltip + '</title>' +
             '</path>';
  });

  var visibleSegs = segments.filter(s => total > 0 && (s.value / total) * 360 >= 0.5);
  if (visibleSegs.length <= 1) GAP_DEG = 0;

  var pctSpent = income > 0 ? Math.round((expense / income) * 100) : 100;
  var centerColor = pctSpent >= 100 ? 'var(--clr-red)' : (pctSpent >= 80 ? 'var(--clr-amber)' : 'var(--clr-text)');

  var pctLabel = income > 0
    ? (pctSpent + '% do seu saldo foi utilizado')
    : ('Total de gastos: ' + formatBRL(expense));

  wrap.innerHTML =
    '<div style="position:relative;display:-webkit-inline-flex;display:inline-flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center">' +
      '<svg class="donut-svg" width="' + SIZE + '" height="' + SIZE + '" viewBox="0 0 ' + SIZE + ' ' + SIZE + '" role="img" aria-label="' + sanitize(pctLabel) + '">' +
        '<title>' + sanitize(pctLabel) + '</title>' +
        '<circle cx="' + CX + '" cy="' + CY + '" r="' + R_OUTER + '" fill="var(--clr-surface-2)"/>' +
        paths +
        '<circle cx="' + CX + '" cy="' + CY + '" r="' + R_INNER + '" fill="var(--clr-surface)"/>' +
      '</svg>' +
      '<div class="donut-center-label">' +
        '<span class="donut-center-label__pct" style="color:' + centerColor + '">' + pctSpent + '%</span>' +
        '<span class="donut-center-label__sub">' + (income > 0 ? 'gasto' : 'total') + '</span>' +
      '</div>' +
    '</div>';

  if (legend) {
    var legHtml = '';
    segments.forEach(seg => {
      var pct = total > 0 ? Math.round((seg.value / total) * 100) : 0;
      legHtml +=
        '<div class="donut-legend__item" role="listitem">' +
          '<span class="donut-legend__dot" style="background:' + seg.color + ';width:12px;height:12px;border-radius:3px"></span>' +
          '<span class="donut-legend__icon" aria-hidden="true">' + sanitize(seg.icon) + '</span>' +
          '<span class="donut-legend__label">' + sanitize(seg.label) + '</span>' +
          '<span class="donut-legend__value">' + formatBRL(seg.value) + ' <strong style="color:var(--clr-text)">' + pct + '%</strong></span>' +
        '</div>';
    });
    legend.innerHTML = legHtml;
  }
}

/* === CATEGORY BARS === */
/**
 * Render category breakdown bars
 * @param {Array} expenses - Expense transactions
 * @param {number} total - Total expenses
 */
export function CategoryBars(expenses, total) {
  var container = $('categoriesBreakdown');
  if (!container) return;
  if (!expenses.length) {
    container.innerHTML = '<div class="empty-state"><p class="empty-state__icon">📋</p><p class="empty-state__title">Nenhum gasto ainda</p></div>';
    return;
  }

  var cats = CategoryService.agrupar(expenses);
  var sorted = CategoryService.sorted(cats);
  var html = '';
  sorted.forEach(item => {
    var pct   = CategoryService.pct(item.total, total);
    var color = CATEGORY_COLORS[item.name] || '#7a8a88';
    var icon  = CATEGORY_ICONS[item.name]  || '📦';
    var fillClass = CategoryService.fillClass(pct);
    html += '<div class="category-bar">' +
      '<div class="category-bar__header">' +
        '<span class="category-bar__name">' + icon + ' ' + sanitize(item.name) + '</span>' +
        '<span class="category-bar__values">' + formatBRL(item.total) + ' <span style="color:var(--clr-text-dim)">(' + pct + '%)</span></span>' +
      '</div>' +
      '<div class="progress-bar"><div class="progress-bar__fill ' + fillClass + '" style="width:' + pct + '%;background:' + color + '"></div></div>' +
    '</div>';
  });

  container.innerHTML = html;
}

/* === TX ITEM === */
/**
 * Generate transaction item HTML
 * @param {Object} tx - Transaction entity
 * @returns {string} HTML string
 */
export function TxItem(tx) {
  var isIncome  = tx.tipo === 'receita';
  var catIcon   = CATEGORY_ICONS[tx.categoria] || '📦';
  var catColor  = isIncome ? 'var(--clr-green-bg)' : (CATEGORY_COLORS[tx.categoria] || 'var(--clr-surface-2)');
  var amtClass  = isIncome ? 'tx-item__amount--income' : 'tx-item__amount--expense';
  var amtSign   = isIncome ? '+' : '-';
  var paymentLabel = (!isIncome && tx.forma_pagamento) ? tx.forma_pagamento : null;
  var badgeType    = paymentLabel ? (PAYMENT_BADGES[paymentLabel] || 'cash') : null;
  var installStr = (tx.total_parcelas > 1)
    ? '<span>' + tx.parcela_atual + '/' + tx.total_parcelas + '</span>'
    : '';

  return '<div class="tx-item" data-id="' + sanitize(tx.id) + '">' +
    '<div class="tx-item__icon" style="background:' + catColor + ';color:var(--clr-text)">' + catIcon + '</div>' +
    '<div class="tx-item__info">' +
      '<p class="tx-item__desc">' + sanitize(tx.descricao) + '</p>' +
      '<p class="tx-item__meta">' +
        (badgeType ? '<span class="badge badge--' + badgeType + '">' + sanitize(paymentLabel) + '</span>' : '') +
        '<span>' + formatDate(tx.data) + '</span>' +
        installStr +
        (tx.vinculo_id ? '<span title="Vinculado a ' + (tx.vinculo_tipo === 'objetivo' ? 'objetivo' : 'dívida') + '" style="opacity:.7">🔗</span>' : '') +
      '</p>' +
    '</div>' +
    '<div class="tx-item__amount ' + amtClass + '">' + amtSign + ' ' + formatBRL(tx.valor) + '</div>' +
    '<div class="tx-item__actions">' +
      '<button class="tx-item__action-btn" data-action="edit-tx" data-id="' + sanitize(tx.id) + '" aria-label="Editar transação" title="Editar">✏️</button>' +
      '<button class="tx-item__action-btn" data-action="delete-tx" data-id="' + sanitize(tx.id) + '" aria-label="Excluir transação" title="Excluir">🗑️</button>' +
    '</div>' +
  '</div>';
}

/* === TX LIST === */
var _txListState = new Map(); // containerId -> { allTxs, shownCount, pageSize }

/**
 * Render transaction list into a container with pagination
 * @param {string} containerId - DOM element ID
 * @param {Array} txs - Transactions array
 * @param {Object} [options] - { pageSize?: number }
 */
export function TxList(containerId, txs, options) {
  var container = $(containerId);
  if (!container) return;
  if (!txs || !txs.length) {
    container.innerHTML =
      '<div class="empty-state">' +
        '<p class="empty-state__icon">💸</p>' +
        '<p class="empty-state__title">Sem movimentações</p>' +
        '<p class="empty-state__desc">Adicione transações usando o botão <strong>+</strong>.</p>' +
      '</div>';
    return;
  }
  var pageSize = (options && options.pageSize) || 50;
  var state = _txListState.get(containerId);
  if (!state || state.allTxs.length !== txs.length || state.allTxs[0]?.id !== txs[0]?.id) {
    state = { allTxs: txs, shownCount: 0, pageSize: pageSize };
    _txListState.set(containerId, state);
  }
  state.allTxs = txs;
  state.pageSize = pageSize;
  var toShow = Math.min(state.shownCount + pageSize, txs.length);
  var visible = txs.slice(0, toShow);
  var html = '';
  visible.forEach(tx => { html += TxItem(tx); });
  if (toShow < txs.length) {
    html += '<button class="btn btn--ghost tx-load-more" data-container="' + containerId + '" style="width:100%;margin-top:var(--sp-3)">' +
            'Carregar mais ' + (txs.length - toShow) + '...</button>';
  } else if (state.shownCount > 0) {
    // Reset when all shown and data refreshed
    state.shownCount = 0;
  }
  container.innerHTML = html;
  state.shownCount = toShow;

  // Bind load more button
  var btn = container.querySelector('.tx-load-more');
  if (btn) {
    btn.onclick = function() { TxList(containerId, txs, options); };
  }
}

/* === GOAL CARD === */
/**
 * Generate goal card HTML
 * @param {Object} goal - Goal entity
 * @returns {string} HTML string
 */
export function GoalCard(goal) {
  var pct      = Objetivo.progressPct(goal);
  var fillCls  = (pct >= 70 && pct < 100) ? 'progress-bar__fill--amber' : '';
  var monthly  = Objetivo.projectMonthly(goal);

  return '<div class="goal-card" data-id="' + sanitize(goal.id) + '">' +
    '<div class="goal-card__header">' +
      '<div>' +
        '<p class="goal-card__name">' + sanitize(goal.nome) + '</p>' +
        '<p style="font-size:.75rem;color:var(--clr-text-muted);margin-top:2px">' + (goal.data_limite ? 'Até ' + formatDate(goal.data_limite) : 'Sem prazo definido') + '</p>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:var(--sp-2)">' +
        '<span class="goal-card__pct">' + pct + '%</span>' +
        '<button class="tx-item__action-btn" data-action="goal-edit" data-id="' + sanitize(goal.id) + '" aria-label="Editar objetivo" title="Editar">✏️</button>' +
      '</div>' +
    '</div>' +
    '<div class="progress-bar"><div class="progress-bar__fill ' + fillCls + '" style="width:' + pct + '%' + (pct >= 100 ? ';background:var(--clr-green)' : '') + '"></div></div>' +
    '<div class="goal-card__amounts">' +
      '<span>Atual: <span class="goal-card__current">' + formatBRL(goal.valor_atual) + '</span></span>' +
      '<span>Meta: <span class="goal-card__target">' + formatBRL(goal.valor_alvo) + '</span></span>' +
    '</div>' +
    '<p class="goal-card__monthly">💡 Poupar aprox. <strong>' + formatBRL(monthly) + '/mês</strong> para atingir no prazo</p>' +
    '<div class="goal-card__actions">' +
      '<button class="goal-card__action-btn goal-card__action-btn--add"    data-action="goal-add"    data-id="' + sanitize(goal.id) + '" data-name="' + sanitize(goal.nome) + '">+ Aportar</button>' +
      '<button class="goal-card__action-btn goal-card__action-btn--remove" data-action="goal-remove" data-id="' + sanitize(goal.id) + '" data-name="' + sanitize(goal.nome) + '">- Resgatar</button>' +
      '<button class="goal-card__action-btn goal-card__action-btn--delete" data-action="goal-delete" data-id="' + sanitize(goal.id) + '">🗑️</button>' +
    '</div>' +
  '</div>';
}

/* === DEBT CARD === */
/**
 * Generate debt card HTML
 * @param {Object} debt - Debt entity
 * @returns {string} HTML string
 */
export function DebtCard(debt) {
  var isOverdue = DebtStatusService.verificarVencimento(debt);
  var statusLabel = DebtStatusService.statusLabel(debt);
  var statusClass = DebtStatusService.statusClass(debt);
  var pct = Divida.progressPct(debt);
  var remaining = Divida.remaining(debt);

  return '<div class="debt-item' + (isOverdue ? ' debt-item--overdue' : '') + '" data-id="' + sanitize(debt.id) + '">' +
    '<div class="debt-item__header">' +
      '<p class="debt-item__desc">' + sanitize(debt.descricao) + '</p>' +
      '<span class="debt-status debt-status--' + statusClass + '">' + sanitize(statusLabel) + '</span>' +
    '</div>' +
    '<div class="progress-bar" style="margin-bottom:var(--sp-3)"><div class="progress-bar__fill" style="width:' + pct + '%"></div></div>' +
    '<div class="debt-item__amounts">' +
      '<div>' +
        '<p class="debt-item__amount-label">Total</p>' +
        '<p class="debt-item__amount-value">' + formatBRL(debt.valor_total) + '</p>' +
      '</div>' +
      '<div>' +
        '<p class="debt-item__amount-label">Pago</p>' +
        '<p class="debt-item__amount-value text-green">' + formatBRL(debt.valor_pago) + '</p>' +
      '</div>' +
      '<div>' +
        '<p class="debt-item__amount-label">Restante</p>' +
        '<p class="debt-item__amount-value ' + (remaining > 0 ? 'text-red' : 'text-green') + '">' + formatBRL(remaining) + '</p>' +
      '</div>' +
    '</div>' +
    '<p class="debt-item__due' + (isOverdue ? ' debt-item__due--overdue' : '') + '">' +
      (debt.vencimento ? '📅 Vencimento: ' + formatDate(debt.vencimento) : '📅 Sem data de vencimento') +
    '</p>' +
    '<div class="debt-item__actions">' +
      (debt.status !== 'pago' ? '<button class="btn btn--sm" style="background:var(--clr-green-bg);border:1px solid var(--clr-green-dim);color:var(--clr-green);flex:1" data-action="pay-debt" data-id="' + sanitize(debt.id) + '">Pagar parcela</button>' : '') +
      '<button class="btn btn--sm btn--ghost" style="flex:0" data-action="edit-debt" data-id="' + sanitize(debt.id) + '" aria-label="Editar dívida">✏️</button>' +
      '<button class="btn btn--sm btn--ghost" style="flex:0" data-action="delete-debt" data-id="' + sanitize(debt.id) + '" aria-label="Excluir dívida">🗑️</button>' +
    '</div>' +
  '</div>';
}
