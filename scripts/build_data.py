"""
Market Dashboard — daily data build script.
Fetches prices, equity metrics (Grade, ATR%, ATRx, VARS), macro events,
holdings, and breadth/sentiment. Outputs JSON for the React app.
Run daily at 21:05 UTC (after US market close). All timestamps in GMT/UTC.
"""

import argparse
import json
import time
from pathlib import Path
from datetime import datetime, timedelta

import pandas as pd
import requests

try:
    import yfinance as yf
except ImportError:
    raise SystemExit("Install yfinance: pip install yfinance")

# Optional: economic calendar
try:
    import investpy
    HAS_INVESTPY = True
except ImportError:
    HAS_INVESTPY = False

# ---------------------------------------------------------------------------
# Config: load tickers from tickers.json
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
CONFIG_PATH = REPO_ROOT / "tickers.json"

DEFAULT_TICKERS = {
    "etfmain": ["SPY", "QQQ", "DIA", "IWM"],
    "submarket": ["IVW", "IVE", "IJK", "IJJ", "IJT", "IJS", "MGK", "VUG", "VTV"],
    "sectors": ["XLK", "XLV", "XLF", "XLE", "XLY", "XLI", "XLB", "XLU", "XLRE", "XLC", "XLP"],
    "sectors_ew": ["RYT", "RYH", "RYF", "RYE", "RCD", "RGI", "RTM", "RYU", "EWRE", "EWCO", "RHS"],
    "thematic": ["BOTZ", "HACK", "SOXX", "ICLN", "SKYY", "XBI", "ITA", "FINX", "ARKG", "URA", "AIQ", "CIBR", "ROBO", "ARKK", "DRIV", "OGIG", "ACES", "PAVE", "HERO", "CLOU"],
    "country": ["EWJ", "EWY", "INDA", "MCHI", "GXC", "EWH", "EWU", "EWQ", "EWG", "EWZ", "EWT", "EWA", "EWC", "EWL", "EWP", "EWS", "TUR", "EWM", "EPHE", "THD", "VNM", "EWI", "EWN", "EWD", "EWK", "EWO"],
    "futures": ["ES=F", "NQ=F", "RTY=F", "YM=F"],
    "metals": ["GC=F", "SI=F", "HG=F", "PL=F", "PA=F"],
    "energy": ["CL=F", "NG=F"],
    "global": ["^N225", "^KS11", "^NSEI", "000001.SS", "000300.SS", "^HSI", "^FTSE", "^FCHI", "^GDAXI"],
    "yields": ["^TNX", "^TYX"],
    "dxvix": ["DX-Y.NYB", "^VIX"],
    "crypto": ["BTC-USD", "ETH-USD", "SOL-USD", "XRP-USD"],
}

TICKER_REMAP = {
    "ES=F": "ES1!", "NQ=F": "NQ1!", "RTY=F": "RTY1!", "YM=F": "YM1!",
    "GC=F": "GC1!", "SI=F": "SI1!", "HG=F": "HG1!", "PL=F": "PL1!", "PA=F": "PA1!",
    "CL=F": "CL1!", "NG=F": "NG1!",
    "^TNX": "US10Y", "^TYX": "US30Y",
    "DX-Y.NYB": "DX-Y.NYB", "^VIX": "CBOE:VIX",
    "BTC-USD": "BTC", "ETH-USD": "ETH", "SOL-USD": "SOL", "XRP-USD": "XRP",
}


def load_config():
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f)
    return DEFAULT_TICKERS


def pct(new, old):
    if old and old != 0:
        return round((new - old) / abs(old) * 100, 2)
    return 0.0


def _calc_ema(closes, period):
    if len(closes) < period:
        return None
    k = 2 / (period + 1)
    ema = sum(closes[:period]) / period
    for i in range(period, len(closes)):
        ema = closes[i] * k + ema * (1 - k)
    return ema


def _calc_sma(closes, period):
    if len(closes) < period:
        return None
    return sum(closes[-period:]) / period


def _calc_atr(high, low, close, period=14):
    if len(close) < period + 1:
        return None
    tr_list = []
    for i in range(1, len(close)):
        tr = max(
            high[i] - low[i],
            abs(high[i] - close[i - 1]),
            abs(low[i] - close[i - 1]),
        )
        tr_list.append(tr)
    atr = sum(tr_list[-period:]) / period
    return atr


def _grade(ema10, ema20, sma50):
    """A = uptrend (EMA10 > EMA20 > SMA50), C = downtrend, B = mixed."""
    if ema10 is None or ema20 is None or sma50 is None:
        return ""
    if ema10 > ema20 > sma50:
        return "A"
    if ema10 < ema20 < sma50:
        return "C"
    return "B"


# Key US macro event names to show (same as traderwillhu/market_dashboard)
KEY_EVENTS = [
    "Fed", "Federal Reserve", "Interest Rate", "FOMC",
    "ISM Manufacturing", "ISM Non-Manufacturing", "ISM Services", "ISM",
    "CPI", "Consumer Price Index", "Nonfarm Payrolls", "NFP", "Employment",
    "PPI", "Producer Price Index", "PCE", "Core PCE", "Personal Consumption",
    "Retail Sales", "GDP", "Gross Domestic Product", "Unemployment", "Jobless Claims", "Initial Claims",
    "Housing Starts", "Building Permits", "Durable Goods", "Factory Orders",
    "Consumer Confidence", "Michigan Consumer", "Trade Balance", "Trade Deficit",
    "Beige Book", "Fed Minutes", "JOLTS", "Job Openings",
]


def fetch_macro_events():
    """US macro economic events, next 7 days. Same API as traderwillhu/market_dashboard."""
    if not HAS_INVESTPY:
        return []
    try:
        today = datetime.today()
        end_date = today + timedelta(days=7)
        from_date = today.strftime("%d/%m/%Y")
        to_date = end_date.strftime("%d/%m/%Y")
        calendar = investpy.news.economic_calendar(
            time_zone=None,
            time_filter="time_only",
            countries=["united states"],
            importances=["high"],
            categories=None,
            from_date=from_date,
            to_date=to_date,
        )
        if calendar is None or calendar.empty:
            return []
        pattern = "|".join(KEY_EVENTS)
        filtered = calendar[
            (calendar["event"].str.contains(pattern, case=False, na=False))
            & (calendar["importance"].str.lower() == "high")
        ]
        if filtered.empty:
            return []
        filtered = filtered.sort_values(["date", "time"])
        records = filtered[["date", "time", "event"]].to_dict("records")
        # Normalize to plain strings for JSON/frontend
        out = []
        for r in records:
            date_val = str(r.get("date", ""))
            time_val = str(r.get("time", "")) if pd.notna(r.get("time")) else ""
            event = str(r.get("event", ""))
            if event:
                out.append({"date": date_val, "time": time_val, "event": event})
        return out
    except Exception as e:
        print(f"  Macro events fetch failed: {e}")
        return []


def fetch_batch_yf(tickers, period="1y"):
    """Download OHLCV for tickers via yfinance. Returns dict sym -> DataFrame."""
    if not tickers:
        return {}
    try:
        data = yf.download(tickers, period=period, interval="1d", auto_adjust=True, progress=False, threads=True, group_by="ticker")
        if data.empty:
            return {}
        result = {}
        if isinstance(data.columns, pd.MultiIndex):
            for sym in tickers:
                if sym in data.columns.get_level_values(0):
                    result[sym] = data[sym].dropna(how="all").ffill()
        else:
            result[tickers[0]] = data.dropna(how="all").ffill()
        return result
    except Exception as e:
        print(f"  yf.download error: {e}")
        return {}


def extract_metrics_base(df, sym):
    """Base metrics (price, d1, w1, hi52, ytd, spark, ema_uptrend)."""
    df = df.dropna(subset=["Close"])
    if len(df) < 2:
        return None
    closes = df["Close"].values
    high = df["High"].values if "High" in df.columns else closes
    low = df["Low"].values if "Low" in df.columns else closes
    price = float(closes[-1])
    d1 = pct(closes[-1], closes[-2]) if len(closes) >= 2 else 0.0
    w1 = pct(closes[-1], closes[-6]) if len(closes) >= 6 else 0.0
    hi52_price = float(df["High"].max()) if "High" in df else price
    hi52_pct = pct(price, hi52_price)
    this_year = datetime.now().year
    ytd_df = df[df.index.year == this_year]
    ytd = pct(price, float(ytd_df["Close"].iloc[0])) if len(ytd_df) > 0 else 0.0
    spark = []
    for i in range(max(1, len(closes) - 5), len(closes)):
        spark.append(round(pct(closes[i], closes[i - 1]), 2))
    while len(spark) < 5:
        spark.insert(0, 0.0)
    ema10 = _calc_ema(closes, 10)
    ema20 = _calc_ema(closes, 20)
    ema_uptrend = bool(ema10 > ema20) if (ema10 is not None and ema20 is not None) else None
    res = {
        "sym": TICKER_REMAP.get(sym, sym),
        "price": round(price, 4),
        "d1": d1,
        "w1": w1,
        "hi52": hi52_pct,
        "ytd": ytd,
        "spark": spark,
    }
    if ema_uptrend is not None:
        res["ema_uptrend"] = ema_uptrend
    return res, {"closes": closes, "high": high, "low": low, "price": price}


def extract_equity_metrics(df, sym, spy_closes=None):
    """Full metrics for equities: base + grade, atr_pct, atrx, vars."""
    base = extract_metrics_base(df, sym)
    if base is None:
        return None
    res, extra = base
    closes = extra["closes"]
    high = extra["high"]
    low = extra["low"]
    price = extra["price"]
    # Grade
    ema10 = _calc_ema(closes, 10)
    ema20 = _calc_ema(closes, 20)
    sma50 = _calc_sma(closes, 50)
    res["grade"] = _grade(ema10, ema20, sma50)
    # ATR% (14-day ATR as % of price)
    atr = _calc_atr(high, low, closes, 14)
    res["atr_pct"] = round(atr / price * 100, 2) if atr is not None and price else None
    # ATRx: distance from SMA50 in ATR units
    if sma50 is not None and atr is not None and atr > 0:
        res["atrx"] = round((price - sma50) / atr, 2)
    else:
        res["atrx"] = None
    # VARS: volatility-adjusted relative strength vs SPY over 21 days (0-100 scale)
    if spy_closes is not None and len(closes) >= 22 and len(spy_closes) >= 22:
        ticker_ret = pct(closes[-1], closes[-22])
        spy_ret = pct(spy_closes[-1], spy_closes[-22])
        rs = 50 + (ticker_ret - spy_ret) * 2
        res["vars"] = max(0, min(100, round(rs, 1)))
    else:
        res["vars"] = None
    return res


def extract_metrics_non_equity(df, sym):
    """For futures, metals, crypto, etc. — no grade/atr/vars."""
    out = extract_metrics_base(df, sym)
    if out is None:
        return None
    res, _ = out
    return res


def fetch_etf_holdings(tickers):
    """Top 10 holdings per ETF."""
    holdings_map = {}
    for sym in tickers:
        try:
            t = yf.Ticker(sym)
            rows = []
            try:
                fd = t.funds_data
                th = None
                if fd is not None:
                    th = fd.get("top_holdings") if hasattr(fd, "get") else getattr(fd, "top_holdings", None)
                if th is not None and hasattr(th, "iterrows") and not th.empty:
                    for idx, row in th.head(10).iterrows():
                        s = str(idx).strip() if str(idx) not in ("", "nan") else ""
                        n = ""
                        if "Name" in row.index:
                            n = str(row["Name"]).strip() or s
                        else:
                            n = s
                        w = 0.0
                        for col in ["Holding Percent", "holdingPercent", "% Assets", "weight", "Weight"]:
                            if col in row.index and pd.notna(row[col]):
                                try:
                                    w = float(row[col]) * 100 if float(row[col]) <= 1 else float(row[col])
                                except (TypeError, ValueError):
                                    pass
                                break
                        if n or s:
                            rows.append({"s": s, "n": n, "w": round(w, 2)})
            except Exception:
                pass
            if not rows:
                info = t.info or {}
                for h in info.get("holdings", [])[:10]:
                    s = str(h.get("symbol", ""))
                    n = str(h.get("holdingName", s))
                    w = h.get("holdingPercent", 0)
                    if isinstance(w, (int, float)):
                        w = w * 100 if w <= 1 else w
                    else:
                        w = 0
                    rows.append({"s": s, "n": n, "w": round(w, 2)})
            if rows:
                holdings_map[sym] = rows
            time.sleep(0.3)
        except Exception as e:
            print(f"  Holdings {sym}: {e}")
    return holdings_map


def fetch_fear_greed():
    try:
        r = requests.get(
            "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"},
        )
        r.raise_for_status()
        data = r.json()
        fg = data.get("fear_and_greed", {})
        score = round(float(fg.get("score", 50)), 1)
        rating = fg.get("rating", "Neutral").replace("_", " ").title()
        return {"score": score, "rating": rating}
    except Exception as e:
        print(f"  Fear & Greed failed: {e}")
        return None


def fetch_naaim():
    try:
        from bs4 import BeautifulSoup
        r = requests.get("https://www.naaim.org/programs/naaim-exposure-index/", timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        table = soup.find("table")
        if not table:
            return None
        for row in table.find_all("tr")[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all("td")]
            if len(cells) >= 2:
                for cell in cells[1:]:
                    try:
                        val = float(cell.replace(",", ""))
                        if -200 <= val <= 300:
                            return {"value": round(val, 1), "date": cells[0]}
                    except ValueError:
                        continue
        return None
    except Exception as e:
        print(f"  NAAIM failed: {e}")
        return None


def compute_sp500_breadth():
    try:
        from bs4 import BeautifulSoup
        r = requests.get(
            "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies",
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "html.parser")
        table = soup.find("table", {"id": "constituents"}) or soup.find("table")
        tickers = []
        for row in table.find_all("tr")[1:]:
            cells = row.find_all("td")
            if cells:
                tickers.append(cells[0].get_text(strip=True).replace(".", "-"))
        if not tickers:
            return None
        raw = yf.download(tickers, period="1y", interval="1d", auto_adjust=True, progress=False, threads=True)
        if raw.empty:
            return None
        close = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw
        close = close.dropna(axis=1, how="all").ffill()
        if len(close) < 5:
            return None
        last, prev = close.iloc[-1], close.iloc[-2]
        changes = last - prev
        advancers = int((changes > 0).sum())
        decliners = int((changes < 0).sum())
        window = close.iloc[-252:] if len(close) >= 252 else close
        hi52, lo52 = window.max(), window.min()
        new_highs = int((last >= hi52 * 0.99).sum())
        new_lows = int((last <= lo52 * 1.01).sum())

        def pct_above(n):
            if len(close) < n:
                return 0.0
            sma = close.rolling(n).mean().iloc[-1]
            valid = sma.dropna()
            if valid.empty:
                return 0.0
            return round(float((last[valid.index] > valid).sum()) / len(valid) * 100, 1)

        return {
            "advance_decline": {"advancers": advancers, "decliners": decliners},
            "new_high_low": {"new_highs": new_highs, "new_lows": new_lows},
            "pct_above_sma20": pct_above(20),
            "pct_above_sma50": pct_above(50),
            "pct_above_sma200": pct_above(200),
        }
    except Exception as e:
        print(f"  S&P breadth failed: {e}")
        return None


def fetch_breadth():
    fg = fetch_fear_greed()
    nm = fetch_naaim()
    sp = compute_sp500_breadth()
    return {
        "fear_greed": fg,
        "naaim": nm,
        "advance_decline": sp.get("advance_decline") if sp else None,
        "new_high_low": sp.get("new_high_low") if sp else None,
        "pct_above_sma20": sp.get("pct_above_sma20") if sp else None,
        "pct_above_sma50": sp.get("pct_above_sma50") if sp else None,
        "pct_above_sma200": sp.get("pct_above_sma200") if sp else None,
    }


def main():
    parser = argparse.ArgumentParser(description="Build market dashboard data")
    parser.add_argument("--out-dir", type=str, default="data", help="Output directory (default: data)")
    args = parser.parse_args()
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "data.json"
    events_path = out_dir / "events.json"

    cfg = load_config()
    # Normalize keys to match output keys (etfmain, sector, etc.)
    section_tickers = {
        "etfmain": cfg.get("etfmain", DEFAULT_TICKERS["etfmain"]),
        "submarket": cfg.get("submarket", DEFAULT_TICKERS["submarket"]),
        "sector": cfg.get("sectors", DEFAULT_TICKERS["sectors"]),
        "sectorew": cfg.get("sectors_ew", DEFAULT_TICKERS["sectors_ew"]),
        "thematic": cfg.get("thematic", DEFAULT_TICKERS["thematic"]),
        "country": cfg.get("country", DEFAULT_TICKERS["country"]),
        "futures": cfg.get("futures", DEFAULT_TICKERS["futures"]),
        "metals": cfg.get("metals", DEFAULT_TICKERS["metals"]),
        "energy": cfg.get("energy", DEFAULT_TICKERS["energy"]),
        "global": cfg.get("global", DEFAULT_TICKERS["global"]),
        "yields": cfg.get("yields", DEFAULT_TICKERS["yields"]),
        "dxvix": cfg.get("dxvix", DEFAULT_TICKERS["dxvix"]),
        "crypto": cfg.get("crypto", DEFAULT_TICKERS["crypto"]),
    }

    # GMT timestamp
    generated_at = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    existing = {}
    if out_path.exists():
        try:
            with open(out_path, encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            pass

    output = {
        "generated_at": generated_at,
        "futures": [],
        "dxvix": [],
        "metals": [],
        "energy": [],
        "yields": [],
        "global": [],
        "etfmain": [],
        "submarket": [],
        "sector": [],
        "sectorew": [],
        "thematic": [],
        "country": [],
        "crypto": [],
        "holdings": existing.get("holdings", {}),
        "breadth": existing.get("breadth", {}),
        "events": [],
    }

    # Macro: futures, metals, energy, dxvix, yields, global, crypto (non-equity)
    for key in ["futures", "metals", "energy", "dxvix", "yields", "global", "crypto"]:
        tickers = section_tickers[key]
        if not tickers:
            continue
        print(f"Fetching {key}...")
        raw = fetch_batch_yf(tickers)
        for sym in tickers:
            df = raw.get(sym)
            if df is not None:
                rec = extract_metrics_non_equity(df, sym)
                if rec:
                    output[key].append(rec)
        time.sleep(0.5)

    # Order dxvix: DXY then VIX
    if output["dxvix"]:
        order = {"DX-Y.NYB": 0, "CBOE:VIX": 1}
        output["dxvix"].sort(key=lambda x: order.get(x.get("sym", ""), 99))

    # Equities: with Grade, ATR%, ATRx, VARS. Need SPY for VARS.
    spy_closes = None
    equity_keys = ["etfmain", "submarket", "sector", "sectorew", "thematic", "country"]
    all_equity_tickers = []
    for k in equity_keys:
        all_equity_tickers.extend(section_tickers[k])
    all_equity_tickers = list(dict.fromkeys(all_equity_tickers))
    if "SPY" in all_equity_tickers:
        spy_raw = fetch_batch_yf(["SPY"])
        if "SPY" in spy_raw:
            spy_closes = spy_raw["SPY"].dropna(subset=["Close"])["Close"].values.tolist()

    for key in equity_keys:
        tickers = section_tickers[key]
        if not tickers:
            continue
        print(f"Fetching {key} (equities)...")
        raw = fetch_batch_yf(tickers)
        for sym in tickers:
            df = raw.get(sym)
            if df is not None:
                rec = extract_equity_metrics(df, sym, spy_closes=spy_closes)
                if rec:
                    output[key].append(rec)
        time.sleep(0.5)

    # Sort by 1W
    for key in ["country", "sector", "sectorew", "thematic", "submarket"]:
        output[key].sort(key=lambda x: x.get("w1", 0), reverse=True)

    # Holdings
    holdings_tickers = list(dict.fromkeys(
        section_tickers["etfmain"] + section_tickers["submarket"] + section_tickers["sector"]
        + section_tickers["sectorew"] + section_tickers["thematic"] + section_tickers["country"]
    ))
    print("Fetching ETF holdings...")
    output["holdings"] = fetch_etf_holdings(holdings_tickers)

    # Breadth & sentiment
    print("Fetching breadth & sentiment...")
    output["breadth"] = fetch_breadth()

    # Macro events
    print("Fetching macro events...")
    output["events"] = fetch_macro_events()
    with open(events_path, "w", encoding="utf-8") as f:
        json.dump(output["events"], f, indent=2)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {out_path} and {events_path}")
    print(f"Generated at: {generated_at} UTC (GMT)")


if __name__ == "__main__":
    main()
