/* ============================================================
   repository.js — BaseRepo + TransacaoRepo + ObjetivoRepo + DividaRepo
   ============================================================ */
import { dbGetAll, dbPut, dbDelete, dbClearAll, dbBulkImport, state } from './core.js';

/* === BASEREPO (Generic CRUD) === */
var _writeLocks = {};

function _acquireLock(store) {
  return new Promise(function(resolve) {
    var attempt = function() {
      if (!_writeLocks[store]) {
        _writeLocks[store] = true;
        resolve();
      } else {
        setTimeout(attempt, 10);
      }
    };
    attempt();
  });
}

function _releaseLock(store) {
  _writeLocks[store] = false;
}

export class BaseRepo {
  /**
   * @param {string} storeName - IndexedDB store name
   */
  constructor(storeName) {
    this.store = storeName;
  }

  /** Get all records */
  getAll() { return dbGetAll(this.store); }

  /** Get a single record by ID */
  async getById(id) {
    var all = await this.getAll();
    return all.find(r => r.id === id);
  }

  /** Put (insert or update) a record with lock */
  async put(record) {
    await _acquireLock(this.store);
    try {
      return await dbPut(this.store, record);
    } finally {
      _releaseLock(this.store);
    }
  }

  /** Delete a record by ID with lock */
  async delete(id) {
    await _acquireLock(this.store);
    try {
      return await dbDelete(this.store, id);
    } finally {
      _releaseLock(this.store);
    }
  }

  /** Clear all records in this store with lock */
  async clear() {
    await _acquireLock(this.store);
    try {
      return await dbClearAll();
    } finally {
      _releaseLock(this.store);
    }
  }
}

/* === TRANSACAOREPO === */
export class TransacaoRepo extends BaseRepo {
  constructor() { super('transacoes'); }

  /**
   * Get transactions for a specific month
   * @param {number} year - Full year (e.g. 2026)
   * @param {number} month - Month 1-12
   * @returns {Promise<Array>}
   */
  async getByMonth(year, month) {
    var all = await this.getAll();
    var monthStr = String(year) + '-' + String(month).padStart(2, '0');
    return all.filter(t => t.data && t.data.startsWith(monthStr));
  }

  /**
   * Get transactions linked to a specific record (goal or debt)
   * @param {string} linkId - Linked record ID
   * @param {string} linkType - 'objetivo' | 'divida'
   * @returns {Promise<Array>}
   */
  async getLinkedTo(linkId, linkType) {
    var all = await this.getAll();
    return all.filter(t => t.vinculo_id === linkId && t.vinculo_tipo === linkType);
  }

  /**
   * Get current month transactions
   * @returns {Promise<Array>}
   */
  getCurrentMonth() {
    return this.getByMonth(state.currentYear, state.currentMonth);
  }
}

/* === OBJETIVOREPO === */
export class ObjetivoRepo extends BaseRepo {
  constructor() { super('objetivos'); }
}

/* === DIVIDAREPO === */
export class DividaRepo extends BaseRepo {
  constructor() { super('dividas'); }

  /**
   * Get debts filtered by type
   * @param {string} tipo - 'devo' | 'me_devem'
   * @returns {Promise<Array>}
   */
  async getByTipo(tipo) {
    var all = await this.getAll();
    return all.filter(d => d.tipo === tipo);
  }
}

/* === SCHEMA & MIGRATION === */
export const Schema = {
  version: 1,
  stores: ['transacoes', 'objetivos', 'dividas'],

  /**
   * Clear all data (used by config page)
   */
  clearAll() { return dbClearAll(); },

  /**
   * Bulk import sanitized data
   */
  bulkImport(data) { return dbBulkImport(data); }
};
