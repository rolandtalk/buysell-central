/**
 * Buysell Central
 * Layout and TradingView chart integration.
 * Stock Watchlist data/source: redevelop as needed.
 */

// --- TradingView widget (keep as-is) ---
const TRADINGVIEW_CHART = (sym) => `https://www.tradingview.com/chart/?symbol=${sym}`;

function injectTradingViewWidget(symbol) {
  const container = document.getElementById('chart-container');
  const iframeUrl = 'https://www.tradingview.com/widgetembed/?frameElementId=chart&symbol=' + encodeURIComponent(symbol) + '&interval=D&hidesidebar=1&symboledit=1&saveimage=0&theme=light&style=1&timezone=UTC&withdateranges=1';
  container.innerHTML = '<iframe src="' + iframeUrl + '" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen style="width:100%;height:100%;min-height:200px"></iframe>';
}

// --- Chart loader (called when user selects a symbol) ---
function loadChart(symbol) {
  const chartUrl = TRADINGVIEW_CHART(symbol);
  const currentSymbolEl = document.getElementById('current-symbol');
  const openExternal = document.getElementById('open-external');
  const fallbackLink = document.getElementById('fallback-link');

  injectTradingViewWidget(symbol);
  currentSymbolEl.textContent = symbol;
  openExternal.href = chartUrl;
  fallbackLink.href = chartUrl;

  document.querySelectorAll('tbody tr[data-sym]').forEach(row => {
    row.classList.toggle('selected', row.dataset.sym === symbol);
  });
}

// --- Stock Watchlist (redevelop as needed) ---
// Placeholder: minimal sample for layout demo. Replace with your own data source.
const STOCKS = [
  { sym: 'AAPL', p1: 5.2, p2: 8.1, p3: 10.5, p4: 15.3, rsi: 55.0, info: 'Technology', status: true },
  { sym: 'AMAT', p1: 8.08, p2: 10.05, p3: 11.23, p4: 55.48, rsi: 61.0, info: 'Semiconductor Equipment', status: true },
];

function formatPercent(val) {
  return val >= 0 ? `+${val.toFixed(2)}%` : `${val.toFixed(2)}%`;
}

function renderTable() {
  const tbody = document.getElementById('stock-rows');
  tbody.innerHTML = STOCKS.map((s, i) => `
    <tr data-sym="${s.sym}" data-index="${i}">
      <td>${s.sym}</td>
      <td class="${s.p1 >= 0 ? 'positive' : 'negative'}">${formatPercent(s.p1)}</td>
      <td class="${s.p2 >= 0 ? 'positive' : 'negative'}">${formatPercent(s.p2)}</td>
      <td class="${s.p3 >= 0 ? 'positive' : 'negative'}">${formatPercent(s.p3)}</td>
      <td class="${s.p4 >= 0 ? 'positive' : 'negative'}">${formatPercent(s.p4)}</td>
      <td>${(s.rsi || 0).toFixed(3)}</td>
      <td>${s.info || ''}</td>
      <td><input type="checkbox" ${s.status ? 'checked' : ''}></td>
      <td><span class="chart-link" data-sym="${s.sym}">${s.sym}</span></td>
    </tr>
  `).join('');

  document.querySelectorAll('.chart-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      loadChart(e.target.dataset.sym);
    });
  });

  document.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', (e) => {
      if (!e.target.matches('input[type="checkbox"]') && !e.target.matches('.chart-link')) {
        loadChart(row.dataset.sym);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderTable();
  if (STOCKS.length > 0) loadChart(STOCKS[0].sym);
});
