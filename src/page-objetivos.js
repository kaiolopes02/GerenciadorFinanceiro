/* ============================================================
   page-objetivos.js — ObjetivosPage + ações
   ============================================================ */
import { $ } from './core.js';
import { GoalCard } from './components-data.js';
import { EmptyState } from './components-shell.js';

export const ObjetivosPage = {
  /**
   * Initialize objetivos page
   * @param {Object} ctx - { repos, bus }
   */
  init(ctx) {
    this.repos = ctx.repos;
    this.bus = ctx.bus;
    this.refresh();
  },

  /**
   * Refresh goals list
   */
  refresh() {
    this.repos.objetivos.getAll().then(goals => {
      var container = $('goalsList');
      if (!container) return;
      if (!goals.length) {
        container.innerHTML =
          '<div class="empty-state">' +
            '<p class="empty-state__icon">🎯</p>' +
            '<p class="empty-state__title">Nenhum objetivo ainda</p>' +
            '<p class="empty-state__desc">Crie metas financeiras para organizar suas economias.</p>' +
          '</div>';
        return;
      }
      var html = '';
      goals.forEach(g => { html += GoalCard(g); });
      container.innerHTML = html;
    }).catch(err => _cerr('Goals render error:', err));
  }
};
