/* ============================================================
   models.js — Transacao + Objetivo + Divida (factories + validação)
   ============================================================ */
import { genId, parseBRL } from './currency-utils.js';

/* === TRANSACAO === */
export const Transacao = {
  /**
   * Create a new transaction object
   * @param {Object} data - Transaction data
   * @returns {Object} Transaction entity
   */
  create(data) {
    return {
      id:             data.id || genId('t'),
      descricao:      data.descricao || '',
      tipo:           data.tipo || 'despesa',
      categoria:      data.categoria || 'Outros',
      valor:          data.valor || 0,
      forma_pagamento:data.forma_pagamento || '',
      data:           data.data || new Date().toISOString().split('T')[0],
      parcela_atual:  data.parcela_atual || 1,
      total_parcelas: data.total_parcelas || 1,
      vinculo_id:     data.vinculo_id || '',
      vinculo_tipo:   data.vinculo_tipo || ''
    };
  },

  /**
   * Validate transaction data
   * @param {Object} data - Transaction data
   * @returns {Object} { valid: boolean, errors: Object }
   */
  validate(data) {
    var errors = {};
    if (!data.descricao || !data.descricao.trim()) errors.descricao = 'Descrição obrigatória.';
    if (!data.valor || parseBRL(String(data.valor)) <= 0) errors.valor = 'Informe um valor válido.';
    if (!data.data || !/^\d{4}-\d{2}-\d{2}$/.test(data.data)) {
      // Auto-correct date if missing
      if (!data.data) data.data = new Date().toISOString().split('T')[0];
    }
    return { valid: Object.keys(errors).length === 0, errors };
  },

  /**
   * Generate installment transactions
   * @param {Object} base - Base transaction data
   * @param {number} installCur - Current installment
   * @param {number} installTotal - Total installments
   * @returns {Array<Object>} Array of transaction entities
   */
  generateInstallments(base, installCur, installTotal) {
    var transactions = [];
    var baseParts = base.data.split('-');
    var baseYear  = parseInt(baseParts[0]);
    var baseMon   = parseInt(baseParts[1]) - 1;
    var baseDay   = parseInt(baseParts[2]);

    for (var i = installCur; i <= installTotal; i++) {
      var offset  = i - installCur;
      var tgtMon  = baseMon + offset;
      var tgtYear = baseYear + Math.floor(tgtMon / 12);
      tgtMon      = tgtMon % 12;
      var lastDay = new Date(tgtYear, tgtMon + 1, 0).getDate();
      var tgtDay  = Math.min(baseDay, lastDay);
      var txDate  = tgtYear + '-' + String(tgtMon + 1).padStart(2, '0') + '-' + String(tgtDay).padStart(2, '0');

      transactions.push(this.create({
        ...base,
        id: genId('t'),
        descricao: base.descricao + ' (' + i + '/' + installTotal + ')',
        data: txDate,
        parcela_atual: i,
        total_parcelas: installTotal
      }));
    }
    return transactions;
  }
};

/* === OBJETIVO === */
export const Objetivo = {
  /**
   * Create a new goal object
   * @param {Object} data - Goal data
   * @returns {Object} Goal entity
   */
  create(data) {
    return {
      id:          data.id || genId('obj'),
      nome:        data.nome || '',
      valor_alvo:  data.valor_alvo || 0,
      valor_atual: data.valor_atual || 0,
      data_limite: data.data_limite || ''
    };
  },

  /**
   * Validate goal data
   * @param {Object} data - Goal data
   * @returns {Object} { valid: boolean, errors: Object }
   */
  validate(data) {
    var errors = {};
    if (!data.nome || !data.nome.trim()) errors.nome = 'Nome obrigatório.';
    if (!data.valor_alvo || parseBRL(String(data.valor_alvo)) <= 0) errors.valor_alvo = 'Informe um valor válido.';
    return { valid: Object.keys(errors).length === 0, errors };
  },

  /**
   * Calculate monthly projection
   * @param {Object} goal - Goal entity
   * @returns {number} Monthly savings needed
   */
  projectMonthly(goal) {
    var monthsLeft = 1;
    if (goal.data_limite) {
      var now = new Date();
      var dl  = new Date(goal.data_limite + 'T00:00:00');
      var mDiff = (dl.getFullYear() - now.getFullYear()) * 12 +
                  (dl.getMonth()   - now.getMonth());
      if (dl.getDate() >= now.getDate()) mDiff += 1;
      monthsLeft = Math.max(1, mDiff);
    }
    var remaining = Math.max(0, goal.valor_alvo - goal.valor_atual);
    return monthsLeft > 0 ? (remaining / monthsLeft) : 0;
  },

  /**
   * Calculate progress percentage
   * @param {Object} goal - Goal entity
   * @returns {number} 0-100
   */
  progressPct(goal) {
    return goal.valor_alvo > 0
      ? Math.min(100, Math.round((goal.valor_atual / goal.valor_alvo) * 100))
      : 0;
  }
};

/* === DIVIDA === */
export const Divida = {
  /**
   * Create a new debt object
   * @param {Object} data - Debt data
   * @returns {Object} Debt entity
   */
  create(data) {
    var total = data.valor_total || 0;
    var paid  = data.valor_pago || 0;
    var status = this.calcStatus(total, paid);
    return {
      id:          data.id || genId('div'),
      descricao:  data.descricao || '',
      tipo:        data.tipo || 'devo',
      valor_total: total,
      valor_pago:  paid,
      vencimento:  data.vencimento || '',
      status:      status
    };
  },

  /**
   * Validate debt data
   * @param {Object} data - Debt data
   * @returns {Object} { valid: boolean, errors: Object }
   */
  validate(data) {
    var errors = {};
    if (!data.descricao || !data.descricao.trim()) errors.descricao = 'Descrição obrigatória.';
    if (!data.valor_total || parseBRL(String(data.valor_total)) <= 0) errors.valor_total = 'Informe um valor válido.';
    return { valid: Object.keys(errors).length === 0, errors };
  },

  /**
   * Calculate debt status
   * @param {number} total - Total value
   * @param {number} paid - Paid value
   * @returns {string} 'pago' | 'parcial' | 'pendente'
   */
  calcStatus(total, paid) {
    if (paid >= total) return 'pago';
    if (paid > 0) return 'parcial';
    return 'pendente';
  },

  /**
   * Calculate remaining balance
   * @param {Object} debt - Debt entity
   * @returns {number}
   */
  remaining(debt) {
    return Math.max(0, debt.valor_total - debt.valor_pago);
  },

  /**
   * Calculate progress percentage
   * @param {Object} debt - Debt entity
   * @returns {number} 0-100
   */
  progressPct(debt) {
    return debt.valor_total > 0
      ? Math.min(100, Math.round((debt.valor_pago / debt.valor_total) * 100))
      : 0;
  }
};
