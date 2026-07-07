/* ============================================================
   core.js — EventBus + DOM utils + IDB adapter + Polyfills + Storage
   ============================================================ */

/* === POLYFILLS (Android 4.x / iOS 12+ compat) === */

if (typeof Promise === 'undefined') {
  (function() {
    function PromiseShim(fn) {
      var self = this;
      self._state = 0; self._val = undefined; self._cbs = [];
      function resolve(v) {
        if (self._state) return;
        if (v && typeof v.then === 'function') { v.then(resolve, reject); return; }
        self._state = 1; self._val = v;
        self._cbs.forEach(function(c) { c[0] && setTimeout(function() { c[0](v); }, 0); });
      }
      function reject(r) {
        if (self._state) return;
        self._state = 2; self._val = r;
        self._cbs.forEach(function(c) { c[1] && setTimeout(function() { c[1](r); }, 0); });
      }
      try { fn(resolve, reject); } catch(e) { reject(e); }
    }
    PromiseShim.prototype.then = function(onF, onR) {
      var self = this;
      return new PromiseShim(function(res, rej) {
        function handle(fn, fallback) {
          return function(v) {
            try { res(typeof fn === 'function' ? fn(v) : fallback(v)); }
            catch(e) { rej(e); }
          };
        }
        var cb = [handle(onF, function(v) { return v; }), handle(onR, function(r) { throw r; })];
        if (self._state === 1) setTimeout(function() { cb[0](self._val); }, 0);
        else if (self._state === 2) setTimeout(function() { cb[1](self._val); }, 0);
        else self._cbs.push(cb);
      });
    };
    PromiseShim.prototype.catch = function(onR) { return this.then(undefined, onR); };
    PromiseShim.resolve = function(v) { return new PromiseShim(function(r) { r(v); }); };
    PromiseShim.reject  = function(r) { return new PromiseShim(function(_, j) { j(r); }); };
    PromiseShim.all = function(arr) {
      return new PromiseShim(function(res, rej) {
        if (!arr.length) { res([]); return; }
        var results = new Array(arr.length), done = 0;
        arr.forEach(function(p, i) {
          PromiseShim.resolve(p).then(function(v) {
            results[i] = v;
            if (++done === arr.length) res(results);
          }, rej);
        });
      });
    };
    window.Promise = PromiseShim;
  }());
}

if (!Array.prototype.at) {
  Array.prototype.at = function(n) {
    n = Math.trunc(n) || 0;
    if (n < 0) n += this.length;
    if (n < 0 || n >= this.length) return undefined;
    return this[n];
  };
}
if (!Array.prototype.find) {
  Array.prototype.find = function(fn, ctx) {
    for (var i = 0; i < this.length; i++) {
      if (fn.call(ctx, this[i], i, this)) return this[i];
    }
    return undefined;
  };
}
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function(fn, ctx) {
    for (var i = 0; i < this.length; i++) {
      if (fn.call(ctx, this[i], i, this)) return i;
    }
    return -1;
  };
}
if (!String.prototype.padStart) {
  String.prototype.padStart = function(len, pad) {
    var s = String(this);
    pad = pad === undefined ? ' ' : String(pad);
    while (s.length < len) s = pad + s;
    return s.slice(-(Math.max(len, s.length)));
  };
}
if (!Object.hasOwn) {
  Object.hasOwn = function(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

/* === GLOBAL ERROR HANDLERS === */
var _cerr = (typeof console !== 'undefined' && typeof console.error === 'function') ? console.error.bind(console) : function() {};
var _clog = (typeof console !== 'undefined' && typeof console.log   === 'function') ? console.log.bind(console)   : function() {};
// ponytail: expose globally for all modules
window._cerr = _cerr;
window._clog = _clog;
window.addEventListener('error', function(e) {
  _cerr('[GestorFinanceiro] Erro:', e.message, e.filename, e.lineno);
});
window.addEventListener('unhandledrejection', function(e) {
  _cerr('[GestorFinanceiro] Promise rejeitada:', e.reason);
});

/* === EVENTBUS === */
export const EventBus = {
  _handlers: {},

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, handler) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(handler);
    return () => this.off(event, handler);
  },

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} handler - Callback function
   */
  off(event, handler) {
    if (!this._handlers[event]) return;
    this._handlers[event] = this._handlers[event].filter(h => h !== handler);
  },

  /**
   * Emit an event
   * @param {string} event - Event name
   * @param {*} data - Data to pass to handlers
   */
  emit(event, data) {
    if (!this._handlers[event]) return;
    this._handlers[event].forEach(h => {
      try { h(data); } catch(e) { _cerr('EventBus handler error:', e); }
    });
  }
};

/* === DOM UTILS === */

/**
 * Query cache for getElementById
 * @param {string} id - Element ID (without #)
 * @returns {HTMLElement|null}
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Query selector with cache
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [root=document] - Root element
 * @returns {Element|null}
 */
export function $$(selector, root) {
  return (root || document).querySelector(selector);
}

/**
 * Query selector all with cache
 * @param {string} selector - CSS selector
 * @param {HTMLElement} [root=document] - Root element
 * @returns {Element[]}
 */
export function $all(selector, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(selector));
}

/**
 * Safe click handler (touch + mouse, no ghost clicks)
 * @param {string|HTMLElement} selector - Element ID, CSS selector, or element
 * @param {Function} handler - Click handler
 */
export function onClick(selector, handler) {
  var el;
  if (typeof selector === 'string') {
    el = (selector[0] === '#' || selector[0] === '.' || selector[0] === '[')
      ? document.querySelector(selector)
      : document.getElementById(selector);
  } else {
    el = selector;
  }
  if (!el) return;
  var isTouch = 'ontouchstart' in window;
  if (isTouch) {
    var moved = false;
    var touchFired = false;
    el.addEventListener('touchstart', function() { moved = false; }, { passive: true });
    el.addEventListener('touchmove',  function() { moved = true;  }, { passive: true });
    el.addEventListener('touchend',   function(e) {
      if (!moved && !window._delegationConsumedTouch) { touchFired = true; setTimeout(function() { touchFired = false; }, 500); handler(e); }
    });
    el.addEventListener('click', function(e) {
      if (touchFired) { touchFired = false; return; }
      handler(e);
    });
    return;
  }
  el.addEventListener('click', handler);
}

/**
 * Create element with properties
 * @param {string} tag - HTML tag name
 * @param {Object} [props] - Element properties
 * @param {string} [text] - Text content
 * @returns {HTMLElement}
 */
export function createEl(tag, props, text) {
  var el = document.createElement(tag);
  if (props) {
    for (var k in props) {
      if (props.hasOwnProperty(k)) {
        if (k === 'className') el.className = props[k];
        else if (k === 'dataset') Object.assign(el.dataset, props[k]);
        else el.setAttribute(k, props[k]);
      }
    }
  }
  if (text) el.textContent = text;
  return el;
}

/* === STORAGE WRAPPER === */
export const storage = {
  _mem: {},

  get(k) {
    try { return localStorage.getItem(k); } catch(e) { return this._mem[k] || null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); } catch(e) { this._mem[k] = v; }
  },
  remove(k) {
    try { localStorage.removeItem(k); } catch(e) { delete this._mem[k]; }
  }
};

/* === IDB ADAPTER === */
var DB_NAME    = 'GestorFinanceiroDB';
var DB_VERSION = 1;
export const DB_STORES = ['transacoes', 'objetivos', 'dividas'];
var db         = null;
var _dbOpenPending = null;

/**
 * Open IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise(function(resolve, reject) {
    if (db) { resolve(db); return; }
    if (_dbOpenPending) { _dbOpenPending.then(resolve, reject); return; }
    if (!('indexedDB' in window) || typeof window.indexedDB === 'undefined' || window.indexedDB === null) {
      reject(new Error('IndexedDB não suportado'));
      return;
    }
    _dbOpenPending = new Promise(function(res2, rej2) {
      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
      } catch (e) {
        // Firefox private browsing: IDB exists but throws on open
        _dbOpenPending = null;
        rej2(e);
        return;
      }
      req.onupgradeneeded = function(e) {
        var d = e.target.result;
        if (!d.objectStoreNames.contains('transacoes')) {
          var tx = d.createObjectStore('transacoes', { keyPath: 'id' });
          tx.createIndex('data', 'data', { unique: false });
        }
        if (!d.objectStoreNames.contains('objetivos')) {
          d.createObjectStore('objetivos', { keyPath: 'id' });
        }
        if (!d.objectStoreNames.contains('dividas')) {
          d.createObjectStore('dividas', { keyPath: 'id' });
        }
      };
      req.onsuccess = function(e) { db = e.target.result; _dbOpenPending = null; res2(db); };
      req.onerror   = function(e) { _dbOpenPending = null; rej2(e.target.error); };
    });
    _dbOpenPending.then(resolve, reject);
  });
}

/**
 * Get all records from a store
 * @param {string} store - Store name
 * @returns {Promise<Array>}
 */
export function dbGetAll(store) {
  return openDB().then(function(d) {
    return new Promise(function(resolve, reject) {
      var tx = d.transaction(store, 'readonly');
      var os = tx.objectStore(store);
      if (typeof os.getAll === 'function') {
        var req = os.getAll();
        req.onsuccess = function() { resolve(req.result || []); };
        req.onerror   = function() { reject(req.error); };
      } else {
        var results = [];
        var cur = os.openCursor();
        cur.onsuccess = function(e) {
          var cursor = e.target.result;
          if (cursor) { results.push(cursor.value); cursor.continue(); }
          else { resolve(results); }
        };
        cur.onerror = function() { reject(cur.error); };
      }
    });
  });
}

/**
 * Put a record into a store
 * @param {string} store - Store name
 * @param {Object} record - Record to put
 * @returns {Promise}
 */
export function dbPut(store, record) {
  return openDB().then(function(d) {
    return new Promise(function(resolve, reject) {
      var tx  = d.transaction(store, 'readwrite');
      var req = tx.objectStore(store).put(record);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror   = function() { reject(req.error); };
    });
  });
}

/**
 * Delete a record from a store
 * @param {string} store - Store name
 * @param {string} id - Record ID
 * @returns {Promise}
 */
export function dbDelete(store, id) {
  return openDB().then(function(d) {
    return new Promise(function(resolve, reject) {
      var tx  = d.transaction(store, 'readwrite');
      var req = tx.objectStore(store).delete(id);
      req.onsuccess = function() { resolve(); };
      req.onerror   = function() { reject(req.error); };
    });
  });
}

/**
 * Clear all stores
 * @returns {Promise}
 */
export function dbClearAll() {
  return openDB().then(function(d) {
    return new Promise(function(resolve, reject) {
      var stores = DB_STORES;
      var tx = d.transaction(stores, 'readwrite');
      stores.forEach(function(s) { tx.objectStore(s).clear(); });
      tx.oncomplete = resolve;
      tx.onerror    = function() { reject(tx.error); };
    });
  });
}

/**
 * Bulk import records into multiple stores
 * @param {Object} data - { transacoes: [], objetivos: [], dividas: [] }
 * @returns {Promise}
 */
export function dbBulkImport(data) {
  return openDB().then(function(d) {
    return new Promise(function(resolve, reject) {
      var stores = DB_STORES;
      var tx = d.transaction(stores, 'readwrite');
      if (data.transacoes) data.transacoes.forEach(function(r) { tx.objectStore('transacoes').put(r); });
      if (data.objetivos)  data.objetivos.forEach( function(r) { tx.objectStore('objetivos').put(r); });
      if (data.dividas)    data.dividas.forEach(   function(r) { tx.objectStore('dividas').put(r); });
      tx.oncomplete = resolve;
      tx.onerror    = function() { reject(tx.error); };
    });
  });
}

/* === STATE === */
export const state = {
  currentYear:  new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  activeDebtTab: 'devo',
  txType: 'receita',
  debtType: 'devo'
};
