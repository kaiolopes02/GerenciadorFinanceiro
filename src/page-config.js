/* ============================================================
   page-config.js — ConfigPage + theme/backup/LGPD
   ============================================================ */
import { $, onClick, storage, dbBulkImport } from './core.js';
import { ThemeEngine } from './theme-router.js';
import { ToastStack, ConfirmDialog, smoothScroll } from './components-shell.js';
import { sanitize, sanitizeTx, sanitizeGoal, sanitizeDebt } from './currency-utils.js';

export const ConfigPage = {
  /**
   * Initialize config page
   * @param {Object} ctx - { repos, bus, theme }
   */
  init(ctx) {
    this.repos = ctx.repos;
    this.bus = ctx.bus;
    this.theme = ctx.theme || ThemeEngine;
    this._bindThemeButtons();
    this._bindBackupButtons();
  },

  refresh() {
    // No-op — config page is static
  },

  /* === THEME === */
  _bindThemeButtons() {
    document.querySelectorAll('.theme-btn[data-theme-val]').forEach(btn => {
      onClick(btn, () => {
        var val = btn.dataset.themeVal;
        this.theme.set(val);
        ToastStack.show(val === 'dark' ? '🌙 Tema escuro ativado' : val === 'light' ? '☀️ Tema claro ativado' : '⚙️ Tema automático ativado', 'info');
      });
    });
  },

  /* === BACKUP === */
  _bindBackupButtons() {
    onClick('exportBtn', () => this.exportData());
    onClick('shareBtn',  () => this.shareData());
    onClick('clearDataBtn', () => this.clearAllData());
    onClick('privPolicyBtn', () => smoothScroll($('privacidade')));

    var importInput = $('importInput');
    if (importInput) {
      importInput.addEventListener('change', () => {
        if (importInput.files && importInput.files[0]) {
          ConfigPage.importData(importInput.files[0]);
          importInput.value = '';
        }
      });
    }
  },

  /**
   * Build backup payload
   * @returns {Promise<Object>}
   */
  _buildPayload() {
    return Promise.all([
      this.repos.transacoes.getAll(),
      this.repos.objetivos.getAll(),
      this.repos.dividas.getAll()
    ]).then(results => ({
      configuracoes: { versao_schema: '1.1', moeda: 'BRL', exportado_em: new Date().toISOString() },
      transacoes: results[0],
      objetivos:  results[1],
      dividas:    results[2]
    }));
  },

  /**
   * Download backup as JSON file
   * @param {string} jsonStr - JSON string
   */
  _download(jsonStr) {
    var fname = 'gestor-financeiro-' + new Date().toISOString().split('T')[0] + '.json';
    try {
      var blob = new Blob([jsonStr], { type: 'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href      = url;
      a.download  = fname;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      ToastStack.show('Backup salvo!', 'success');
    } catch(e) {
      var dataURI = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonStr);
      var w = window.open(dataURI, '_blank');
      if (!w) ToastStack.show('Permita pop-ups para baixar o arquivo.', 'error');
      else ToastStack.show('Backup aberto em nova aba — salve o arquivo.', 'info');
    }
  },

  /**
   * Export data (download only)
   */
  exportData() {
    this._buildPayload().then(payload => {
      this._download(JSON.stringify(payload, null, 2));
    }).catch(err => {
      ToastStack.show('Erro ao exportar dados.', 'error');
      _cerr(err);
    });
  },

  /**
   * Share data via Web Share API
   */
  shareData() {
    this._buildPayload().then(payload => {
      var jsonStr = JSON.stringify(payload, null, 2);
      var fname   = 'gestor-financeiro-' + new Date().toISOString().split('T')[0] + '.json';

      if (navigator.canShare) {
        try {
          var blob = new Blob([jsonStr], { type: 'application/json' });
          var file = new File([blob], fname, { type: 'application/json' });
          if (navigator.canShare({ files: [file] })) {
            return navigator.share({
              title:  'Backup - Gestor Financeiro',
              text:   'Meu backup financeiro de ' + new Date().toLocaleDateString('pt-BR'),
              files:  [file]
            }).then(() => ToastStack.show('Compartilhado com sucesso!', 'success'))
              .catch(e => {
                if (e && e.name !== 'AbortError') { _cerr(e); this._download(jsonStr); }
              });
          }
        } catch(e) { /* fall through */ }
      }

      if (navigator.share) {
        return navigator.share({
          title: 'Backup - Gestor Financeiro',
          text:  'Backup gerado em ' + new Date().toLocaleDateString('pt-BR') + '. Abra o Gestor Financeiro e importe este arquivo.',
        }).then(() => this._download(jsonStr))
          .catch(e => { if (e && e.name !== 'AbortError') { _cerr(e); this._download(jsonStr); } });
      }

      ToastStack.show('Compartilhamento não suportado — fazendo download.', 'info');
      this._download(jsonStr);
    }).catch(err => {
      ToastStack.show('Erro ao gerar backup para compartilhar.', 'error');
      _cerr(err);
    });
  },

  /**
   * Import data from JSON file
   * @param {File} file - JSON file
   */
  importData(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      ToastStack.show('Arquivo muito grande (máx 10 MB).', 'error');
      return;
    }
    var reader = new FileReader();
    reader.onload = e => {
      try {
        var raw  = e.target.result;
        var data = JSON.parse(raw);
        if (typeof data !== 'object' || data === null ||
            (!Array.isArray(data.transacoes) && !Array.isArray(data.objetivos) && !Array.isArray(data.dividas))) {
          ToastStack.show('Arquivo inválido ou incompatível.', 'error');
          return;
        }
        var clean = {
          transacoes: (data.transacoes  || []).map(sanitizeTx).filter(Boolean),
          objetivos:  (data.objetivos   || []).map(sanitizeGoal).filter(Boolean),
          dividas:    (data.dividas     || []).map(sanitizeDebt).filter(Boolean)
        };
        this.repos.transacoes.clear().then(() =>
          dbBulkImport(clean)
        ).then(() => {
          ToastStack.show('Dados importados com sucesso!', 'success');
          this.bus.emit('data:refresh');
        }).catch(err => {
          ToastStack.show('Erro ao importar dados.', 'error');
          _cerr(err);
        });
      } catch(err) {
        ToastStack.show('Arquivo JSON inválido.', 'error');
        _cerr(err);
      }
    };
    reader.onerror = () => ToastStack.show('Erro ao ler arquivo.', 'error');
    reader.readAsText(file, 'utf-8');
  },

  /**
   * Clear all data
   */
  clearAllData() {
    ConfirmDialog.show(
      'Tem certeza? Esta ação apagará TODOS os seus dados e não pode ser desfeita.',
      '🗑️',
      () => {
        this.repos.transacoes.clear().then(() => {
          ToastStack.show('Todos os dados foram apagados.', 'info');
          this.bus.emit('data:refresh');
        }).catch(err => { ToastStack.show('Erro ao limpar dados.', 'error'); _cerr(err); });
      }
    );
  }
};
