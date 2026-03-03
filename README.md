# Market Dashboard

A personal market monitoring dashboard (Macro, Equities, Breadth & Sentiment) with daily auto-refresh via GitHub Actions. Built with React + Vite and a Python data pipeline.

## Run locally

### 1. Generate data

From the repo root:

```bash
pip install -r requirements.txt
python scripts/build_data.py --out-dir public/data
```

This creates `public/data/data.json` and `public/data/events.json`. The React dev server serves files from `public/`.

### 2. Install and run the app

```bash
npm install
npm run dev
```

Open **http://localhost:5173**.

### 3. Rebuilding data

Re-run the script whenever you want fresh data:

```bash
python scripts/build_data.py --out-dir public/data
```

Refresh the browser to see updates.

---

## Deploy to GitHub Pages

When you’re ready to make the repo public and deploy:

1. **Generate initial data** (so the site has something to show):
   - In the repo go to **Actions** → **Refresh dashboard data** → **Run workflow**.
   - When it finishes, it will commit the `data/` folder to the repo.

2. **Enable GitHub Pages**  
   In the repo **Settings → Pages**:
   - **Source**: GitHub Actions (or “Deploy from a branch”).
   - If using “Deploy from a branch”: choose branch `main` and folder `/ (root)`.

3. **Build and deploy the frontend**  
   Add a second job or workflow that:
   - Runs `npm ci && npm run build`.
   - Copies `dist/` contents (and optionally `data/`) to the branch or path that Pages uses.

   If your site URL is `https://<username>.github.io/market-dashboard/`, set in `vite.config.js`:

   ```js
   base: '/market-dashboard/'
   ```

   Then rebuild and deploy so assets load correctly.

4. **Schedule**  
   The workflow runs daily at **21:05 UTC** (Mon–Fri) to refresh data. You can also run it manually from the **Actions** tab.

---

## Project structure

```
market-dashboard/
├── .github/workflows/refresh_data.yml   # Daily data refresh (21:05 UTC)
├── scripts/build_data.py               # Fetches data, writes JSON
├── data/                               # Generated data (for deploy)
├── public/                             # Static assets; put data here for dev
│   └── data/                           # data.json, events.json (after build)
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   └── components/
├── index.html
├── package.json
├── vite.config.js
├── requirements.txt
├── tickers.json
└── README.md
```

- **Data**: Yahoo Finance (`yfinance`), economic calendar (`investpy`). No API keys required for core data.
