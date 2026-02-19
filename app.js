/**
 * Buysell Central
 * Pages: Home (star list), RI (Rebound Index), RH (PortanaHung), OO (Watchlist).
 * Navigation + dark theme. Star list persisted in localStorage.
 */

const STAR_STORAGE_KEY = 'buysell-starred';
const CUB_STORAGE_KEY = 'buysell-cub-symbols';
const FT_STORAGE_KEY = 'buysell-ft-symbols';
const OO_STORAGE_KEY = 'buysell-oo-symbols';
const CUB_CACHE_KEY = 'buysell-cub-cache';
const FT_CACHE_KEY = 'buysell-ft-cache';
const OO_CACHE_KEY = 'buysell-oo-cache';

const CUB_DEFAULT_SYMBOLS = [
  'AAPL', 'ABBNY', 'ABBV', 'ALB', 'AMZN', 'ARKX', 'ARM', 'AVAV', 'BABA', 'CRSP',
  'EIS', 'EWZ', 'FNGS', 'GLD', 'GOOG', 'HWM', 'HYG', 'IQ', 'LQD', 'MU',
  'PLTR', 'RKLB', 'SHY', 'TLT', 'TSLA', 'URA',
];

const FT_DEFAULT_SYMBOLS = [
  'AAPL', 'AMAT', 'ARKG', 'ARKK', 'ARKX', 'AVGO', 'COHR', 'COIN', 'DXYZ', 'ETN',
  'EWJ', 'EWP', 'EWU', 'FIX', 'FTAI', 'GLD', 'GOOG', 'HWM', 'HYG', 'ISRG', 'JETS',
  'KRE', 'LQD', 'LRCX', 'MCHI', 'META', 'NVO', 'NVDA', 'ORCL', 'PAVE', 'PHO',
  'PLTR', 'QS', 'RKLB', 'RTX', 'SLV', 'TER', 'TEVA', 'TNA', 'TSLA', 'TWST',
  'UBER', 'XLF', 'XME',
];

const OO_DEFAULT_SYMBOLS = ['AAPL', 'GOOG', 'META', 'MSFT', 'NVDA', 'TSLA'];

// --- API ---
// Use same-origin when localhost (serve.py proxy) or Cloudflare Pages (Pages Function proxy); else direct Railway URL
const API_BASE = (typeof location !== 'undefined' &&
  (/^localhost$|^127\.0\.0\.1$/i.test(location.hostname) || /\.pages\.dev$/i.test(location.hostname)))
  ? ''
  : 'https://web-production-1b15c.up.railway.app';

const TRADINGVIEW_CHART = (sym) => `https://www.tradingview.com/chart/?symbol=${sym}`;

// --- Star list (localStorage) ---
function getStarred() {
  try {
    const raw = localStorage.getItem(STAR_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function setStarred(items) {
  localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify(items));
}

function toggleStar(sym, rowData) {
  const list = getStarred();
  const idx = list.findIndex((x) => (typeof x === 'string' ? x : x.sym) === sym);
  if (idx >= 0) {
    list.splice(idx, 1);
    setStarred(list);
    return false;
  }
  const entry = rowData && typeof rowData === 'object'
    ? { sym: rowData.sym, p1: rowData.p1, p2: rowData.p2, p3: rowData.p3, p4: rowData.p4, rsi: rowData.rsi, curves: rowData.curves || 'V' }
    : { sym };
  list.push(entry);
  setStarred(list);
  return true;
}

function isStarred(sym) {
  return getStarred().some((x) => (typeof x === 'string' ? x : x.sym) === sym);
}

/** Export CUB, FT, and starred lists as symbols.json for saving to repo / GitHub */
function exportSymbols() {
  const data = {
    cub: getCubSymbols(),
    ft: getFtSymbols(),
    oo: getOoSymbols(),
    starred: getStarred(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'symbols.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Seed CUB/FT/starred from symbols.json when localStorage is empty (e.g. first load or new device) */
async function seedFromSymbolsJson() {
  try {
    const res = await fetch('symbols.json');
    if (!res.ok) return;
    const data = await res.json();
    if (data.cub?.length && !localStorage.getItem(CUB_STORAGE_KEY)) setCubSymbols(data.cub);
    if (data.ft?.length && !localStorage.getItem(FT_STORAGE_KEY)) setFtSymbols(data.ft);
    if (data.oo?.length && !localStorage.getItem(OO_STORAGE_KEY)) setOoSymbols(data.oo);
    if (Array.isArray(data.starred) && data.starred.length && !localStorage.getItem(STAR_STORAGE_KEY)) setStarred(data.starred);
  } catch (_) { /* no symbols.json or network */ }
}

// --- Navigation ---
const PANELS = { home: 'panel-home', ri: 'panel-ri', cub: 'panel-cub', ft: 'panel-ft', oo: 'panel-oo' };
const NAV_IDS = { home: 'nav-home', ri: 'nav-ri', cub: 'nav-cub', ft: 'nav-ft', oo: 'nav-oo' };

function getPageFromHash() {
  const hash = (location.hash || '#home').slice(1).toLowerCase();
  return PANELS[hash] ? hash : 'home';
}

function showPanel(page) {
  const mainWithChart = document.getElementById('main-with-chart');
  if (mainWithChart) mainWithChart.classList.toggle('visible', page === 'home' || page === 'ri' || page === 'cub' || page === 'ft' || page === 'oo');

  Object.values(PANELS).forEach((id) => {
    document.getElementById(id).classList.toggle('active', id === PANELS[page]);
  });
  Object.entries(NAV_IDS).forEach(([p, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', p === page);
  });
  refreshPanel(page);
}

function refreshPanel(page) {
  if (page === 'home') ensureRIDataThenRenderStarList();
  if (page === 'ri' && STOCKS.length > 0) renderTable(getSortedStocks());
  if (page === 'cub') ensureCubDataThenRender();
  if (page === 'ft') ensureFtDataThenRender();
  if (page === 'oo') ensureOoDataThenRender();
}

function ensureRIDataThenRenderStarList() {
  const list = getStarred();
  const tbody = document.getElementById('star-list');
  const emptyMsg = document.getElementById('empty-star-msg');
  if (list.length === 0) {
    if (tbody) tbody.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (STOCKS.length === 0) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading data from RI…</td></tr>';
    if (emptyMsg) emptyMsg.style.display = 'none';
    fetchWatchlist()
      .then((stocks) => {
        STOCKS.length = 0;
        STOCKS.push(...stocks);
        renderStarList();
      })
      .catch((err) => {
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="error-cell">Failed to load RI data: ${err.message}</td></tr>`;
        console.error(err);
      });
    return;
  }
  renderStarList();
}

function initNav() {
  if (!location.hash || location.hash === '#') location.hash = 'home';
  const page = getPageFromHash();
  showPanel(page);

  window.addEventListener('hashchange', () => {
    showPanel(getPageFromHash());
  });

  document.querySelectorAll('.nav-buttons a').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('#')) {
        location.hash = href.slice(1);
        e.preventDefault();
      }
    });
  });
}

// --- Home: Star List table (data from RI list), sortable ---
let sortStateHome = { key: null, dir: 1 };

function getStarredRows() {
  const list = getStarred();
  return list.map((item) => {
    const sym = typeof item === 'string' ? item : item.sym;
    const fromRI = STOCKS.find((r) => r.sym === sym);
    return fromRI || (typeof item === 'object' && item !== null ? item : { sym, p1: null, p2: null, p3: null, p4: null, rsi: null, curves: 'V' });
  });
}

function getSortedStarList() {
  const rows = getStarredRows();
  if (rows.length === 0 || !sortStateHome.key) return rows;
  const key = sortStateHome.key;
  const dir = sortStateHome.dir;
  return [...rows].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (key === 'sym') {
      va = (va || '').toLowerCase();
      vb = (vb || '').toLowerCase();
      return dir * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    const na = va != null && va !== '' ? Number(va) : NaN;
    const nb = vb != null && vb !== '' ? Number(vb) : NaN;
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return dir;
    if (Number.isNaN(nb)) return -dir;
    return dir * (na - nb);
  });
}

function updateHomeSortIndicators() {
  document.querySelectorAll('#panel-home .data-table th[data-sort] .sort-icon').forEach((span) => {
    const th = span.closest('th');
    const key = th?.dataset.sort;
    if (!key) return;
    if (sortStateHome.key === key) {
      span.textContent = sortStateHome.dir === 1 ? '▲' : '▼';
    } else {
      span.textContent = '▼';
    }
  });
}

function setupHomeSortHandlers() {
  document.querySelectorAll('#panel-home .data-table th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (!key) return;
      if (sortStateHome.key === key) sortStateHome.dir *= -1;
      else sortStateHome = { key, dir: 1 };
      updateHomeSortIndicators();
      renderStarList();
    });
  });
}

function renderStarList() {
  const list = getStarred();
  const tbody = document.getElementById('star-list');
  const emptyMsg = document.getElementById('empty-star-msg');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    return;
  }
  if (emptyMsg) emptyMsg.style.display = 'none';

  const sorted = getSortedStarList();
  tbody.innerHTML = sorted.map((s) => {
    return `
    <tr data-sym="${s.sym}">
      <td><button type="button" class="star-btn starred" data-sym="${s.sym}" title="Disable star – remove from Star List" aria-label="Disable star for ${s.sym}">★</button></td>
      <td><a href="#ri" class="sym-link" data-sym="${s.sym}">${s.sym}</a></td>
      <td class="${(s.p1 != null && s.p1 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p1)}</td>
      <td class="${(s.p2 != null && s.p2 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p2)}</td>
      <td class="${(s.p3 != null && s.p3 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p3)}</td>
      <td class="${(s.p4 != null && s.p4 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p4)}</td>
      <td>${(s.rsi != null ? Number(s.rsi).toFixed(2) : '—')}</td>
      <td><button type="button" class="remove-btn" data-sym="${s.sym}" title="Remove from Star List">−</button></td>
    </tr>
  `;
  }).join('');
  updateHomeSortIndicators();

  tbody.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleStar(btn.dataset.sym);
      renderStarList();
    });
  });

  tbody.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleStar(btn.dataset.sym);
      renderStarList();
    });
  });

  tbody.querySelectorAll('.sym-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      loadChart(a.dataset.sym);
    });
  });

  tbody.querySelectorAll('tr[data-sym]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.star-btn') || e.target.closest('.sym-link') || e.target.closest('.remove-btn')) return;
      loadChart(row.dataset.sym);
    });
  });

  if (sorted.length > 0 && getPageFromHash() === 'home') {
    loadChart(sorted[0].sym);
  }
}

// --- Chart ---
function injectTradingViewWidget(symbol) {
  const container = document.getElementById('chart-container');
  if (!container) return;
  // Default: one candle = 1 day (interval=D); use TradingView gadget default range
  const iframeUrl = 'https://www.tradingview.com/widgetembed/?frameElementId=chart&symbol=' + encodeURIComponent(symbol) + '&interval=D&hidesidebar=1&symboledit=1&saveimage=0&theme=dark&style=1&timezone=UTC&withdateranges=1';
  container.innerHTML = '<iframe src="' + iframeUrl + '" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;min-height:200px"></iframe>';
}

function loadChart(symbol) {
  const chartUrl = TRADINGVIEW_CHART(symbol);
  const currentSymbolEl = document.getElementById('current-symbol');
  const openExternal = document.getElementById('open-external');
  const fallbackLink = document.getElementById('fallback-link');

  if (currentSymbolEl) currentSymbolEl.textContent = symbol;
  if (openExternal) openExternal.href = chartUrl;
  if (fallbackLink) fallbackLink.href = chartUrl;

  injectTradingViewWidget(symbol);

  document.querySelectorAll('#stock-rows tr[data-sym], #star-list tr[data-sym], #cub-rows tr[data-sym], #ft-rows tr[data-sym], #oo-rows tr[data-sym]').forEach((row) => {
    row.classList.toggle('selected', row.dataset.sym === symbol);
  });
}

// --- CUB: custom symbol list (add/remove, persisted) ---
function getCubSymbols() {
  try {
    const raw = localStorage.getItem(CUB_STORAGE_KEY);
    if (!raw) return [...CUB_DEFAULT_SYMBOLS];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr : [...CUB_DEFAULT_SYMBOLS];
  } catch {
    return [...CUB_DEFAULT_SYMBOLS];
  }
}

function setCubSymbols(symbols) {
  localStorage.setItem(CUB_STORAGE_KEY, JSON.stringify(symbols));
}

function addCubSymbol(sym) {
  const s = (sym || '').toUpperCase().trim();
  if (!s) return false;
  const list = getCubSymbols();
  if (list.includes(s)) return false;
  list.push(s);
  setCubSymbols(list);
  return true;
}

function removeCubSymbol(sym) {
  const list = getCubSymbols().filter((x) => x !== sym);
  setCubSymbols(list);
}

const CUB_STOCKS = [];
let sortStateCub = { key: null, dir: 1 };

async function fetchCubDataForSymbols(symbolList) {
  if (symbolList.length === 0) return [];
  const query = symbolList.map((s) => encodeURIComponent(s)).join(',');
  const res = await fetch(getApiUrl('/api/price-performance?symbols=' + query));
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  const data = json.data || [];
  return symbolList.map((sym) => {
    const row = data.find((r) => (r.symbol || r.sym) === sym) || {};
    return {
      sym,
      p1: row.perf1d,
      p2: row.perf5d,
      p3: row.perf20d,
      p4: row.perf60d,
      rsi: row.rsi_14,
      curves: '—',
    };
  });
}

async function fetchCubData() {
  return fetchCubDataForSymbols(getCubSymbols());
}

function saveCubCache() {
  try {
    if (CUB_STOCKS.length > 0) {
      localStorage.setItem(CUB_CACHE_KEY, JSON.stringify({
        symbols: getCubSymbols(),
        rows: CUB_STOCKS.slice(),
      }));
    } else {
      localStorage.removeItem(CUB_CACHE_KEY);
    }
  } catch (_) { /* ignore */ }
}

function sameSymbolSet(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const set = new Set(b.map((s) => String(s).toUpperCase()));
  return a.every((s) => set.has(String(s).toUpperCase()));
}

function rowsInSymbolOrder(rows, symbolList) {
  const bySym = new Map(rows.map((r) => [r.sym, r]));
  return symbolList.map((sym) => bySym.get(sym)).filter(Boolean);
}

function ensureCubDataThenRender() {
  const tbody = document.getElementById('cub-rows');
  if (!tbody) return;
  // If we already have CUB data in memory (e.g. user switched back), just re-render
  if (CUB_STOCKS.length > 0) {
    renderCubTable(getSortedCubStocks());
    return;
  }
  // After refresh: restore from localStorage first so the table appears instantly (no loading)
  const currentSymbols = getCubSymbols();
  try {
    const raw = localStorage.getItem(CUB_CACHE_KEY);
    if (raw && currentSymbols.length > 0) {
      const { symbols, rows } = JSON.parse(raw);
      if (Array.isArray(rows) && rows.length > 0 && sameSymbolSet(symbols, currentSymbols)) {
        const ordered = rowsInSymbolOrder(rows, currentSymbols);
        if (ordered.length > 0) {
          CUB_STOCKS.length = 0;
          CUB_STOCKS.push(...ordered);
          renderCubTable(getSortedCubStocks());
          if (ordered.length > 0) loadChart(ordered[0].sym);
          return;
        }
      }
    }
  } catch (_) { /* ignore bad cache */ }
  tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading CUB…</td></tr>';
  fetchCubData()
    .then((rows) => {
      CUB_STOCKS.length = 0;
      CUB_STOCKS.push(...rows);
      saveCubCache();
      renderCubTable(getSortedCubStocks());
      if (rows.length > 0) loadChart(rows[0].sym);
    })
    .catch((err) => {
      const msg = err.message || String(err);
      const is502 = /502|Bad Gateway/i.test(msg);
      const hint = is502 ? ' The API may be temporarily unavailable. Try again in a moment.' : '';
      tbody.innerHTML = `<tr><td colspan="8" class="error-cell">Failed to load CUB: ${msg}.${hint} <button type="button" class="retry-btn" id="cub-retry-btn">Retry</button></td></tr>`;
      const retryBtn = document.getElementById('cub-retry-btn');
      if (retryBtn) retryBtn.addEventListener('click', () => ensureCubDataThenRender());
      console.error(err);
    });
}

function getSortedCubStocks() {
  if (CUB_STOCKS.length === 0) return [];
  if (!sortStateCub.key) return [...CUB_STOCKS];
  const key = sortStateCub.key;
  const dir = sortStateCub.dir;
  return [...CUB_STOCKS].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (key === 'sym') {
      va = (va || '').toLowerCase();
      vb = (vb || '').toLowerCase();
      return dir * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    const na = va != null && va !== '' ? Number(va) : NaN;
    const nb = vb != null && vb !== '' ? Number(vb) : NaN;
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return dir;
    if (Number.isNaN(nb)) return -dir;
    return dir * (na - nb);
  });
}

function renderCubTable(stocks) {
  const tbody = document.getElementById('cub-rows');
  if (!tbody) return;
  if (!stocks || stocks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = stocks.map((s, i) => cubRowHtml(s, i)).join('');

  tbody.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sym = btn.dataset.sym;
      removeCubSymbol(sym);
      const idx = CUB_STOCKS.findIndex((s) => s.sym === sym);
      if (idx >= 0) CUB_STOCKS.splice(idx, 1);
      saveCubCache();
      const tr = tbody.querySelector(`tr[data-sym="${sym}"]`);
      if (tr) tr.remove();
      if (CUB_STOCKS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
      }
    });
  });

  tbody.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('tr');
      const sym = btn.dataset.sym;
      const rowData = CUB_STOCKS.find((s) => s.sym === sym) || null;
      const nowStarred = toggleStar(sym, rowData);
      btn.classList.toggle('starred', nowStarred);
      btn.textContent = nowStarred ? '★' : '☆';
      btn.title = nowStarred ? 'Remove from star list' : 'Add to star list';
      renderStarList();
    });
  });

  tbody.querySelectorAll('tr[data-sym]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.star-btn') || e.target.closest('.remove-btn')) return;
      loadChart(row.dataset.sym);
    });
  });
}

function setupCubSortHandlers() {
  document.querySelectorAll('#panel-cub .data-table th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (!key) return;
      if (sortStateCub.key === key) sortStateCub.dir *= -1;
      else sortStateCub = { key, dir: 1 };
      updateCubSortIndicators();
      renderCubTable(getSortedCubStocks());
    });
  });
}

function cubRowHtml(s, i) {
  const starred = isStarred(s.sym);
  return `
    <tr data-sym="${s.sym}" data-index="${i}">
      <td><button type="button" class="star-btn ${starred ? 'starred' : ''}" data-sym="${s.sym}" title="${starred ? 'Remove from star list' : 'Add to star list'}">${starred ? '★' : '☆'}</button></td>
      <td>${s.sym}</td>
      <td class="${(s.p1 != null && s.p1 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p1)}</td>
      <td class="${(s.p2 != null && s.p2 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p2)}</td>
      <td class="${(s.p3 != null && s.p3 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p3)}</td>
      <td class="${(s.p4 != null && s.p4 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p4)}</td>
      <td>${(s.rsi != null ? Number(s.rsi).toFixed(2) : '—')}</td>
      <td><button type="button" class="remove-btn" data-sym="${s.sym}" title="Remove from CUB list">−</button></td>
    </tr>
  `;
}

function attachCubRowListeners(tr) {
  if (!tr) return;
  const sym = tr.dataset.sym;
  const tbody = document.getElementById('cub-rows');
  const removeBtn = tr.querySelector('.remove-btn');
  const starBtn = tr.querySelector('.star-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeCubSymbol(sym);
      const idx = CUB_STOCKS.findIndex((s) => s.sym === sym);
      if (idx >= 0) CUB_STOCKS.splice(idx, 1);
      saveCubCache();
      tr.remove();
      if (CUB_STOCKS.length === 0 && tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
      }
    });
  }
  if (starBtn) {
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowData = CUB_STOCKS.find((s) => s.sym === sym) || null;
      const nowStarred = toggleStar(sym, rowData);
      starBtn.classList.toggle('starred', nowStarred);
      starBtn.textContent = nowStarred ? '★' : '☆';
      starBtn.title = nowStarred ? 'Remove from star list' : 'Add to star list';
      renderStarList();
    });
  }
  tr.addEventListener('click', (e) => {
    if (e.target.closest('.star-btn') || e.target.closest('.remove-btn')) return;
    loadChart(sym);
  });
}

function setupCubAddRemove() {
  const input = document.getElementById('cub-symbol-input');
  const btn = document.getElementById('cub-add-btn');
  const tbody = document.getElementById('cub-rows');
  if (!input || !btn || !tbody) return;
  function addFromInput() {
    const sym = (input.value || '').toUpperCase().trim();
    if (!sym) return;
    if (!addCubSymbol(sym)) {
      input.value = '';
      return;
    }
    input.value = '';
    if (getPageFromHash() !== 'cub') return;
    fetchCubDataForSymbols([sym])
      .then((rows) => {
        if (rows.length === 0) return;
        const row = rows[0];
        CUB_STOCKS.push(row);
        saveCubCache();
        const sorted = getSortedCubStocks();
        const idx = sorted.findIndex((s) => s.sym === sym);
        const emptyRow = tbody.querySelector('.empty-cell');
        if (emptyRow) emptyRow.remove();
        const html = cubRowHtml(row, idx);
        if (idx <= 0 || tbody.children.length === 0) {
          tbody.insertAdjacentHTML('afterbegin', html);
        } else {
          const ref = tbody.children[idx - 1];
          ref.insertAdjacentHTML('afterend', html);
        }
        const newTr = tbody.querySelector(`tr[data-sym="${sym}"]`);
        attachCubRowListeners(newTr);
      })
      .catch((err) => {
        removeCubSymbol(sym);
        console.error(err);
      });
  }
  btn.addEventListener('click', addFromInput);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addFromInput(); });
}

// --- FT: identical to CUB (add/remove symbols, own list) ---
function getFtSymbols() {
  try {
    const raw = localStorage.getItem(FT_STORAGE_KEY);
    if (!raw) return [...FT_DEFAULT_SYMBOLS];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr : [...FT_DEFAULT_SYMBOLS];
  } catch {
    return [...FT_DEFAULT_SYMBOLS];
  }
}

function setFtSymbols(symbols) {
  localStorage.setItem(FT_STORAGE_KEY, JSON.stringify(symbols));
}

function addFtSymbol(sym) {
  const s = (sym || '').toUpperCase().trim();
  if (!s) return false;
  const list = getFtSymbols();
  if (list.includes(s)) return false;
  list.push(s);
  setFtSymbols(list);
  return true;
}

function removeFtSymbol(sym) {
  const list = getFtSymbols().filter((x) => x !== sym);
  setFtSymbols(list);
}

const FT_STOCKS = [];
let sortStateFt = { key: null, dir: 1 };

async function fetchFtData() {
  return fetchCubDataForSymbols(getFtSymbols());
}

function saveFtCache() {
  try {
    if (FT_STOCKS.length > 0) {
      localStorage.setItem(FT_CACHE_KEY, JSON.stringify({
        symbols: getFtSymbols(),
        rows: FT_STOCKS.slice(),
      }));
    } else {
      localStorage.removeItem(FT_CACHE_KEY);
    }
  } catch (_) { /* ignore */ }
}

function ensureFtDataThenRender() {
  const tbody = document.getElementById('ft-rows');
  if (!tbody) return;
  // If we already have FT data in memory (e.g. user switched back), just re-render
  if (FT_STOCKS.length > 0) {
    renderFtTable(getSortedFtStocks());
    return;
  }
  // After refresh: restore from localStorage first so the table appears instantly (no loading)
  const currentSymbols = getFtSymbols();
  try {
    const raw = localStorage.getItem(FT_CACHE_KEY);
    if (raw && currentSymbols.length > 0) {
      const { symbols, rows } = JSON.parse(raw);
      if (Array.isArray(rows) && rows.length > 0 && sameSymbolSet(symbols, currentSymbols)) {
        const ordered = rowsInSymbolOrder(rows, currentSymbols);
        if (ordered.length > 0) {
          FT_STOCKS.length = 0;
          FT_STOCKS.push(...ordered);
          renderFtTable(getSortedFtStocks());
          if (ordered.length > 0) loadChart(ordered[0].sym);
          return;
        }
      }
    }
  } catch (_) { /* ignore bad cache */ }
  tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading FT…</td></tr>';
  fetchFtData()
    .then((rows) => {
      FT_STOCKS.length = 0;
      FT_STOCKS.push(...rows);
      saveFtCache();
      renderFtTable(getSortedFtStocks());
      if (rows.length > 0) loadChart(rows[0].sym);
    })
    .catch((err) => {
      const msg = err.message || String(err);
      const is502 = /502|Bad Gateway/i.test(msg);
      const hint = is502 ? ' The API may be temporarily unavailable. Try again in a moment.' : '';
      tbody.innerHTML = `<tr><td colspan="8" class="error-cell">Failed to load FT: ${msg}.${hint} <button type="button" class="retry-btn" id="ft-retry-btn">Retry</button></td></tr>`;
      const retryBtn = document.getElementById('ft-retry-btn');
      if (retryBtn) retryBtn.addEventListener('click', () => ensureFtDataThenRender());
      console.error(err);
    });
}

function getSortedFtStocks() {
  if (FT_STOCKS.length === 0) return [];
  if (!sortStateFt.key) return [...FT_STOCKS];
  const key = sortStateFt.key;
  const dir = sortStateFt.dir;
  return [...FT_STOCKS].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (key === 'sym') {
      va = (va || '').toLowerCase();
      vb = (vb || '').toLowerCase();
      return dir * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    const na = va != null && va !== '' ? Number(va) : NaN;
    const nb = vb != null && vb !== '' ? Number(vb) : NaN;
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return dir;
    if (Number.isNaN(nb)) return -dir;
    return dir * (na - nb);
  });
}

function ftRowHtml(s, i) {
  const starred = isStarred(s.sym);
  return `
    <tr data-sym="${s.sym}" data-index="${i}">
      <td><button type="button" class="star-btn ${starred ? 'starred' : ''}" data-sym="${s.sym}" title="${starred ? 'Remove from star list' : 'Add to star list'}">${starred ? '★' : '☆'}</button></td>
      <td>${s.sym}</td>
      <td class="${(s.p1 != null && s.p1 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p1)}</td>
      <td class="${(s.p2 != null && s.p2 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p2)}</td>
      <td class="${(s.p3 != null && s.p3 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p3)}</td>
      <td class="${(s.p4 != null && s.p4 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p4)}</td>
      <td>${(s.rsi != null ? Number(s.rsi).toFixed(2) : '—')}</td>
      <td><button type="button" class="remove-btn" data-sym="${s.sym}" title="Remove from FT list">−</button></td>
    </tr>
  `;
}

function attachFtRowListeners(tr) {
  if (!tr) return;
  const sym = tr.dataset.sym;
  const tbody = document.getElementById('ft-rows');
  const removeBtn = tr.querySelector('.remove-btn');
  const starBtn = tr.querySelector('.star-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFtSymbol(sym);
      const idx = FT_STOCKS.findIndex((s) => s.sym === sym);
      if (idx >= 0) FT_STOCKS.splice(idx, 1);
      saveFtCache();
      tr.remove();
      if (FT_STOCKS.length === 0 && tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
      }
    });
  }
  if (starBtn) {
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowData = FT_STOCKS.find((s) => s.sym === sym) || null;
      const nowStarred = toggleStar(sym, rowData);
      starBtn.classList.toggle('starred', nowStarred);
      starBtn.textContent = nowStarred ? '★' : '☆';
      starBtn.title = nowStarred ? 'Remove from star list' : 'Add to star list';
      renderStarList();
    });
  }
  tr.addEventListener('click', (e) => {
    if (e.target.closest('.star-btn') || e.target.closest('.remove-btn')) return;
    loadChart(sym);
  });
}

function renderFtTable(stocks) {
  const tbody = document.getElementById('ft-rows');
  if (!tbody) return;
  if (!stocks || stocks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = stocks.map((s, i) => ftRowHtml(s, i)).join('');

  tbody.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sym = btn.dataset.sym;
      removeFtSymbol(sym);
      const idx = FT_STOCKS.findIndex((s) => s.sym === sym);
      if (idx >= 0) FT_STOCKS.splice(idx, 1);
      saveFtCache();
      const tr = tbody.querySelector(`tr[data-sym="${sym}"]`);
      if (tr) tr.remove();
      if (FT_STOCKS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
      }
    });
  });

  tbody.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('tr');
      const sym = btn.dataset.sym;
      const rowData = FT_STOCKS.find((s) => s.sym === sym) || null;
      const nowStarred = toggleStar(sym, rowData);
      btn.classList.toggle('starred', nowStarred);
      btn.textContent = nowStarred ? '★' : '☆';
      btn.title = nowStarred ? 'Remove from star list' : 'Add to star list';
      renderStarList();
    });
  });

  tbody.querySelectorAll('tr[data-sym]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.star-btn') || e.target.closest('.remove-btn')) return;
      loadChart(row.dataset.sym);
    });
  });
}

function updateFtSortIndicators() {
  document.querySelectorAll('#panel-ft .data-table th[data-sort] .sort-icon').forEach((span) => {
    const th = span.closest('th');
    const key = th?.dataset.sort;
    if (!key) return;
    if (sortStateFt.key === key) {
      span.textContent = sortStateFt.dir === 1 ? '▲' : '▼';
    } else {
      span.textContent = '▼';
    }
  });
}

function setupFtSortHandlers() {
  document.querySelectorAll('#panel-ft .data-table th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (!key) return;
      if (sortStateFt.key === key) sortStateFt.dir *= -1;
      else sortStateFt = { key, dir: 1 };
      updateFtSortIndicators();
      renderFtTable(getSortedFtStocks());
    });
  });
}

function setupFtAddRemove() {
  const input = document.getElementById('ft-symbol-input');
  const btn = document.getElementById('ft-add-btn');
  const tbody = document.getElementById('ft-rows');
  if (!input || !btn || !tbody) return;
  function addFromInput() {
    const sym = (input.value || '').toUpperCase().trim();
    if (!sym) return;
    if (!addFtSymbol(sym)) {
      input.value = '';
      return;
    }
    input.value = '';
    if (getPageFromHash() !== 'ft') return;
    fetchCubDataForSymbols([sym])
      .then((rows) => {
        if (rows.length === 0) return;
        const row = rows[0];
        FT_STOCKS.push(row);
        saveFtCache();
        const sorted = getSortedFtStocks();
        const idx = sorted.findIndex((s) => s.sym === sym);
        const emptyRow = tbody.querySelector('.empty-cell');
        if (emptyRow) emptyRow.remove();
        const html = ftRowHtml(row, idx);
        if (idx <= 0 || tbody.children.length === 0) {
          tbody.insertAdjacentHTML('afterbegin', html);
        } else {
          const ref = tbody.children[idx - 1];
          ref.insertAdjacentHTML('afterend', html);
        }
        const newTr = tbody.querySelector(`tr[data-sym="${sym}"]`);
        attachFtRowListeners(newTr);
      })
      .catch((err) => {
        removeFtSymbol(sym);
        console.error(err);
      });
  }
  btn.addEventListener('click', addFromInput);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addFromInput(); });
}

// --- OO: same structure and behaviour as CUB/FT (add/remove symbols, own list) ---
function getOoSymbols() {
  try {
    const raw = localStorage.getItem(OO_STORAGE_KEY);
    if (!raw) return [...OO_DEFAULT_SYMBOLS];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr : [...OO_DEFAULT_SYMBOLS];
  } catch {
    return [...OO_DEFAULT_SYMBOLS];
  }
}

function setOoSymbols(symbols) {
  localStorage.setItem(OO_STORAGE_KEY, JSON.stringify(symbols));
}

function addOoSymbol(sym) {
  const s = (sym || '').toUpperCase().trim();
  if (!s) return false;
  const list = getOoSymbols();
  if (list.includes(s)) return false;
  list.push(s);
  setOoSymbols(list);
  return true;
}

function removeOoSymbol(sym) {
  const list = getOoSymbols().filter((x) => x !== sym);
  setOoSymbols(list);
}

const OO_STOCKS = [];
let sortStateOo = { key: null, dir: 1 };

async function fetchOoData() {
  return fetchCubDataForSymbols(getOoSymbols());
}

function saveOoCache() {
  try {
    if (OO_STOCKS.length > 0) {
      localStorage.setItem(OO_CACHE_KEY, JSON.stringify({
        symbols: getOoSymbols(),
        rows: OO_STOCKS.slice(),
      }));
    } else {
      localStorage.removeItem(OO_CACHE_KEY);
    }
  } catch (_) { /* ignore */ }
}

function ensureOoDataThenRender() {
  const tbody = document.getElementById('oo-rows');
  if (!tbody) return;
  if (OO_STOCKS.length > 0) {
    renderOoTable(getSortedOoStocks());
    return;
  }
  const currentSymbols = getOoSymbols();
  try {
    const raw = localStorage.getItem(OO_CACHE_KEY);
    if (raw && currentSymbols.length > 0) {
      const { symbols, rows } = JSON.parse(raw);
      if (Array.isArray(rows) && rows.length > 0 && sameSymbolSet(symbols, currentSymbols)) {
        const ordered = rowsInSymbolOrder(rows, currentSymbols);
        if (ordered.length > 0) {
          OO_STOCKS.length = 0;
          OO_STOCKS.push(...ordered);
          renderOoTable(getSortedOoStocks());
          if (ordered.length > 0) loadChart(ordered[0].sym);
          return;
        }
      }
    }
  } catch (_) { /* ignore bad cache */ }
  tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading OO…</td></tr>';
  fetchOoData()
    .then((rows) => {
      OO_STOCKS.length = 0;
      OO_STOCKS.push(...rows);
      saveOoCache();
      renderOoTable(getSortedOoStocks());
      if (rows.length > 0) loadChart(rows[0].sym);
    })
    .catch((err) => {
      const msg = err.message || String(err);
      const is502 = /502|Bad Gateway/i.test(msg);
      const hint = is502 ? ' The API may be temporarily unavailable. Try again in a moment.' : '';
      tbody.innerHTML = `<tr><td colspan="8" class="error-cell">Failed to load OO: ${msg}.${hint} <button type="button" class="retry-btn" id="oo-retry-btn">Retry</button></td></tr>`;
      const retryBtn = document.getElementById('oo-retry-btn');
      if (retryBtn) retryBtn.addEventListener('click', () => ensureOoDataThenRender());
      console.error(err);
    });
}

function getSortedOoStocks() {
  if (OO_STOCKS.length === 0) return [];
  if (!sortStateOo.key) return [...OO_STOCKS];
  const key = sortStateOo.key;
  const dir = sortStateOo.dir;
  return [...OO_STOCKS].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (key === 'sym') {
      va = (va || '').toLowerCase();
      vb = (vb || '').toLowerCase();
      return dir * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    const na = va != null && va !== '' ? Number(va) : NaN;
    const nb = vb != null && vb !== '' ? Number(vb) : NaN;
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return dir;
    if (Number.isNaN(nb)) return -dir;
    return dir * (na - nb);
  });
}

function ooRowHtml(s, i) {
  const starred = isStarred(s.sym);
  return `
    <tr data-sym="${s.sym}" data-index="${i}">
      <td><button type="button" class="star-btn ${starred ? 'starred' : ''}" data-sym="${s.sym}" title="${starred ? 'Remove from star list' : 'Add to star list'}">${starred ? '★' : '☆'}</button></td>
      <td>${s.sym}</td>
      <td class="${(s.p1 != null && s.p1 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p1)}</td>
      <td class="${(s.p2 != null && s.p2 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p2)}</td>
      <td class="${(s.p3 != null && s.p3 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p3)}</td>
      <td class="${(s.p4 != null && s.p4 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p4)}</td>
      <td>${(s.rsi != null ? Number(s.rsi).toFixed(2) : '—')}</td>
      <td><button type="button" class="remove-btn" data-sym="${s.sym}" title="Remove from OO list">−</button></td>
    </tr>
  `;
}

function renderOoTable(stocks) {
  const tbody = document.getElementById('oo-rows');
  if (!tbody) return;
  if (!stocks || stocks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
    return;
  }
  tbody.innerHTML = stocks.map((s, i) => ooRowHtml(s, i)).join('');

  tbody.querySelectorAll('.remove-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sym = btn.dataset.sym;
      removeOoSymbol(sym);
      const idx = OO_STOCKS.findIndex((s) => s.sym === sym);
      if (idx >= 0) OO_STOCKS.splice(idx, 1);
      saveOoCache();
      const tr = tbody.querySelector(`tr[data-sym="${sym}"]`);
      if (tr) tr.remove();
      if (OO_STOCKS.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
      }
    });
  });

  tbody.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('tr');
      const sym = btn.dataset.sym;
      const rowData = OO_STOCKS.find((s) => s.sym === sym) || null;
      const nowStarred = toggleStar(sym, rowData);
      btn.classList.toggle('starred', nowStarred);
      btn.textContent = nowStarred ? '★' : '☆';
      btn.title = nowStarred ? 'Remove from star list' : 'Add to star list';
      renderStarList();
    });
  });

  tbody.querySelectorAll('tr[data-sym]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.star-btn') || e.target.closest('.remove-btn')) return;
      loadChart(row.dataset.sym);
    });
  });
}

function updateOoSortIndicators() {
  document.querySelectorAll('#panel-oo .data-table th[data-sort] .sort-icon').forEach((span) => {
    const th = span.closest('th');
    const key = th?.dataset.sort;
    if (!key) return;
    if (sortStateOo.key === key) {
      span.textContent = sortStateOo.dir === 1 ? '▲' : '▼';
    } else {
      span.textContent = '▼';
    }
  });
}

function setupOoSortHandlers() {
  document.querySelectorAll('#panel-oo .data-table th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (!key) return;
      if (sortStateOo.key === key) sortStateOo.dir *= -1;
      else sortStateOo = { key, dir: 1 };
      updateOoSortIndicators();
      renderOoTable(getSortedOoStocks());
    });
  });
}

function attachOoRowListeners(tr) {
  if (!tr) return;
  const sym = tr.dataset.sym;
  const tbody = document.getElementById('oo-rows');
  const removeBtn = tr.querySelector('.remove-btn');
  const starBtn = tr.querySelector('.star-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeOoSymbol(sym);
      const idx = OO_STOCKS.findIndex((s) => s.sym === sym);
      if (idx >= 0) OO_STOCKS.splice(idx, 1);
      saveOoCache();
      tr.remove();
      if (OO_STOCKS.length === 0 && tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols. Add one above.</td></tr>';
      }
    });
  }
  if (starBtn) {
    starBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rowData = OO_STOCKS.find((s) => s.sym === sym) || null;
      const nowStarred = toggleStar(sym, rowData);
      starBtn.classList.toggle('starred', nowStarred);
      starBtn.textContent = nowStarred ? '★' : '☆';
      starBtn.title = nowStarred ? 'Remove from star list' : 'Add to star list';
      renderStarList();
    });
  }
  tr.addEventListener('click', (e) => {
    if (e.target.closest('.star-btn') || e.target.closest('.remove-btn')) return;
    loadChart(sym);
  });
}

function setupOoAddRemove() {
  const input = document.getElementById('oo-symbol-input');
  const btn = document.getElementById('oo-add-btn');
  const tbody = document.getElementById('oo-rows');
  if (!input || !btn || !tbody) return;
  function addFromInput() {
    const sym = (input.value || '').toUpperCase().trim();
    if (!sym) return;
    if (!addOoSymbol(sym)) {
      input.value = '';
      return;
    }
    input.value = '';
    if (getPageFromHash() !== 'oo') return;
    fetchCubDataForSymbols([sym])
      .then((rows) => {
        if (rows.length === 0) return;
        const row = rows[0];
        OO_STOCKS.push(row);
        saveOoCache();
        const sorted = getSortedOoStocks();
        const idx = sorted.findIndex((s) => s.sym === sym);
        const emptyRow = tbody.querySelector('.empty-cell');
        if (emptyRow) emptyRow.remove();
        const html = ooRowHtml(row, idx);
        if (idx <= 0 || tbody.children.length === 0) {
          tbody.insertAdjacentHTML('afterbegin', html);
        } else {
          const ref = tbody.children[idx - 1];
          ref.insertAdjacentHTML('afterend', html);
        }
        const newTr = tbody.querySelector(`tr[data-sym="${sym}"]`);
        attachOoRowListeners(newTr);
      })
      .catch((err) => {
        removeOoSymbol(sym);
        console.error(err);
      });
  }
  btn.addEventListener('click', addFromInput);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addFromInput(); });
}

// --- Rebound Index: data + table ---
const STOCKS = [];
let sortState = { key: null, dir: 1 };

function formatPercent(val) {
  if (val == null) return '—';
  return val >= 0 ? `+${Number(val).toFixed(2)}%` : `${Number(val).toFixed(2)}%`;
}

function getApiUrl(path) {
  const base = (API_BASE || '').replace(/\/$/, '');
  return base ? `${base}${path}` : path;
}

async function fetchWatchlist() {
  const res = await fetch(getApiUrl('/api/dashboard'));
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  const json = await res.json();
  const { data } = json;
  if (!data || !data.rebound || !data.perf) throw new Error('Invalid dashboard response');
  const perfList = data.perf;
  const reboundList = data.rebound;
  const merged = [];
  for (let i = 0; i < reboundList.length; i++) {
    const reb = reboundList[i];
    if (reb.curve_shape !== 'v_shape') continue;
    const perf = perfList.find((p) => p.symbol === reb.symbol) || {};
    merged.push({
      sym: reb.symbol,
      p1: perf.perf1d,
      p2: perf.perf5d,
      p3: perf.perf20d,
      p4: perf.perf60d,
      rsi: reb.rsi_14 != null ? reb.rsi_14 : perf.rsi_14,
      curves: 'V',
    });
  }
  return merged;
}

function setTableLoading(loading) {
  const tbody = document.getElementById('stock-rows');
  if (!tbody) return;
  if (loading) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading Rebound Index (curves=V)…</td></tr>';
    return;
  }
}

function setTableError(message) {
  const tbody = document.getElementById('stock-rows');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" class="error-cell">${message}</td></tr>`;
}

function getSortedStocks() {
  if (STOCKS.length === 0) return [];
  if (!sortState.key) return [...STOCKS];
  const key = sortState.key;
  const dir = sortState.dir;
  return [...STOCKS].sort((a, b) => {
    let va = a[key];
    let vb = b[key];
    if (key === 'sym') {
      va = (va || '').toLowerCase();
      vb = (vb || '').toLowerCase();
      return dir * (va < vb ? -1 : va > vb ? 1 : 0);
    }
    const na = va != null && va !== '' ? Number(va) : NaN;
    const nb = vb != null && vb !== '' ? Number(vb) : NaN;
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return dir;
    if (Number.isNaN(nb)) return -dir;
    return dir * (na - nb);
  });
}

function updateSortIndicators() {
  document.querySelectorAll('#panel-ri .data-table th[data-sort] .sort-icon').forEach((span) => {
    const th = span.closest('th');
    const key = th?.dataset.sort;
    if (!key) return;
    if (sortState.key === key) {
      span.textContent = sortState.dir === 1 ? '▲' : '▼';
    } else {
      span.textContent = '▼';
    }
  });
}

function updateCubSortIndicators() {
  document.querySelectorAll('#panel-cub .data-table th[data-sort] .sort-icon').forEach((span) => {
    const th = span.closest('th');
    const key = th?.dataset.sort;
    if (!key) return;
    if (sortStateCub.key === key) {
      span.textContent = sortStateCub.dir === 1 ? '▲' : '▼';
    } else {
      span.textContent = '▼';
    }
  });
}

function setupSortHandlers() {
  document.querySelectorAll('#panel-ri .data-table th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (!key) return;
      if (sortState.key === key) sortState.dir *= -1;
      else sortState = { key, dir: 1 };
      updateSortIndicators();
      renderTable(getSortedStocks());
    });
  });
}

function renderTable(stocks) {
  const tbody = document.getElementById('stock-rows');
  if (!tbody) return;

  if (!stocks || stocks.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-cell">No symbols with curve V from API.</td></tr>';
    if (STOCKS.length > 0) loadChart(STOCKS[0].sym);
    return;
  }

  tbody.innerHTML = stocks.map((s, i) => {
    const starred = isStarred(s.sym);
    return `
    <tr data-sym="${s.sym}" data-index="${i}">
      <td><button type="button" class="star-btn ${starred ? 'starred' : ''}" data-sym="${s.sym}" title="${starred ? 'Remove from star list' : 'Add to star list'}">${starred ? '★' : '☆'}</button></td>
      <td>${s.sym}</td>
      <td class="${(s.p1 != null && s.p1 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p1)}</td>
      <td class="${(s.p2 != null && s.p2 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p2)}</td>
      <td class="${(s.p3 != null && s.p3 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p3)}</td>
      <td class="${(s.p4 != null && s.p4 >= 0) ? 'positive' : 'negative'}">${formatPercent(s.p4)}</td>
      <td>${(s.rsi != null ? Number(s.rsi).toFixed(2) : '—')}</td>
      <td>${s.curves || 'V'}</td>
    </tr>
  `;
  }).join('');

  tbody.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = btn.closest('tr');
      const sym = btn.dataset.sym;
      const rowData = row ? STOCKS.find((s) => s.sym === sym) : null;
      const nowStarred = toggleStar(sym, rowData);
      btn.classList.toggle('starred', nowStarred);
      btn.textContent = nowStarred ? '★' : '☆';
      btn.title = nowStarred ? 'Remove from star list' : 'Add to star list';
      renderStarList();
    });
  });

  tbody.querySelectorAll('tr[data-sym]').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.star-btn')) return;
      loadChart(row.dataset.sym);
    });
  });

  if (stocks.length > 0) loadChart(stocks[0].sym);
}

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
  await seedFromSymbolsJson();
  initNav();
  renderStarList();
  document.getElementById('export-symbols')?.addEventListener('click', exportSymbols);
  setupSortHandlers();
  setupHomeSortHandlers();
  setupCubSortHandlers();
  setupFtSortHandlers();
  setupOoSortHandlers();
  setupCubAddRemove();
  setupFtAddRemove();
  setupOoAddRemove();

  const tbody = document.getElementById('stock-rows');
  if (tbody) {
    setTableLoading(true);
    try {
      const stocks = await fetchWatchlist();
      STOCKS.length = 0;
      STOCKS.push(...stocks);
      setTableLoading(false);
      updateSortIndicators();
      renderTable(getSortedStocks());
    } catch (err) {
      setTableLoading(false);
      const msg = err.message || String(err);
      const hint = msg.toLowerCase().includes('fetch') ? ' If using localhost, run serve.py and open this app from the same origin.' : '';
      setTableError('Failed to load Rebound Index: ' + msg + '.' + hint);
      console.error(err);
    }
  }
});
