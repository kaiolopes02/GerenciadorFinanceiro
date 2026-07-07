/* ============================================================
   components-shell.js — AppShell + Header + Nav + FAB + Toast + Confirm + EmptyState
   ============================================================ */
import { $, $all, onClick } from './core.js';
import { sanitize } from './currency-utils.js';

/* === TOAST STACK === */
export const ToastStack = {
  /**
   * Show a toast notification
   * @param {string} msg - Message
   * @param {'success'|'error'|'info'} type - Toast type
   */
  show(msg, type) {
    type = type || 'info';
    var container = $('toastContainer');
    if (!container) return;
    var icons = { success: '✅', error: '❌', info: 'ℹ️' };
    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.setAttribute('role', 'alert');
    toast.innerHTML =
      '<span class="toast__icon">' + (icons[type] || 'ℹ️') + '</span>' +
      '<span>' + sanitize(msg) + '</span>';
    container.appendChild(toast);
    setTimeout(function() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }
};

/* === CONFIRM DIALOG === */
var _confirmCallback = null;

export const ConfirmDialog = {
  /**
   * Show a confirm dialog
   * @param {string} msg - Message
   * @param {string} icon - Emoji icon
   * @param {Function} onConfirm - Callback on confirm
   */
  show(msg, icon, onConfirm) {
    _confirmCallback = onConfirm;
    var msgEl  = $('confirmMsg');
    var iconEl = $('confirmIcon');
    var dialog = $('confirmDialog');
    if (!dialog || !msgEl) {
      // Ultimate fallback for extremely old browsers
      if (window.confirm(msg)) { if (typeof onConfirm === 'function') onConfirm(); }
      _confirmCallback = null;
      return;
    }
    msgEl.textContent  = msg;
    if (iconEl) iconEl.textContent = icon || '⚠️';
    dialog.classList.add('is-open');
  },

  /**
   * Initialize confirm dialog button bindings
   */
  init() {
    onClick('confirmOkBtn', () => {
      var dialog = $('confirmDialog');
      if (dialog) dialog.classList.remove('is-open');
      if (typeof _confirmCallback === 'function') {
        var cb = _confirmCallback;
        _confirmCallback = null;
        cb();
      }
    });
    onClick('confirmCancelBtn', () => {
      var dialog = $('confirmDialog');
      if (dialog) dialog.classList.remove('is-open');
      _confirmCallback = null;
    });
    var confirmDialog = $('confirmDialog');
    if (confirmDialog) {
      confirmDialog.addEventListener('click', e => {
        if (e.target === confirmDialog) {
          confirmDialog.classList.remove('is-open');
          _confirmCallback = null;
        }
      });
    }
  }
};

/* === OVERLAY HELPERS === */
var _focusTrapHandler = null;

export function openOverlay(id) {
  var el = $(id);
  if (!el) return;
  var drawer = el.querySelector('.drawer');
  var firstInput = el.querySelector('input:not([type=hidden]), select, button:not([disabled])');
  
  function focusFirstInput() {
    if (firstInput) {
      try { firstInput.focus(); } catch(e) {}
    }
  }

  if (drawer) {
    var onTransitionEnd = function(e) {
      if (e.target === drawer && (e.propertyName === 'transform' || e.propertyName === '-webkit-transform')) {
        drawer.removeEventListener('transitionend', onTransitionEnd);
        focusFirstInput();
      }
    };
    drawer.addEventListener('transitionend', onTransitionEnd);
    // Fallback in case transitionend doesn't fire
    setTimeout(function() {
      drawer.removeEventListener('transitionend', onTransitionEnd);
      focusFirstInput();
    }, 500);
  } else {
    focusFirstInput();
  }

  el.classList.add('is-open');

  var shell = document.querySelector('.app-shell');
  if (shell) shell.classList.add('is-frozen');
  document.body.classList.add('overlay-open');

  if (_focusTrapHandler) document.removeEventListener('keydown', _focusTrapHandler);
  _focusTrapHandler = function(ev) {
    if ((ev.key || ev.keyCode) !== 'Tab' && (ev.key || ev.keyCode) !== 9) return;
    var focusable = el.querySelectorAll(
      'button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (ev.shiftKey) {
      if (document.activeElement === first) { last.focus(); ev.preventDefault(); }
    } else {
      if (document.activeElement === last)  { first.focus(); ev.preventDefault(); }
    }
  };
  document.addEventListener('keydown', _focusTrapHandler);
}

export function closeOverlay(id) {
  var el = $(id);
  if (el) el.classList.remove('is-open');
  var shell = document.querySelector('.app-shell');
  if (shell) shell.classList.remove('is-frozen');
  document.body.classList.remove('overlay-open');
  if (_focusTrapHandler) {
    document.removeEventListener('keydown', _focusTrapHandler);
    _focusTrapHandler = null;
  }
}

/* === EMPTY STATE === */
/**
 * Generate empty state HTML
 * @param {string} icon - Emoji icon
 * @param {string} title - Title text
 * @param {string} desc - Description text
 * @returns {string} HTML string
 */
export function EmptyState(icon, title, desc) {
  return '<div class="empty-state">' +
    '<p class="empty-state__icon">' + sanitize(icon) + '</p>' +
    '<p class="empty-state__title">' + sanitize(title) + '</p>' +
    '<p class="empty-state__desc">' + sanitize(desc) + '</p>' +
  '</div>';
}

/* === MONTH NAV === */
export const MonthNav = {
  /**
   * Update month labels
   * @param {string} label - Month label (e.g. "Junho 2026")
   */
  update(label) {
    var el1 = $('monthLabel');
    var el2 = $('monthLabel2');
    var el3 = $('monthLabelDash');
    if (el1) el1.textContent = label;
    if (el2) el2.textContent = label;
    if (el3) el3.textContent = label;
  }
};

/* === DESKTOP SIDEBAR HANDLER === */
export function handleResize() {
  var brand = $('desktopBrand');
  if (brand) brand.style.display = window.innerWidth >= 768 ? 'flex' : 'none';
}

/* === SCROLL HELPER === */
export function smoothScroll(el) {
  if (!el || typeof el.scrollIntoView !== 'function') return;
  try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  catch(e) { el.scrollIntoView(true); }
}
