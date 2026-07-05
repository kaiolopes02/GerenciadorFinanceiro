/* ============================================================
   services.js — BalanceService + CategoryService + DebtStatusService
   ============================================================ */

/* === BALANCESERVICE === */
export const BalanceService = {
  /**
   * Calculate income, expense, and balance from transactions
   * @param {Array} txs - Transactions array
   * @returns {Object} { income, expense, balance }
   */
  calcular(txs) {
    var income  = 0;
    var expense = 0;
    txs.forEach(t => {
      if (t.tipo === 'receita') income  += t.valor;
      else                      expense += t.valor;
    });
    return {
      income:  Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      balance: Math.round((income - expense) * 100) / 100
    };
  },

  /**
   * Get balance class based on value
   * @param {number} balance - Balance value
   * @returns {string} CSS class modifier
   */
  balanceClass(balance) {
    if (balance > 0) return 'balance-hero__amount--positive';
    if (balance < 0) return 'balance-hero__amount--negative';
    return 'balance-hero__amount--neutral';
  }
};

/* === CATEGORYSERVICE === */
export const CategoryService = {
  /**
   * Group expenses by category
   * @param {Array} expenses - Expense transactions
   * @returns {Object} { category: totalAmount }
   */
  agrupar(expenses) {
    var cats = {};
    expenses.forEach(t => {
      var c = t.categoria || 'Outros';
      if (!cats[c]) cats[c] = 0;
      cats[c] += t.valor;
    });
    // Round values
    Object.keys(cats).forEach(k => {
      cats[k] = Math.round(cats[k] * 100) / 100;
    });
    return cats;
  },

  /**
   * Sort categories by value descending
   * @param {Object} cats - Category totals
   * @returns {Array<{name, total}>}
   */
  sorted(cats) {
    return Object.keys(cats)
      .map(name => ({ name, total: cats[name] }))
      .sort((a, b) => b.total - a.total);
  },

  /**
   * Calculate percentage of total
   * @param {number} value - Category value
   * @param {number} total - Total value
   * @returns {number} 0-100
   */
  pct(value, total) {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  },

  /**
   * Get fill class based on percentage
   * @param {number} pct - Percentage 0-100
   * @returns {string} CSS class
   */
  fillClass(pct) {
    if (pct >= 80) return 'progress-bar__fill--red';
    if (pct >= 60) return 'progress-bar__fill--amber';
    return '';
  }
};

/* === DEBTSTATUSSERVICE === */
export const DebtStatusService = {
  /**
   * Check if debt is overdue
   * @param {Object} debt - Debt entity
   * @returns {boolean}
   */
  verificarVencimento(debt) {
    if (!debt.vencimento || debt.status === 'pago') return false;
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var due = new Date(debt.vencimento + 'T00:00:00');
    return due < today;
  },

  /**
   * Get display label for debt status
   * @param {Object} debt - Debt entity
   * @returns {string}
   */
  statusLabel(debt) {
    var isOverdue = this.verificarVencimento(debt);
    if (isOverdue) return 'Vencido';
    return debt.status.charAt(0).toUpperCase() + debt.status.slice(1);
  },

  /**
   * Get CSS class for debt status
   * @param {Object} debt - Debt entity
   * @returns {string}
   */
  statusClass(debt) {
    var isOverdue = this.verificarVencimento(debt);
    return isOverdue ? 'vencido' : debt.status;
  },

  /**
   * Recalculate debt status based on paid vs total
   * @param {Object} debt - Debt entity
   * @returns {Object} Updated debt
   */
  recalcStatus(debt) {
    debt.status = debt.valor_pago >= debt.valor_total ? 'pago'
                : debt.valor_pago > 0               ? 'parcial'
                :                                      'pendente';
    return debt;
  }
};
