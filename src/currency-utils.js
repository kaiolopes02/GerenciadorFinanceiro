/* ============================================================
   currency-utils.js — parseBRL + formatBRL + formatDate + genId + sanitize
   ============================================================ */

/* === XSS SANITIZER === */
export function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* === ID GENERATOR === */
export function genId(prefix) {
  var rnd;
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var arr = new Uint32Array(2);
      crypto.getRandomValues(arr);
      rnd = arr[0].toString(36) + arr[1].toString(36);
    } else {
      rnd = Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 9);
    }
  } catch(e) {
    rnd = Math.random().toString(36).slice(2, 9);
  }
  return (prefix || 'id') + '_' + Date.now() + '_' + rnd;
}

/* === CURRENCY HELPERS === */
export function parseBRL(str) {
  if (typeof str !== 'string') str = String(str || '');
  str = str.slice(0, 20);
  var negative = str.trim().startsWith('-');
  str = str.replace(/[^\d,\.\-]/g, '');
  if (str.indexOf(',') > -1 && str.indexOf('.') > -1) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else {
    str = str.replace(',', '.');
  }
  var v = parseFloat(str);
  if (isNaN(v)) return 0;
  v = Math.round(v * 100) / 100;
  return negative ? -Math.abs(v) : v;
}

export function formatBRL(num) {
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) num = 0;
  try {
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch(e) {
    return 'R$ ' + num.toFixed(2).replace('.', ',');
  }
}

export function formatDate(iso) {
  if (!iso) return '';
  try {
    var parts = iso.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  } catch(e) { return iso; }
}

/* === IMPORT SANITIZERS === */
var VALID_TX_TYPES   = { 'receita': true, 'despesa': true };
var VALID_STATUSES   = { 'pendente': true, 'parcial': true, 'pago': true };
var VALID_DEBT_TYPES = { 'devo': true, 'me_devem': true };
var MAX_STR = 200;

function _cleanStr(v, max) {
  return (typeof v === 'string') ? v.slice(0, max || MAX_STR) : '';
}
function _cleanNum(v) {
  var n = typeof v === 'number' ? v : parseFloat(v);
  return (isFinite(n) && n >= 0) ? Math.round(n * 100) / 100 : 0;
}
function _cleanDate(v) {
  if (typeof v !== 'string') return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}
function _cleanId(v) {
  return (typeof v === 'string' && /^[a-z0-9_]+$/i.test(v)) ? v.slice(0, 60) : '';
}

export function sanitizeTx(r) {
  if (!r || typeof r !== 'object') return null;
  var id = _cleanId(r.id);
  if (!id) return null;
  var tipo = VALID_TX_TYPES[r.tipo] ? r.tipo : 'despesa';
  return {
    id:             id,
    descricao:      _cleanStr(r.descricao, 80) || 'Sem descrição',
    tipo:           tipo,
    categoria:      _cleanStr(r.categoria, 60) || 'Outros',
    valor:          _cleanNum(r.valor),
    forma_pagamento:_cleanStr(r.forma_pagamento, 40) || 'PIX',
    data:           _cleanDate(r.data) || new Date().toISOString().split('T')[0],
    parcela_atual:  Math.max(1, parseInt(r.parcela_atual) || 1),
    total_parcelas: Math.max(1, parseInt(r.total_parcelas) || 1),
    vinculo_id:     _cleanId(r.vinculo_id || ''),
    vinculo_tipo:   (r.vinculo_tipo === 'objetivo' || r.vinculo_tipo === 'divida') ? r.vinculo_tipo : ''
  };
}

export function sanitizeGoal(r) {
  if (!r || typeof r !== 'object') return null;
  var id = _cleanId(r.id);
  if (!id) return null;
  return {
    id:          id,
    nome:        _cleanStr(r.nome, 60) || 'Objetivo',
    valor_alvo:  _cleanNum(r.valor_alvo),
    valor_atual: _cleanNum(r.valor_atual),
    data_limite: _cleanDate(r.data_limite || '')
  };
}

export function sanitizeDebt(r) {
  if (!r || typeof r !== 'object') return null;
  var id = _cleanId(r.id);
  if (!id) return null;
  var total = _cleanNum(r.valor_total);
  var paid  = Math.min(_cleanNum(r.valor_pago), total);
  return {
    id:          id,
    descricao:   _cleanStr(r.descricao, 80) || 'Dívida',
    tipo:        VALID_DEBT_TYPES[r.tipo] ? r.tipo : 'devo',
    valor_total: total,
    valor_pago:  paid,
    vencimento:  _cleanDate(r.vencimento || ''),
    status:      VALID_STATUSES[r.status] ? r.status : 'pendente'
  };
}

/* === CATEGORY CONFIG === */
export const CATEGORY_ICONS = {
  'Alimentação': '🍔', 'Moradia': '🏠', 'Transporte': '🚗',
  'Saúde': '💊', 'Lazer': '🎮', 'Educação': '📚',
  'Vestuário': '👗', 'Outros': '📦',
  'Salário': '💼', 'Freelance': '💻', 'Investimentos': '📈',
  'Aluguel Recebido': '🏠', 'Reembolso': '🔄', 'Venda': '🛍️',
  'Benefícios': '🏦', 'Presente': '🎁',
  '🎯 Objetivo': '🎯', '🤝 Dívida': '🤝'
};

export const CATEGORY_COLORS = {
  'Alimentação':       '#e8a020',
  'Moradia':           '#2aab96',
  'Transporte':        '#5b8fcf',
  'Saúde':             '#5aab7a',
  'Lazer':             '#b07aa8',
  'Educação':          '#6b8fa3',
  'Vestuário':         '#d97a6a',
  'Outros':            '#7a8a88',
  '🎯 Objetivo':       '#f06292',
  '🤝 Dívida':         '#ff8a65',
  'Salário':           '#26a69a',
  'Freelance':         '#66bb6a',
  'Investimentos':     '#ffa726',
  'Aluguel Recebido':  '#42a5f5',
  'Reembolso':         '#ab47bc',
  'Venda':             '#ef5350',
  'Benefícios':        '#26c6da',
  'Presente':          '#d4e157'
};

export const PAYMENT_BADGES = {
  'PIX': 'pix', 'Cartão de Crédito': 'credit', 'Cartão de Débito': 'debit',
  'Boleto': 'boleto', 'Dinheiro': 'cash'
};

export const INCOME_CATEGORIES = [
  { value: 'Salário',          label: '💼 Salário' },
  { value: 'Freelance',        label: '💻 Freelance / Autônomo' },
  { value: 'Investimentos',    label: '📈 Rendimentos / Investimentos' },
  { value: 'Aluguel Recebido', label: '🏠 Aluguel Recebido' },
  { value: 'Reembolso',        label: '🔄 Reembolso' },
  { value: 'Venda',            label: '🛍️ Venda de Bens' },
  { value: 'Benefícios',       label: '🏦 Benefícios / Auxílios' },
  { value: 'Presente',         label: '🎁 Presente / Doação' },
  { value: 'Outros',           label: '📦 Outros' }
];

export const EXPENSE_CATEGORIES = [
  { value: 'Alimentação',  label: '🍔 Alimentação' },
  { value: 'Moradia',      label: '🏠 Moradia' },
  { value: 'Transporte',   label: '🚗 Transporte' },
  { value: 'Saúde',        label: '💊 Saúde' },
  { value: 'Lazer',        label: '🎮 Lazer' },
  { value: 'Educação',     label: '📚 Educação' },
  { value: 'Vestuário',    label: '👗 Vestuário' },
  { value: 'Outros',       label: '📦 Outros' }
];

export const MONTHS_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];
