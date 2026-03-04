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

1. **Enable GitHub Pages**  
   In the repo go to **Settings → Pages**:
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.

2. **Generate initial data** (so the site has something to show):
   - Go to **Actions** → **Refresh dashboard data** → **Run workflow**.
   - When it finishes, it commits `public/data/` to `main`. That push triggers the **Deploy to GitHub Pages** workflow, which builds the app and deploys it.

The **Refresh dashboard data** workflow runs daily at **21:05 UTC** (Mon–Fri). Each time it commits new data to `main`, the deploy workflow runs and updates the live site.

---

## Project structure

```
market-dashboard/
├── .github/workflows/refresh_data.yml   # Daily data refresh (21:05 UTC)
├── .github/workflows/deploy.yml         # Build and deploy to GitHub Pages (on push to main)
├── scripts/build_data.py               # Fetches data, writes JSON
├── public/                             # Static assets
│   └── data/                           # data.json, events.json (generated; workflow commits here)
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
