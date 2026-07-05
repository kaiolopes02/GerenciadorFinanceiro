/* ============================================================
   theme-router.js — ThemeEngine + Router SPA
   ============================================================ */
import { $, $all, onClick, storage, EventBus } from './core.js';

/* === THEMEENGINE === */
export const ThemeEngine = {
  /**
   * Apply theme preference
   * @param {'dark'|'light'|'auto'} pref - Theme preference
   */
  apply(pref) {
    var resolved = pref;
    if (pref === 'auto' || !pref) {
      var prefersDark = (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      resolved = prefersDark ? 'dark' : 'light';
    }
    if (resolved === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Update config button active states
    $all('.theme-btn').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.themeVal === pref);
    });

    // Update meta theme-color
    var metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.content = resolved === 'light' ? '#f7f9f8' : '#0a1a18';
  },

  /**
   * Initialize theme system
   */
  init() {
    var saved = storage.get('theme_pref') || 'auto';
    this.apply(saved);

    if (typeof window.matchMedia === 'function') {
      try {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var mqHandler = () => {
          if ((storage.get('theme_pref') || 'auto') === 'auto') this.apply('auto');
        };
        if (mq.addEventListener) { mq.addEventListener('change', mqHandler); }
        else if (mq.addListener) { mq.addListener(mqHandler); }
      } catch(e) { _cerr('matchMedia listener error:', e); }
    }
  },

  /**
   * Set theme preference
   * @param {'dark'|'light'|'auto'} pref - Theme preference
   */
  set(pref) {
    storage.set('theme_pref', pref);
    this.apply(pref);
  }
};

/* === ROUTER (SPA navigation) === */
export const Router = {
  _pages: {},

  /**
   * Register a page
   * @param {string} id - Page ID (e.g. 'dashboard')
   * @param {Object} page - Page object with mount() and refresh() methods
   */
  register(id, page) {
    this._pages[id] = page;
  },

  /**
   * Navigate to a page
   * @param {string} pageId - Page ID
   */
  navigate(pageId) {
    $all('.page').forEach(p => p.classList.remove('is-active'));
    $all('.bottom-nav__item').forEach(b => {
      b.classList.remove('is-active');
      b.removeAttribute('aria-current');
    });

    var target = $('page-' + pageId);
    if (target) target.classList.add('is-active');

    $all('.bottom-nav__item').forEach(b => {
      if (b.dataset.page === pageId) {
        b.classList.add('is-active');
        b.setAttribute('aria-current', 'page');
      }
    });

    // Emit navigation event
    EventBus.emit('navigate', pageId);

    // Call page refresh if available
    var page = this._pages[pageId];
    if (page && page.refresh) page.refresh();
  },

  /**
   * Initialize router with nav button bindings
   */
  init() {
    $all('.bottom-nav__item[data-page]').forEach(btn => {
      onClick(btn, () => this.navigate(btn.dataset.page));
    });
  }
};
