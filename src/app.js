/* ============================================================
   app.js — Bootstrap + TxForm + GoalForm + DebtForm + wiring
   ============================================================ */
import { $, $all, onClick, EventBus, state, storage } from './core.js';
import { TransacaoRepo, ObjetivoRepo, DividaRepo } from './repository.js';
import { ThemeEngine, Router } from './theme-router.js';
import { ToastStack, ConfirmDialog, MonthNav, handleResize, smoothScroll, openOverlay, closeOverlay } from './components-shell.js';
import { parseBRL, genId, MONTHS_PT, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from './currency-utils.js';
import { Transacao, Objetivo, Divida } from './models.js';
import { DebtStatusService } from './services.js';
import { DashboardPage } from './page-dashboard.js';
import { TransacoesPage } from './page-transacoes.js';
import { ObjetivosPage } from './page-objetivos.js';
import { DividasPage } from './page-dividas.js';
import { ConfigPage } from './page-config.js';

/* === REPOSITORIES === */
const repos = {
  transacoes: new TransacaoRepo(),
  objetivos:  new ObjetivoRepo(),
  dividas:    new DividaRepo()
};

/* === MONTH NAV === */
function getMonthLabel() {
  return MONTHS_PT[state.currentMonth - 1] + ' ' + state.currentYear;
}

function updateMonthLabels() {
  MonthNav.update(getMonthLabel());
}

function changeMonth(delta) {
  state.currentMonth += delta;
  if (state.currentMonth > 12) { state.currentMonth = 1;  state.currentYear++; }
  if (state.currentMonth < 1)  { state.currentMonth = 12; state.currentYear--; }
  if (state.currentYear < 1900) state.currentYear = 1900;
  if (state.currentYear > 2100) state.currentYear = 2100;
  updateMonthLabels();
  DashboardPage.refresh();
  TransacoesPage.refresh();
}

/* === TX FORM === */
const TxForm = {
  _touched: { amount: false, desc: false, date: false },

  reset() {
    var today = new Date().toISOString().split('T')[0];
    $('txAmount').value    = '';
    $('txDesc').value      = '';
    $('txDate').value      = today;
    $('txInstallCurrent').value = '1';
    $('txInstallTotal').value   = '1';
    this._touched = { amount: false, desc: false, date: false };
    var txOvl = $('txOverlay');
    if (txOvl) {
      $all('.form-error', txOvl).forEach(e => e.classList.remove('is-visible'));
      $all('.form-control', txOvl).forEach(e => e.classList.remove('is-invalid'));
    }
    this.setType('receita');
  },

  markTouched(field) {
    if (this._touched.hasOwnProperty(field)) this._touched[field] = true;
  },

  shouldValidate(field) {
    return this._touched[field] === true;
  },

  setType(type) {
    state.txType = type;
    var incBtn  = $('typeIncomeBtn');
    var expBtn  = $('typeExpenseBtn');
    var pmtGrp  = $('paymentGroup');
    var instGrp = $('installmentGroup');
    var catSel  = $('txCategory');
    var pmtSel  = $('txPayment');
    if (pmtSel && type === 'despesa' && !pmtSel.value) pmtSel.value = 'PIX';

    if (incBtn) {
      incBtn.classList.toggle('is-active-income',  type === 'receita');
      incBtn.setAttribute('aria-pressed', type === 'receita' ? 'true' : 'false');
    }
    if (expBtn) {
      expBtn.classList.toggle('is-active-expense', type === 'despesa');
      expBtn.setAttribute('aria-pressed', type === 'despesa' ? 'true' : 'false');
    }
    if (pmtGrp)  pmtGrp.style.display  = type === 'despesa' ? '' : 'none';
    if (instGrp) {
      var txPmt = $('txPayment');
      instGrp.style.display = (type === 'despesa' && txPmt && txPmt.value === 'Cartão de Crédito') ? '' : 'none';
    }

    if (catSel) {
      var list = type === 'receita' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      catSel.innerHTML = list.map(c => '<option value="' + c.value + '">' + c.label + '</option>').join('');
    }
  },

  validate(forceAll = false) {
    var valid = true;
    var amt  = parseBRL($('txAmount').value);
    var desc = $('txDesc').value.trim();
    var dateVal = $('txDate').value;

    if (forceAll || this.shouldValidate('amount')) {
      if (amt <= 0) {
        $('txAmount').classList.add('is-invalid');
        $('txAmountError').classList.add('is-visible');
        valid = false;
      } else {
        $('txAmount').classList.remove('is-invalid');
        $('txAmountError').classList.remove('is-visible');
      }
    }

    if (forceAll || this.shouldValidate('desc')) {
      if (!desc) {
        $('txDesc').classList.add('is-invalid');
        $('txDescError').classList.add('is-visible');
        valid = false;
      } else {
        $('txDesc').classList.remove('is-invalid');
        $('txDescError').classList.remove('is-visible');
      }
    }

    if (forceAll || this.shouldValidate('date')) {
      if (!dateVal) {
        $('txDate').classList.add('is-invalid');
        $('txDateError').classList.add('is-visible');
        valid = false;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
        $('txDate').classList.add('is-invalid');
        $('txDateError').classList.add('is-visible');
        valid = false;
      } else {
        $('txDate').classList.remove('is-invalid');
        $('txDateError').classList.remove('is-visible');
      }
    }
    return valid;
  },

  save() {
    if (!this.validate(true)) return;

    var amt          = parseBRL($('txAmount').value);
    var desc         = $('txDesc').value.trim();
    var date         = $('txDate').value || new Date().toISOString().split('T')[0];
    var type         = state.txType;
    var payment      = type === 'receita' ? '' : $('txPayment').value;
    var category     = $('txCategory').value;
    var installCur   = parseInt($('txInstallCurrent').value) || 1;
    var installTotal = parseInt($('txInstallTotal').value)   || 1;

    if (payment === 'Cartão de Crédito' && type === 'despesa' && installTotal > 1) {
      if (installCur < 1 || installTotal < 1 || installCur > installTotal) {
        ToastStack.show('Parcelamento inválido: verifique os campos de parcela.', 'error');
        return;
      }
      var baseParts = date.split('-');
      var baseYear  = parseInt(baseParts[0]);
      var baseMon   = parseInt(baseParts[1]) - 1;
      var baseDay   = parseInt(baseParts[2]);
      var promises = [];

      for (var i = installCur; i <= installTotal; i++) {
        var offset  = i - installCur;
        var tgtMon  = baseMon + offset;
        var tgtYear = baseYear + Math.floor(tgtMon / 12);
        tgtMon      = tgtMon % 12;
        var lastDay = new Date(tgtYear, tgtMon + 1, 0).getDate();
        var tgtDay  = Math.min(baseDay, lastDay);
        var txDate  = tgtYear + '-' + String(tgtMon + 1).padStart(2, '0') + '-' + String(tgtDay).padStart(2, '0');
        var tx = Transacao.create({
          descricao: desc + ' (' + i + '/' + installTotal + ')',
          tipo: type, categoria: category, valor: amt,
          forma_pagamento: payment, data: txDate,
          parcela_atual: i, total_parcelas: installTotal
        });
        promises.push(repos.transacoes.put(tx));
      }
      Promise.all(promises).then(() => {
        ToastStack.show('Parcelamento de ' + installTotal + 'x registrado!', 'success');
        closeOverlay('txOverlay');
        this.reset();
        EventBus.emit('data:refresh');
      }).catch(err => { ToastStack.show('Erro ao salvar. Tente novamente.', 'error'); _cerr(err); });
    } else {
      var tx = Transacao.create({
        descricao: desc, tipo: type, categoria: category, valor: amt,
        forma_pagamento: payment, data: date, parcela_atual: 1, total_parcelas: 1
      });
      repos.transacoes.put(tx).then(() => {
        ToastStack.show('Transação salva com sucesso!', 'success');
        closeOverlay('txOverlay');
        this.reset();
        EventBus.emit('data:refresh');
      }).catch(err => { ToastStack.show('Erro ao salvar. Tente novamente.', 'error'); _cerr(err); });
    }
  },

  async delete(id) {
    if (!id) return;
    try {
      var all = await repos.transacoes.getAll();
      var tx = all.find(t => t.id === id);
      if (!tx) return;

      var reversePromise = Promise.resolve();

if (tx.vinculo_id && tx.vinculo_tipo === 'objetivo') {
          reversePromise = repos.objetivos.getAll().then(goals => {
            var goal = goals.find(g => g.id === tx.vinculo_id);
            if (!goal) return;
            // ponytail: aporte='despesa' soma ao goal; resgate='receita' subtrai do goal.
            // Ao excluir, reverte: despesa(aporte) excluída → subtrai do goal; receita(resgate) excluída → soma ao goal
            if (tx.tipo === 'despesa') {
              goal.valor_atual = Math.max(0, Math.round((goal.valor_atual + tx.valor) * 100) / 100);
            } else {
              goal.valor_atual = Math.max(0, Math.round((goal.valor_atual - tx.valor) * 100) / 100);
            }
            return repos.objetivos.put(goal);
          });
      } else if (tx.vinculo_id && tx.vinculo_tipo === 'divida') {
        reversePromise = repos.dividas.getAll().then(debts => {
          var debt = debts.find(d => d.id === tx.vinculo_id);
          if (!debt) return;
          debt.valor_pago = Math.max(0, Math.round((debt.valor_pago - tx.valor) * 100) / 100);
          DebtStatusService.recalcStatus(debt);
          return repos.dividas.put(debt);
        });
      }

      await reversePromise;
      await repos.transacoes.delete(id);
      ToastStack.show('Transação excluída.', 'info');
      EventBus.emit('data:refresh');
    } catch(err) {
      if (err === 'not_found') return;
      ToastStack.show('Erro ao excluir.', 'error'); _cerr(err);
    }
  },

  /* === EDIT TX === */
  setEditType(type) {
    var incBtn  = $('editTypeIncomeBtn');
    var expBtn  = $('editTypeExpenseBtn');
    var pmtGrp  = $('editPaymentGroup');
    var instGrp = $('editInstallmentGroup');
    var catSel  = $('editTxCategory');

    if (incBtn) { incBtn.classList.toggle('is-active-income',  type === 'receita'); incBtn.setAttribute('aria-pressed', type === 'receita' ? 'true' : 'false'); }
    if (expBtn) { expBtn.classList.toggle('is-active-expense', type === 'despesa'); expBtn.setAttribute('aria-pressed', type === 'despesa' ? 'true' : 'false'); }
    if (pmtGrp)  pmtGrp.style.display  = type === 'despesa' ? '' : 'none';
    if (instGrp) instGrp.style.display = type === 'despesa' ? '' : 'none';

    if (catSel) {
      var list = type === 'receita' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
      catSel.innerHTML = list.map(c => '<option value="' + c.value + '">' + c.label + '</option>').join('');
    }
    if (incBtn) incBtn.dataset.currentType = type;
  },

  async openEdit(id) {
    try {
      var all = await repos.transacoes.getAll();
      var tx = all.find(t => t.id === id);
      if (!tx) { ToastStack.show('Transação não encontrada.', 'error'); return; }

      $('editTxId').value     = tx.id;
      $('editTxAmount').value = tx.valor.toFixed(2).replace('.', ',');
      $('editTxDesc').value   = tx.descricao;
      $('editTxDate').value   = tx.data;

      this.setEditType(tx.tipo);

      var catSel = $('editTxCategory');
      if (catSel) catSel.value = tx.categoria || '';

      var pmtSel = $('editTxPayment');
      if (pmtSel) pmtSel.value = tx.tipo === 'receita' ? 'PIX' : (tx.forma_pagamento || 'PIX');

      var badge = $('editTxLinkedBadge');
      if (badge) {
        if (tx.vinculo_id) {
          badge.textContent = tx.vinculo_tipo === 'objetivo' ? '🎯 Vinculado a objetivo' : '🤝 Vinculado a dívida';
          badge.style.display = 'inline-flex';
          var linkedStore = tx.vinculo_tipo === 'objetivo' ? repos.objetivos : repos.dividas;
          linkedStore.getAll().then(items => {
            var rec = items.find(x => x.id === tx.vinculo_id);
            if (rec && badge) {
              var recName = rec.nome || rec.descricao || '';
              var icon    = tx.vinculo_tipo === 'objetivo' ? '🎯' : '🤝';
              badge.textContent = icon + ' ' + recName;
            }
          }).catch(() => {});
        } else {
          badge.style.display = 'none';
        }
      }

      var isLinked = !!tx.vinculo_id;
      var editTypeGroup = document.querySelector('#editTxOverlay .type-toggle');
      if (editTypeGroup) editTypeGroup.style.opacity = isLinked ? '.4' : '1';
      if (editTypeGroup) editTypeGroup.style.pointerEvents = isLinked ? 'none' : '';
      if (catSel)  { catSel.disabled  = isLinked; }
      if (pmtSel)  { pmtSel.disabled  = isLinked; }

      $all('#editTxOverlay .form-error').forEach(e => e.classList.remove('is-visible'));
      $all('#editTxOverlay .form-control').forEach(e => e.classList.remove('is-invalid'));

      openOverlay('editTxOverlay');
    } catch(err) { ToastStack.show('Erro ao carregar transação.', 'error'); _cerr(err); }
  },

  async saveEdit() {
    var id      = $('editTxId').value;
    var amt     = parseBRL($('editTxAmount').value);
    var desc    = $('editTxDesc').value.trim();
    var date    = $('editTxDate').value || new Date().toISOString().split('T')[0];
    var cat     = $('editTxCategory').value;
    var incBtn  = $('editTypeIncomeBtn');
    var type    = (incBtn && incBtn.getAttribute('aria-pressed') === 'true') ? 'receita' : 'despesa';
    var pmt     = type === 'receita' ? '' : $('editTxPayment').value;
    var valid   = true;

    if (amt <= 0) {
      $('editTxAmount').classList.add('is-invalid');
      $('editTxAmountError').classList.add('is-visible');
      valid = false;
    } else {
      $('editTxAmount').classList.remove('is-invalid');
      $('editTxAmountError').classList.remove('is-visible');
    }
    if (!desc) {
      $('editTxDesc').classList.add('is-invalid');
      $('editTxDescError').classList.add('is-visible');
      valid = false;
    } else {
      $('editTxDesc').classList.remove('is-invalid');
      $('editTxDescError').classList.remove('is-visible');
    }
    if (!valid) return;

    try {
      var all = await repos.transacoes.getAll();
      var tx = all.find(t => t.id === id);
      if (!tx) { ToastStack.show('Transação não encontrada.', 'error'); return; }

      var oldAmt = tx.valor;
      var diff   = Math.round((amt - oldAmt) * 100) / 100;

      tx.valor     = amt;
      tx.descricao = desc;
      tx.data      = date;

      if (!tx.vinculo_id) {
        tx.tipo            = type;
        tx.categoria       = cat;
        tx.forma_pagamento = pmt;
      }

      var linkedPromise = Promise.resolve();
      if (diff !== 0 && tx.vinculo_id) {
        if (tx.vinculo_tipo === 'objetivo') {
          linkedPromise = repos.objetivos.getAll().then(goals => {
            var goal = goals.find(g => g.id === tx.vinculo_id);
            if (!goal) return;
            if (tx.tipo === 'despesa') {
              goal.valor_atual = Math.max(0, Math.round((goal.valor_atual + diff) * 100) / 100);
            } else {
              goal.valor_atual = Math.max(0, Math.round((goal.valor_atual - diff) * 100) / 100);
            }
            return repos.objetivos.put(goal);
          });
        } else if (tx.vinculo_tipo === 'divida') {
          linkedPromise = repos.dividas.getAll().then(debts => {
            var debt = debts.find(d => d.id === tx.vinculo_id);
            if (!debt) return;
            debt.valor_pago = Math.max(0, Math.min(debt.valor_total, Math.round((debt.valor_pago + diff) * 100) / 100));
            DebtStatusService.recalcStatus(debt);
            return repos.dividas.put(debt);
          });
        }
      }

      await Promise.all([repos.transacoes.put(tx), linkedPromise]);
      ToastStack.show('Transação atualizada!', 'success');
      closeOverlay('editTxOverlay');
      EventBus.emit('data:refresh');
    } catch(err) { if (err !== 'nf') ToastStack.show('Erro ao salvar.', 'error'); _cerr(err); }
  }
};

/* === GOAL FORM === */
const GoalForm = {
  reset() {
    $('goalName').value    = '';
    $('goalTarget').value  = '';
    $('goalDeadline').value = '';
    $('goalDrawerTitle').textContent = 'Novo objetivo';
    $all('#goalOverlay .form-error').forEach(e => e.classList.remove('is-visible'));
    $all('#goalOverlay .form-control').forEach(e => e.classList.remove('is-invalid'));
  },

  save() {
    var name   = $('goalName').value.trim();
    var target = parseBRL($('goalTarget').value);
    var dl     = $('goalDeadline').value;
    var valid  = true;

    if (!name) {
      $('goalName').classList.add('is-invalid');
      $('goalNameError').classList.add('is-visible');
      valid = false;
    } else {
      $('goalName').classList.remove('is-invalid');
      $('goalNameError').classList.remove('is-visible');
    }
    if (target <= 0) {
      $('goalTarget').classList.add('is-invalid');
      $('goalTargetError').classList.add('is-visible');
      valid = false;
    } else {
      $('goalTarget').classList.remove('is-invalid');
      $('goalTargetError').classList.remove('is-visible');
    }
    if (!valid) return;

    var goal = Objetivo.create({ nome: name, valor_alvo: target, data_limite: dl });
    repos.objetivos.put(goal).then(() => {
      ToastStack.show('Objetivo criado!', 'success');
      closeOverlay('goalOverlay');
      this.reset();
      ObjetivosPage.refresh();
    }).catch(err => { ToastStack.show('Erro ao salvar.', 'error'); _cerr(err); });
  },

  action(id, type, name) {
    $('goalActionId').value   = id;
    $('goalActionType').value = type;
    $('goalActionTitle').textContent = type === 'add' ? 'Aportar em: ' + name : 'Resgatar de: ' + name;
    $('goalActionAmt').value  = '';
    $('goalActionAmtError').classList.remove('is-visible');
    openOverlay('goalActionOverlay');
  },

  async saveAction() {
    var id   = $('goalActionId').value;
    var type = $('goalActionType').value;
    var amt  = parseBRL($('goalActionAmt').value);

    if (amt <= 0) {
      $('goalActionAmt').classList.add('is-invalid');
      $('goalActionAmtError').classList.add('is-visible');
      return;
    }

    var today = new Date().toISOString().split('T')[0];

    try {
      var goals = await repos.objetivos.getAll();
      var goal = goals.find(g => g.id === id);
      if (!goal) { ToastStack.show('Objetivo não encontrado.', 'error'); return; }

      if (type === 'add') {
        goal.valor_atual = Math.round((goal.valor_atual + amt) * 100) / 100;
      } else {
        goal.valor_atual = Math.max(0, Math.round((goal.valor_atual - amt) * 100) / 100);
      }

      var tx = Transacao.create({
        descricao: (type === 'add' ? 'Aporte: ' : 'Resgate: ') + goal.nome,
        tipo: type === 'add' ? 'despesa' : 'receita',
        categoria: '🎯 Objetivo',
        valor: amt, forma_pagamento: 'PIX', data: today,
        vinculo_id: id, vinculo_tipo: 'objetivo'
      });

      await Promise.all([repos.objetivos.put(goal), repos.transacoes.put(tx)]);
      ToastStack.show(type === 'add' ? 'Aporte registrado e descontado do saldo!' : 'Resgate registrado e adicionado ao saldo!', 'success');
      closeOverlay('goalActionOverlay');
      EventBus.emit('data:refresh');
    } catch(err) {
      if (err !== 'not found') ToastStack.show('Erro ao atualizar objetivo.', 'error');
      _cerr(err);
    }
  },

  async delete(id) {
    try {
      var all = await repos.transacoes.getAll();
      var linked = all.filter(t => t.vinculo_id === id && t.vinculo_tipo === 'objetivo');
      await Promise.all(linked.map(t => repos.transacoes.delete(t.id)));
      await repos.objetivos.delete(id);
      ToastStack.show('Objetivo e transações vinculadas excluídos.', 'info');
      EventBus.emit('data:refresh');
    } catch(err) { ToastStack.show('Erro ao excluir.', 'error'); _cerr(err); }
  },

  async openEdit(id) {
    try {
      var goals = await repos.objetivos.getAll();
      var g = goals.find(x => x.id === id);
      if (!g) { ToastStack.show('Objetivo não encontrado.', 'error'); return; }
      $('editGoalId').value       = g.id;
      $('editGoalName').value     = g.nome;
      $('editGoalTarget').value   = g.valor_alvo.toFixed(2).replace('.', ',');
      $('editGoalCurrent').value  = g.valor_atual.toFixed(2).replace('.', ',');
      $('editGoalDeadline').value = g.data_limite || '';
      $all('#editGoalOverlay .form-error').forEach(e => e.classList.remove('is-visible'));
      $all('#editGoalOverlay .form-control').forEach(e => e.classList.remove('is-invalid'));
      openOverlay('editGoalOverlay');
    } catch(err) { ToastStack.show('Erro ao carregar objetivo.', 'error'); _cerr(err); }
  },

  async saveEdit() {
    var id      = $('editGoalId').value;
    var name    = $('editGoalName').value.trim();
    var target  = parseBRL($('editGoalTarget').value);
    var current = parseBRL($('editGoalCurrent').value);
    var dl      = $('editGoalDeadline').value;
    var valid   = true;

    if (!name) {
      $('editGoalName').classList.add('is-invalid');
      $('editGoalNameError').classList.add('is-visible');
      valid = false;
    } else {
      $('editGoalName').classList.remove('is-invalid');
      $('editGoalNameError').classList.remove('is-visible');
    }
    if (target <= 0) {
      $('editGoalTarget').classList.add('is-invalid');
      $('editGoalTargetError').classList.add('is-visible');
      valid = false;
    } else {
      $('editGoalTarget').classList.remove('is-invalid');
      $('editGoalTargetError').classList.remove('is-visible');
    }
    if (!valid) return;

    try {
      var goals = await repos.objetivos.getAll();
      var g = goals.find(x => x.id === id);
      if (!g) { ToastStack.show('Objetivo não encontrado.', 'error'); return; }
      var oldName   = g.nome;
      g.nome        = name;
      g.valor_alvo  = target;
      g.valor_atual = current;
      g.data_limite = dl;

      var txUpdatePromise = Promise.resolve();
      if (oldName !== name) {
        txUpdatePromise = repos.transacoes.getAll().then(all => {
          var linked = all.filter(t => t.vinculo_id === id && t.vinculo_tipo === 'objetivo');
          return Promise.all(linked.map(t => {
            t.descricao = t.descricao.replace(oldName, name);
            return repos.transacoes.put(t);
          }));
        });
      }

      await Promise.all([repos.objetivos.put(g), txUpdatePromise]);
      ToastStack.show('Objetivo atualizado!', 'success');
      closeOverlay('editGoalOverlay');
      EventBus.emit('data:refresh');
    } catch(err) { if (err !== 'nf') ToastStack.show('Erro ao salvar.', 'error'); _cerr(err); }
  }
};

/* === DEBT FORM === */
const DebtForm = {
  setType(type) {
    state.debtType = type;
    var dewoBtn = $('debtTypeDewoBtn');
    var meBtn   = $('debtTypeMeBtn');
    if (dewoBtn) {
      dewoBtn.classList.toggle('is-active-expense', type === 'devo');
      dewoBtn.setAttribute('aria-pressed', type === 'devo' ? 'true' : 'false');
    }
    if (meBtn) {
      meBtn.classList.toggle('is-active-income', type === 'me_devem');
      meBtn.setAttribute('aria-pressed', type === 'me_devem' ? 'true' : 'false');
    }
  },

  reset() {
    $('debtDesc').value  = '';
    $('debtTotal').value = '';
    $('debtPaid').value  = '0';
    $('debtDue').value   = '';
    $all('#debtOverlay .form-error').forEach(e => e.classList.remove('is-visible'));
    $all('#debtOverlay .form-control').forEach(e => e.classList.remove('is-invalid'));
    this.setType('devo');
  },

  save() {
    var desc  = $('debtDesc').value.trim();
    var total = parseBRL($('debtTotal').value);
    var paid  = parseBRL($('debtPaid').value);
    var due   = $('debtDue').value;
    var valid = true;

    if (!desc) {
      $('debtDesc').classList.add('is-invalid');
      $('debtDescError').classList.add('is-visible');
      valid = false;
    } else {
      $('debtDesc').classList.remove('is-invalid');
      $('debtDescError').classList.remove('is-visible');
    }
    if (total <= 0) {
      $('debtTotal').classList.add('is-invalid');
      $('debtTotalError').classList.add('is-visible');
      valid = false;
    } else {
      $('debtTotal').classList.remove('is-invalid');
      $('debtTotalError').classList.remove('is-visible');
    }
    if (!valid) return;

    var debt = Divida.create({
      descricao: desc, tipo: state.debtType,
      valor_total: total, valor_pago: paid, vencimento: due
    });
    repos.dividas.put(debt).then(() => {
      ToastStack.show('Dívida registrada!', 'success');
      closeOverlay('debtOverlay');
      this.reset();
      DividasPage.refresh();
    }).catch(err => { ToastStack.show('Erro ao salvar.', 'error'); _cerr(err); });
  },

  openPay(id) {
    if (!id) return;
    var idEl  = $('payDebtId');
    var amtEl = $('payDebtAmt');
    var errEl = $('payDebtAmtError');
    var tipEl = $('payDebtTipo');
    if (idEl)  idEl.value  = id;
    if (amtEl) amtEl.value = '';
    if (errEl) errEl.classList.remove('is-visible');
    repos.dividas.getAll().then(debts => {
      var d = debts.find(x => x.id === id);
      if (!d) { ToastStack.show('Registro não encontrado.', 'error'); return; }
      if (tipEl) tipEl.value = d.tipo;
      openOverlay('payDebtOverlay');
    }).catch(err => { ToastStack.show('Erro ao carregar registro.', 'error'); _cerr(err); });
  },
  async savePay() {
    var id  = $('payDebtId').value;
    var amt = parseBRL($('payDebtAmt').value);

    if (amt <= 0) {
      $('payDebtAmt').classList.add('is-invalid');
      $('payDebtAmtError').classList.add('is-visible');
      return;
    }

    var today = new Date().toISOString().split('T')[0];

    try {
      var debts = await repos.dividas.getAll();
      var debt = debts.find(d => d.id === id);
      if (!debt) { ToastStack.show('Registro não encontrado.', 'error'); return; }

      debt.valor_pago = Math.min(debt.valor_total, Math.round((debt.valor_pago + amt) * 100) / 100);
      DebtStatusService.recalcStatus(debt);

      var tx = Transacao.create({
        descricao: 'Pagamento: ' + debt.descricao,
        tipo: 'despesa', categoria: '🤝 Dívida', valor: amt,
        forma_pagamento: 'PIX', data: today,
        vinculo_id: id, vinculo_tipo: 'divida'
      });

      var ops = [repos.dividas.put(debt)];
      if (debt.tipo === 'devo') ops.push(repos.transacoes.put(tx));
      await Promise.all(ops);

      var tipoEl = $('payDebtTipo');
      var debtTipo = (tipoEl && tipoEl.value) ? tipoEl.value : 'devo';
      ToastStack.show('Pagamento registrado' + (debtTipo === 'devo' ? ' e descontado do saldo!' : '!'), 'success');
      closeOverlay('payDebtOverlay');
      EventBus.emit('data:refresh');
    } catch(err) {
      if (err !== 'not found') ToastStack.show('Erro ao registrar pagamento.', 'error');
      _cerr(err);
    }
  },

  async delete(id) {
    try {
      var all = await repos.transacoes.getAll();
      var linked = all.filter(t => t.vinculo_id === id && t.vinculo_tipo === 'divida');
      await Promise.all(linked.map(t => repos.transacoes.delete(t.id)));
      await repos.dividas.delete(id);
      ToastStack.show('Dívida e pagamentos vinculados excluídos.', 'info');
      EventBus.emit('data:refresh');
    } catch(err) { ToastStack.show('Erro ao excluir.', 'error'); _cerr(err); }
  },

  /* === EDIT DEBT === */
  setEditType(type) {
    var dewoBtn = $('editDebtTypeDewoBtn');
    var meBtn   = $('editDebtTypeMeBtn');
    if (dewoBtn) { dewoBtn.classList.toggle('is-active-expense', type === 'devo');     dewoBtn.setAttribute('aria-pressed', type === 'devo'     ? 'true' : 'false'); }
    if (meBtn)   { meBtn.classList.toggle('is-active-income',    type === 'me_devem'); meBtn.setAttribute('aria-pressed',   type === 'me_devem' ? 'true' : 'false'); }
  },

  async openEdit(id) {
    try {
      var debts = await repos.dividas.getAll();
      var d = debts.find(x => x.id === id);
      if (!d) { ToastStack.show('Dívida não encontrada.', 'error'); return; }
      $('editDebtId').value    = d.id;
      $('editDebtDesc').value  = d.descricao;
      $('editDebtTotal').value = d.valor_total.toFixed(2).replace('.', ',');
      $('editDebtPaid').value  = d.valor_pago.toFixed(2).replace('.', ',');
      $('editDebtDue').value   = d.vencimento || '';
      this.setEditType(d.tipo);
      $all('#editDebtOverlay .form-error').forEach(e => e.classList.remove('is-visible'));
      $all('#editDebtOverlay .form-control').forEach(e => e.classList.remove('is-invalid'));
      openOverlay('editDebtOverlay');
    } catch(err) { ToastStack.show('Erro ao carregar dívida.', 'error'); _cerr(err); }
  },

  async saveEdit() {
    var id    = $('editDebtId').value;
    var desc  = $('editDebtDesc').value.trim();
    var total = parseBRL($('editDebtTotal').value);
    var paid  = parseBRL($('editDebtPaid').value);
    var due   = $('editDebtDue').value;
    var dewoBtn = $('editDebtTypeDewoBtn');
    var tipo  = (dewoBtn && dewoBtn.getAttribute('aria-pressed') === 'true') ? 'devo' : 'me_devem';
    var valid = true;

    if (!desc) {
      $('editDebtDesc').classList.add('is-invalid');
      $('editDebtDescError').classList.add('is-visible');
      valid = false;
    } else {
      $('editDebtDesc').classList.remove('is-invalid');
      $('editDebtDescError').classList.remove('is-visible');
    }
    if (total <= 0) {
      $('editDebtTotal').classList.add('is-invalid');
      $('editDebtTotalError').classList.add('is-visible');
      valid = false;
    } else {
      $('editDebtTotal').classList.remove('is-invalid');
      $('editDebtTotalError').classList.remove('is-visible');
    }
    if (!valid) return;

    try {
      var debts = await repos.dividas.getAll();
      var d = debts.find(x => x.id === id);
      if (!d) { ToastStack.show('Dívida não encontrada.', 'error'); return; }
      var oldDesc   = d.descricao;
      d.descricao   = desc;
      d.valor_total = total;
      d.valor_pago  = Math.min(paid, total);
      d.vencimento  = due;
      d.tipo        = tipo;
      DebtStatusService.recalcStatus(d);

      var txUpdatePromise = Promise.resolve();
      if (oldDesc !== desc) {
        txUpdatePromise = repos.transacoes.getAll().then(all => {
          var linked = all.filter(t => t.vinculo_id === id && t.vinculo_tipo === 'divida');
          return Promise.all(linked.map(t => {
            t.descricao = t.descricao.replace(oldDesc, desc);
            return repos.transacoes.put(t);
          }));
        });
      }

      await Promise.all([repos.dividas.put(d), txUpdatePromise]);
      ToastStack.show('Dívida atualizada!', 'success');
      closeOverlay('editDebtOverlay');
      EventBus.emit('data:refresh');
    } catch(err) { if (err !== 'nf') ToastStack.show('Erro ao salvar.', 'error'); _cerr(err); }
  }
};

/* === LGPD === */
function initLGPD() {
  var consent = storage.get('lgpd_consent');
  if (!consent) {
    var banner = $('lgpdBanner');
    if (banner) banner.classList.add('is-visible');
  }
}

/* === EVENT DELEGATION === */
function handleDelegatedAction(e) {
  var target = e.target;
  var mainContent = $('mainContent');

  var el = target;
  while (el && el !== mainContent) {
    if (el.dataset && el.dataset.action) break;
    el = el.parentElement;
  }

  if (!el || !el.dataset || !el.dataset.action) return;

  var action = el.dataset.action;
  var id     = el.dataset.id;
  var name   = el.dataset.name;

  if (action === 'edit-tx')    { TxForm.openEdit(id); return; }
  if (action === 'delete-tx')  { ConfirmDialog.show('Excluir esta transação? Se estiver vinculada a um objetivo ou dívida, o valor será revertido automaticamente.', '🗑️', () => TxForm.delete(id)); return; }
  if (action === 'goal-edit')  { GoalForm.openEdit(id); return; }
  if (action === 'goal-add')   { GoalForm.action(id, 'add',    name); return; }
  if (action === 'goal-remove'){ GoalForm.action(id, 'remove', name); return; }
  if (action === 'goal-delete'){ ConfirmDialog.show('Excluir este objetivo? Todas as transações vinculadas (aportes/resgates) também serão removidas.', '🎯', () => GoalForm.delete(id)); return; }
  if (action === 'pay-debt')   { DebtForm.openPay(id); return; }
  if (action === 'edit-debt')  { DebtForm.openEdit(id); return; }
  if (action === 'delete-debt'){ ConfirmDialog.show('Excluir esta dívida? Todos os pagamentos vinculados também serão removidos.', '🤝', () => DebtForm.delete(id)); return; }
}

function initEventDelegation() {
  var mainContent = $('mainContent');
  if (!mainContent) return;

  var _delegateMoved = false;
  var _delegateStartX = 0;
  var _delegateStartY = 0;

  mainContent.addEventListener('touchstart', e => {
    _delegateMoved = false;
    if (e.touches && e.touches[0]) {
      _delegateStartX = e.touches[0].clientX;
      _delegateStartY = e.touches[0].clientY;
    }
  }, { passive: true });

  mainContent.addEventListener('touchmove', e => {
    if (e.touches && e.touches[0]) {
      var dx = Math.abs(e.touches[0].clientX - _delegateStartX);
      var dy = Math.abs(e.touches[0].clientY - _delegateStartY);
      if (dx > 6 || dy > 6) _delegateMoved = true;
    }
  }, { passive: true });

  var _delegateTouchFired = false;

  mainContent.addEventListener('touchend', e => {
    if (_delegateMoved) return;
    _delegateTouchFired = true;
    setTimeout(() => { _delegateTouchFired = false; }, 600);
    var touch = e.changedTouches && e.changedTouches[0];
    if (touch && typeof document.elementFromPoint === 'function') {
      var realTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      if (realTarget) {
        handleDelegatedAction({ target: realTarget });
        e.preventDefault();
        return;
      }
    }
    handleDelegatedAction(e);
    e.preventDefault();
  });

  mainContent.addEventListener('click', e => {
    if (_delegateTouchFired) return;
    handleDelegatedAction(e);
  });
}

/* === OVERLAY BACKDROP & ESC === */
function initOverlayHandlers() {
  $all('.overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        if (overlay.id === 'confirmDialog') { /* ConfirmDialog handles its own */ }
        else if (overlay.id === 'txOverlay') { closeOverlay('txOverlay'); TxForm.reset(); }
        else closeOverlay(overlay.id);
      }
    });
  });

  document.addEventListener('keydown', e => {
    var key = e.key || e.keyCode;
    if (key !== 'Escape' && key !== 'Esc' && key !== 27) return;
    var open = $all('.overlay.is-open');
    if (open.length) {
      var top = open[open.length - 1];
      if (top.id === 'txOverlay') { closeOverlay(top.id); TxForm.reset(); }
      else closeOverlay(top.id);
      e.preventDefault();
    }
  });
}

/* === DIAGNOSTICS === */
function showDiagnostics() {
  var lsOk = false;
  try { localStorage.setItem('__test__', '1'); localStorage.removeItem('__test__'); lsOk = true; } catch(e) {}
  _clog('[GestorFinanceiro] Diagnósticos');
  _clog('userAgent: '     + navigator.userAgent);
  _clog('viewport: '      + window.innerWidth + 'x' + window.innerHeight);
  _clog('devicePxRatio: ' + window.devicePixelRatio);
  _clog('online: '        + navigator.onLine);
  _clog('localStorage: '  + (lsOk ? 'OK' : 'BLOQUEADO'));
  _clog('IndexedDB: '     + (('indexedDB' in window) ? 'OK' : 'NÃO SUPORTADO'));
}

/* === INIT === */
function init() {
  // Theme
  ThemeEngine.init();

  // Month labels
  updateMonthLabels();

  // LGPD
  initLGPD();

  // Confirm dialog
  ConfirmDialog.init();

  // Pages
  const ctx = { repos, bus: EventBus };
  DashboardPage.init(ctx);
  TransacoesPage.init(ctx);
  ObjetivosPage.init(ctx);
  DividasPage.init(ctx);
  ConfigPage.init({ ...ctx, theme: ThemeEngine });

  // Router
  Router.init();
  Router.register('dashboard',  DashboardPage);
  Router.register('transacoes', TransacoesPage);
  Router.register('objetivos',  ObjetivosPage);
  Router.register('dividas',    DividasPage);
  Router.register('config',     ConfigPage);

  // Event delegation
  initEventDelegation();
  initOverlayHandlers();

  // Data refresh event — refresh all pages
  EventBus.on('data:refresh', () => {
    DashboardPage.refresh();
    TransacoesPage.refresh();
    ObjetivosPage.refresh();
    DividasPage.refresh();
  });

  // Month nav
  onClick('prevMonthBtn',  () => changeMonth(-1));
  onClick('nextMonthBtn',  () => changeMonth(1));
  onClick('prevMonthBtn2', () => changeMonth(-1));
  onClick('nextMonthBtn2', () => changeMonth(1));
  onClick('prevMonthBtnDash', () => changeMonth(-1));
  onClick('nextMonthBtnDash', () => changeMonth(1));

  // FAB
  onClick('fabBtn', () => { TxForm.reset(); openOverlay('txOverlay'); });

  // TX drawer
  onClick('typeIncomeBtn',  () => TxForm.setType('receita'));
  onClick('typeExpenseBtn', () => TxForm.setType('despesa'));
  onClick('saveTxBtn',      () => TxForm.save());
  onClick('cancelTxBtn',    () => { closeOverlay('txOverlay'); TxForm.reset(); });

  // Edit TX
  onClick('editTypeIncomeBtn',  () => TxForm.setEditType('receita'));
  onClick('editTypeExpenseBtn', () => TxForm.setEditType('despesa'));
  onClick('saveEditTxBtn',      () => TxForm.saveEdit());
  onClick('cancelEditTxBtn',    () => closeOverlay('editTxOverlay'));

  // TX payment change → show/hide installment
  var txPayment = $('txPayment');
  if (txPayment) {
    txPayment.addEventListener('change', function() {
      var instGrp = $('installmentGroup');
      if (instGrp) instGrp.style.display = (this.value === 'Cartão de Crédito' && state.txType === 'despesa') ? '' : 'none';
    });
  }

  // TX form blur handlers for touched validation
  ['txAmount', 'txDesc', 'txDate'].forEach(function(id) {
    var el = $(id);
    if (el) {
      el.addEventListener('blur', function() {
        TxForm.markTouched(id === 'txAmount' ? 'amount' : id === 'txDesc' ? 'desc' : 'date');
        TxForm.validate();
      });
    }
  });

  // TX filters
  $all('.tx-filter-chip').forEach(chip => {
    onClick(chip, () => {
      $all('.tx-filter-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      TransacoesPage.setFilterState({ type: chip.dataset.filterType || 'all' });
      TransacoesPage.refresh();
    });
  });

  var txFilterCat = $('txFilterCategory');
  if (txFilterCat) {
    txFilterCat.addEventListener('change', function() {
      TransacoesPage.setFilterState({ category: this.value });
      TransacoesPage.refresh();
    });
  }

  var txFilterPmt = $('txFilterPayment');
  if (txFilterPmt) {
    txFilterPmt.addEventListener('change', function() {
      TransacoesPage.setFilterState({ payment: this.value });
      TransacoesPage.refresh();
    });
  }

  // Goal drawer
  onClick('addGoalBtn',          () => { GoalForm.reset(); openOverlay('goalOverlay'); });
  onClick('saveGoalBtn',         () => GoalForm.save());
  onClick('cancelGoalBtn',       () => closeOverlay('goalOverlay'));
  onClick('saveGoalActionBtn',   () => GoalForm.saveAction());
  onClick('cancelGoalActionBtn', () => closeOverlay('goalActionOverlay'));
  onClick('saveEditGoalBtn',     () => GoalForm.saveEdit());
  onClick('cancelEditGoalBtn',   () => closeOverlay('editGoalOverlay'));

  // Debt drawer
  onClick('addDebtBtn',    () => { DebtForm.reset(); openOverlay('debtOverlay'); });
  onClick('saveDebtBtn',   () => DebtForm.save());
  onClick('cancelDebtBtn', () => closeOverlay('debtOverlay'));
  onClick('debtTypeDewoBtn', () => DebtForm.setType('devo'));
  onClick('debtTypeMeBtn',   () => DebtForm.setType('me_devem'));
  onClick('saveEditDebtBtn',   () => DebtForm.saveEdit());
  onClick('cancelEditDebtBtn', () => closeOverlay('editDebtOverlay'));
  onClick('editDebtTypeDewoBtn', () => DebtForm.setEditType('devo'));
  onClick('editDebtTypeMeBtn',   () => DebtForm.setEditType('me_devem'));

  // Debt tabs
  $all('.tab-bar__tab[data-debt-tab]').forEach(tab => {
    onClick(tab, () => {
      $all('.tab-bar__tab').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      state.activeDebtTab = tab.dataset.debtTab;
      DividasPage.refresh();
    });
  });

  onClick('savePayDebtBtn',    () => DebtForm.savePay());
  onClick('cancelPayDebtBtn',  () => closeOverlay('payDebtOverlay'));

  // LGPD
  onClick('lgpdAccept', () => {
    storage.set('lgpd_consent', JSON.stringify({ accepted: true, ts: Date.now() }));
    var banner = $('lgpdBanner');
    if (banner) banner.classList.remove('is-visible');
  });
  onClick('lgpdDetails', () => {
    Router.navigate('config');
    var banner = $('lgpdBanner');
    if (banner) banner.classList.remove('is-visible');
    setTimeout(() => smoothScroll($('privacidade')), 150);
  });

  // Desktop sidebar
  if (typeof ResizeObserver !== 'undefined') {
    try { new ResizeObserver(handleResize).observe(document.body); }
    catch(e) { window.addEventListener('resize', handleResize); }
  } else {
    window.addEventListener('resize', handleResize);
  }
  handleResize();

  // Set today's date on tx form
  var txDate = $('txDate');
  if (txDate) txDate.value = new Date().toISOString().split('T')[0];

  // Initial tx type setup
  TxForm.setType('receita');

  // Diagnostics
  showDiagnostics();

  // SW registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
