/* ============================================================
   page-dividas.js — DividasPage + tabs
   ============================================================ */
import { $, state } from './core.js';
import { DebtCard } from './components-data.js';

export const DividasPage = {
  /**
   * Initialize dividas page
   * @param {Object} ctx - { repos, bus }
   */
  init(ctx) {
    this.repos = ctx.repos;
    this.bus = ctx.bus;
    this.refresh();
  },

  /**
   * Refresh debts list
   */
  refresh() {
    this.repos.dividas.getAll().then(debts => {
      var container = $('debtsList');
      if (!container) return;

      var filtered = debts.filter(d => d.tipo === state.activeDebtTab);

      if (!filtered.length) {
        container.innerHTML =
          '<div class="empty-state">' +
            '<p class="empty-state__icon">🤝</p>' +
            '<p class="empty-state__title">Nenhum registro</p>' +
            '<p class="empty-state__desc">Use o botão "Nova dívida" para registrar.</p>' +
          '</div>';
        return;
      }

      filtered.sort((a, b) => (a.vencimento||'').localeCompare(b.vencimento||''));
      var html = '';
      filtered.forEach(d => { html += DebtCard(d); });
      container.innerHTML = html;
    }).catch(err => _cerr('Debts render error:', err));
  }
};
