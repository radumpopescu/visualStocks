import argparse
import datetime as _dt
import io
import os
from pathlib import Path
from typing import Optional, Tuple

import matplotlib.pyplot as plt
import pandas as pd
import requests

# --------------------------- Configuration --------------------------- #
CACHE_DIR = Path(".") / ".stooq_cache"  # Changed from Path.home()
CACHE_DIR.mkdir(parents=True, exist_ok=True)

STOOQ_URL_TEMPLATE = "https://stooq.com/q/d/l/?s={ticker}.us&i=d"

# -------------------------------------------------------------------- #

def _fetch_stooq_csv(ticker: str) -> pd.DataFrame:
    """Download daily OHLC data from Stooq and return as DataFrame."""
    url = STOOQ_URL_TEMPLATE.format(ticker=ticker.lower())
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"Failed to download data for {ticker}: {exc}")
    return pd.read_csv(io.StringIO(resp.text), parse_dates=["Date"])


def load_data(ticker: str, force_refresh: bool = False) -> pd.DataFrame:
    """Load daily data from cache or download if necessary.

    Parameters
    ----------
    ticker : str
        Stock symbol (just the root, e.g. "TSLA", "AAPL").
    force_refresh : bool, optional
        Skip cache completely and redownload.
    """
    cache_file = CACHE_DIR / f"{ticker.upper()}_daily.csv"

    if force_refresh or not cache_file.exists():
        df_remote = _fetch_stooq_csv(ticker)
        df_remote.to_csv(cache_file, index=False)
        return df_remote

    df_cache = pd.read_csv(cache_file, parse_dates=["Date"])

    # See if we need to append newer rows
    try:
        df_remote_new = _fetch_stooq_csv(ticker)
    except Exception:
        # If remote down, silently keep cache
        return df_cache

    last_cached = df_cache["Date"].max()
    df_new_rows = df_remote_new[df_remote_new["Date"] > last_cached]
    if not df_new_rows.empty:
        df_cache = pd.concat([df_cache, df_new_rows]).reset_index(drop=True)
        df_cache.to_csv(cache_file, index=False)
    return df_cache


def subset_and_augment(
    df: pd.DataFrame,
    start: Optional[_dt.date] = None,
    end: Optional[_dt.date] = None,
) -> pd.DataFrame:
    """Filter by date range and compute % daily change."""
    if start is None:
        start = df["Date"].min().date()
    if end is None:
        end = df["Date"].max().date()

    mask = (df["Date"].dt.date >= start) & (df["Date"].dt.date <= end)
    working = df.loc[mask].copy()
    working["PctChange"] = working["Close"].pct_change() * 100
    return working.dropna(subset=["PctChange"]).reset_index(drop=True)


def plot_pct_change(
    df: pd.DataFrame,
    ticker: str,
    high_thresh: float = 10.0,
    low_thresh: float = -10.0,
    sort_order: str = "none",  # none / asc / desc
):
    """Create a bar plot of daily % change.

    Parameters
    ----------
    df : DataFrame
        Output from `subset_and_augment`.
    ticker : str
        For plot title.
    high_thresh, low_thresh : float
        Thresholds used only for annotation counts in title.
    sort_order : str
        If "asc" or "desc", sort by PctChange accordingly.
    """
    if sort_order in {"asc", "desc"}:
        df = df.sort_values("PctChange", ascending=(sort_order == "asc"))
    # Plot
    fig, ax = plt.subplots(figsize=(11, 4.5))
    ax.bar(df["Date"].dt.strftime("%Y-%m-%d"), df["PctChange"])
    ax.set_xticklabels(df["Date"].dt.strftime("%Y-%m-%d"), rotation=90)
    ax.set_ylabel("% daily change (close vs prev close)")
    high_cnt = (df["PctChange"] > high_thresh).sum()
    low_cnt = (df["PctChange"] < low_thresh).sum()
    ax.set_title(
        f"{ticker.upper()} – Daily % Change\nDays > {high_thresh}%: {high_cnt}   Days < {low_thresh}%: {low_cnt}"
    )
    plt.tight_layout()
    return fig


# ======================= Gradio Front‑end ============================ #

def _launch_gradio():
    import gradio as gr

    def run_app(
        ticker: str,
        start_date: str,
        end_date: str,
        sort: str,
        high_thresh: float,
        low_thresh: float,
        refresh: bool,
    ):
        df_full = load_data(ticker, force_refresh=refresh)
        df_sub = subset_and_augment(
            df_full,
            start=_dt.datetime.strptime(start_date, "%Y-%m-%d").date(),
            end=_dt.datetime.strptime(end_date, "%Y-%m-%d").date(),
        )
        fig = plot_pct_change(df_sub, ticker, high_thresh, low_thresh, sort)
        return fig

    today = _dt.date.today()
    default_start = today - _dt.timedelta(days=60)

    with gr.Blocks(theme=gr.themes.Base()) as demo:
        gr.Markdown("## Stock Daily %‑Change Visualizer")
        with gr.Row():
            ticker_in = gr.Textbox(value="TSLA", label="Ticker (Stooq code)")
            start_in = gr.Textbox(value=default_start.isoformat(), label="Start (YYYY‑MM‑DD)")
            end_in = gr.Textbox(value=today.isoformat(), label="End (YYYY‑MM‑DD)")
            sort_in = gr.Dropdown(["none", "asc", "desc"], value="none", label="Sort by % change")
        with gr.Row():
            high_in = gr.Number(value=10.0, label="High threshold (%)")
            low_in = gr.Number(value=-10.0, label="Low threshold (%)")
            refresh_in = gr.Checkbox(label="Force refresh from Stooq", value=False)
        run_btn = gr.Button("Generate")
        plot_out = gr.Plot(label="Daily % change chart")
        run_btn.click(
            fn=run_app,
            inputs=[ticker_in, start_in, end_in, sort_in, high_in, low_in, refresh_in],
            outputs=plot_out,
        )
    demo.launch()


# ========================= CLI Interface ============================ #

def _parse_args():
    ap = argparse.ArgumentParser(description="Plot daily % change for a stock from Stooq data.")
    ap.add_argument("-t", "--ticker", default="TSLA", help="Ticker symbol (default TSLA)")
    ap.add_argument("-s", "--start", default=None, help="Start date YYYY-MM-DD")
    ap.add_argument("-e", "--end", default=None, help="End date YYYY-MM-DD")
    ap.add_argument("-o", "--order", choices=["none", "asc", "desc"], default="none", help="Sort by % change")
    ap.add_argument("--high", type=float, default=10.0, help="High threshold for annotation (%)")
    ap.add_argument("--low", type=float, default=-10.0, help="Low threshold for annotation (%)")
    ap.add_argument("--refresh", action="store_true", help="Force refresh cache from remote")
    ap.add_argument("--ui", action="store_true", help="Launch Gradio web UI")
    return ap.parse_args()


# =============================== main =============================== #

def main():
    args = _parse_args()

    if args.ui:
        _launch_gradio()
        return

    # CLI mode
    df_full = load_data(args.ticker, force_refresh=args.refresh)
    start_dt = _dt.datetime.strptime(args.start, "%Y-%m-%d").date() if args.start else None
    end_dt = _dt.datetime.strptime(args.end, "%Y-%m-%d").date() if args.end else None
    df_sub = subset_and_augment(df_full, start=start_dt, end=end_dt)
    fig = plot_pct_change(
        df_sub,
        args.ticker,
        high_thresh=args.high,
        low_thresh=args.low,
        sort_order=args.order,
    )
    plt.show()


if __name__ == "__main__":
    main()
