# Buysell Central

Stock watchlist with embedded TradingView charts. Split layout: data table on the left, chart on the right.

## Layout

- **Left panel (65%)**: Stock Watchlist table — columns SYM, 1D/5D/20D/60D, RSI, Curves (click row to load chart)
- **Right panel (35%)**: TradingView chart — embedded via iframe using widgetembed URL

## TradingView Widget

Charts are loaded with:

```
https://www.tradingview.com/widgetembed/?frameElementId=chart&symbol={SYMBOL}&interval=D&...
```

Click a symbol in the table to load its chart. `loadChart(symbol)` calls `injectTradingViewWidget(symbol)`.

## Stock Watchlist

The watchlist is designed to be redeveloped. Current setup:

- `STOCKS` in `app.js` — placeholder array; replace with your own data source
- `renderTable()` — builds rows from `STOCKS`; adjust for your schema
- Rows use `data-sym` for chart selection

## Run locally

```bash
# Option 1: open directly
open index.html

# Option 2: local server (recommended)
python3 -m http.server 8080
# Then open http://localhost:8080
```

## Deploy to GitHub

1. Create a new repo on GitHub named `buysell-central` (or your preferred name).
2. Add remote and push:

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/buysell-central.git
   git branch -M main
   git push -u origin main
   ```

3. Optionally enable **GitHub Pages** (Settings → Pages → Source: main branch) to host the app.
