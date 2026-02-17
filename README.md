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

## Deploy to Cloudflare Pages

1. Install and log in (one-time):

   ```bash
   npx wrangler login
   ```

   Or for CI: create an API token at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) and set `CLOUDFLARE_API_TOKEN`.

2. Deploy:

   ```bash
   ./deploy-cloudflare.sh
   ```

   The script copies `index.html`, `app.js`, and `styles.css` into `.pages-deploy` and runs `wrangler pages deploy`. The site will be live at `https://buysell-central.pages.dev` (or a similar `.pages.dev` URL).

## Symbol records (CUB / FT / Star list) → GitHub

Symbol lists are stored in the browser (localStorage) and optionally in the repo as `symbols.json`. To **update GitHub from your localhost data**:

1. Open the app (e.g. on localhost), then click **Export symbols** in the chart header. This downloads `symbols.json` with your current CUB, FT, and Star list.
2. Save the file into the project root (replace the existing `symbols.json`).
3. Commit and push:  
   `git add symbols.json && git commit -m "Update symbol records" && git push origin main`

New loads (or other devices) will seed from `symbols.json` when localStorage is empty.
