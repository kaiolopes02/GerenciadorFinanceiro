/* ============================================================
   page-transacoes.js — TransacoesPage + filtros
   ============================================================ */
import { $ } from './core.js';
import { sanitize } from './currency-utils.js';
import { TxList } from './components-data.js';

var txFilterState = { type: 'all', category: '', payment: '' };

export const TransacoesPage = {
  _refreshGen: 0,

  init(ctx) {
    this.repos = ctx.repos;
    this.bus = ctx.bus;
    this.refresh();
  },

  refresh() {
    var gen = ++this._refreshGen;
    this.repos.transacoes.getCurrentMonth().then(txs => {
      if (this._refreshGen !== gen) return;
      txs.sort((a, b) => b.data.localeCompare(a.data));
      this._populateCategoryFilter(txs);
      var filtered = this._applyFilters(txs);
      TxList('allTxList', filtered);
    }).catch(err => _cerr('AllTx error:', err));
  },

  /**
   * Populate category filter dropdown
   * @param {Array} txs - Transactions
   */
  _populateCategoryFilter(txs) {
    var sel = $('txFilterCategory');
    if (!sel) return;
    var cats = {};
    txs.forEach(t => { if (t.categoria) cats[t.categoria] = true; });
    var current = sanitize(txFilterState.category || sel.value || '');
    var html = '<option value="">Todas as categorias</option>';
    var exists = (current === '');
    Object.keys(cats).sort().forEach(c => {
      var sanitized = sanitize(c);
      if (current === sanitized) exists = true;
      html += '<option value="' + sanitized + '"' + (current === sanitized ? ' selected' : '') + '>' + sanitize(c) + '</option>';
    });
    // Stale state: selected category doesn't exist this month -> reset
    if (!exists) {
      txFilterState.category = '';
      current = '';
    }
    sel.innerHTML = html;
    sel.value = current;
  },

  /**
   * Apply filters to transactions
   * @param {Array} txs - Transactions
   * @returns {Array} Filtered transactions
   */
  _applyFilters(txs) {
    // Payment filter is irrelevant for receitas
    var hasMatchingPayment = !txFilterState.payment || txs.some(t => t.tipo === 'despesa' && t.forma_pagamento === txFilterState.payment);
    if (!hasMatchingPayment) txFilterState.payment = '';
    return txs.filter(t => {
      if (txFilterState.type !== 'all' && t.tipo !== txFilterState.type) return false;
      if (txFilterState.category && sanitize(t.categoria) !== sanitize(txFilterState.category)) return false;
      if (txFilterState.payment && t.tipo === 'despesa' && t.forma_pagamento !== txFilterState.payment) return false;
      return true;
    });
  },

  /**
   * Get current filter state
   * @returns {Object}
   */
  getFilterState() { return txFilterState; },

  /**
   * Set filter state
   * @param {Object} newState - New filter state
   */
  setFilterState(newState) { Object.assign(txFilterState, newState); },
};
