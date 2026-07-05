/* ============================================================
   page-dashboard.js — DashboardPage compositor
   ============================================================ */
import { $, state } from './core.js';
import { BalanceService } from './services.js';
import { BalanceHero, DonutChart, CategoryBars, TxList } from './components-data.js';

var _refreshTimer = null;

export const DashboardPage = {
  /**
   * Initialize dashboard page
   * @param {Object} ctx - { repos, bus }
   */
  init(ctx) {
    this.repos = ctx.repos;
    this.bus = ctx.bus;
    this.refresh();
  },

  /**
   * Refresh dashboard (debounced)
   */
  refresh() {
    clearTimeout(_refreshTimer);
    _refreshTimer = setTimeout(() => this._doRefresh(), 0);
  },

  _doRefresh() {
    this.repos.transacoes.getCurrentMonth().then(txs => {
      var balance = BalanceService.calcular(txs);

      BalanceHero(balance);
      CategoryBars(txs.filter(t => t.tipo === 'despesa'), balance.expense);
      DonutChart(balance.income, balance.expense, txs.filter(t => t.tipo === 'despesa'));

      // Recent (last 5)
      var sorted  = txs.slice().sort((a, b) => b.data.localeCompare(a.data));
      var recent5 = sorted.slice(0, 5);
      TxList('recentTxList', recent5);
    }).catch(err => { _cerr('Dashboard error:', err); });
  }
};
