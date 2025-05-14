#!/usr/bin/env python3
import argparse
import datetime as dt
import io
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import numpy as np
import pandas as pd
import requests
from flask import Flask, jsonify, render_template, request, send_from_directory

# --------------------------- Configuration --------------------------- #
CACHE_DIR = Path(os.environ.get("CACHE_DIR", "."))  # Cache directory from env or current directory
STOOQ_URL_TEMPLATE = os.environ.get("STOOQ_URL", "https://stooq.com/q/d/l/?s={ticker}.us&i=d")
DEFAULT_TICKER = os.environ.get("TICKER", "TSLA")
DEFAULT_PORT = int(os.environ.get("PORT", 8080))

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


def calculate_monthly_returns(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate monthly returns from daily data.

    Returns a DataFrame with monthly returns indexed by year and month.
    """
    # Make sure data is sorted by date
    df = df.sort_values("Date")

    # Extract year and month
    df["Year"] = df["Date"].dt.year
    df["Month"] = df["Date"].dt.month

    # Group by year and month, and calculate returns
    def safe_return(x):
        if len(x) < 2:  # Need at least 2 points for a return
            return np.nan
        try:
            return x.iloc[-1] / x.iloc[0] - 1  # Monthly return
        except (ZeroDivisionError, IndexError):
            return np.nan

    monthly_data = df.groupby(["Year", "Month"]).agg({
        "Close": safe_return  # Monthly return with error handling
    })

    # Convert to percentage
    monthly_data["Return"] = monthly_data["Close"] * 100
    monthly_data = monthly_data.drop(columns=["Close"])

    return monthly_data


def calculate_daily_returns(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate daily returns from daily data.

    Returns a DataFrame with daily returns.
    """
    # Make sure data is sorted by date
    df = df.sort_values("Date")

    # Calculate daily returns
    df["Return"] = df["Close"].pct_change() * 100

    # Extract date components
    df["Year"] = df["Date"].dt.year
    df["Month"] = df["Date"].dt.month
    df["Day"] = df["Date"].dt.day
    df["Weekday"] = df["Date"].dt.weekday  # Monday=0, Sunday=6

    # Drop the first row (NaN return)
    df = df.dropna(subset=["Return"])

    return df[["Date", "Year", "Month", "Day", "Weekday", "Return"]]


def format_daily_returns(daily_data: pd.DataFrame) -> Dict:
    """Format daily returns data for the frontend calendar visualization."""
    # Group by year and month to create a calendar structure
    result = {
        "years": sorted(daily_data["Year"].unique().tolist()),
        "data": {}
    }

    # Process each year
    for year in result["years"]:
        year_data = daily_data[daily_data["Year"] == year]
        result["data"][str(year)] = {}

        # Process each month in the year
        for month in range(1, 13):
            month_name = dt.date(2000, month, 1).strftime("%b")
            month_data = year_data[year_data["Month"] == month]

            if not month_data.empty:
                # Create a calendar grid for the month
                # Initialize with None for all days
                days_in_month = pd.Timestamp(year=year, month=month, day=1).days_in_month
                calendar_data = [None] * days_in_month

                # Fill in the data we have
                for _, row in month_data.iterrows():
                    day_idx = row["Day"] - 1  # Convert to 0-based index
                    if 0 <= day_idx < days_in_month:
                        calendar_data[day_idx] = {
                            "return": float(row["Return"]),
                            "weekday": int(row["Weekday"])
                        }

                result["data"][str(year)][month_name] = calendar_data

    return result


def format_monthly_returns(monthly_data: pd.DataFrame) -> Dict:
    """Format monthly returns data for the frontend."""
    # Pivot the data to get years as rows and months as columns
    pivot_data = monthly_data.reset_index().pivot(
        index="Year", columns="Month", values="Return"
    )

    # Calculate yearly totals
    yearly_totals = []
    for year in pivot_data.index:
        year_data = pivot_data.loc[year]
        # Calculate compound return for the year
        # (1 + r1) * (1 + r2) * ... * (1 + r12) - 1
        non_null_returns = year_data.dropna().values / 100
        if len(non_null_returns) > 0:
            compound_return = np.prod(1 + non_null_returns) - 1
            yearly_totals.append(compound_return * 100)
        else:
            yearly_totals.append(None)  # Use None instead of np.nan

    pivot_data["Total"] = yearly_totals

    # Convert to dictionary for JSON serialization
    result = {
        "years": pivot_data.index.tolist(),
        "data": {}
    }

    # Add monthly data, replacing NaN with None for proper JSON serialization
    for month in range(1, 13):
        if month in pivot_data.columns:
            month_name = dt.date(2000, month, 1).strftime("%b")
            # Convert NaN to None for JSON serialization
            month_data = pivot_data[month].tolist()
            result["data"][month_name] = [None if pd.isna(x) else x for x in month_data]

    # Add totals, replacing NaN with None
    total_data = pivot_data["Total"].tolist()
    result["data"]["Total"] = [None if pd.isna(x) else x for x in total_data]

    return result


# ======================= Flask App ============================ #

app = Flask(__name__, static_folder="static", template_folder="templates")

@app.route("/")
def index():
    """Serve the main page (monthly returns)."""
    return render_template("monthly_returns.html")

@app.route("/daily")
def daily():
    """Serve the daily returns page."""
    return render_template("daily_returns.html")

@app.route("/api/monthly-returns")
def api_monthly_returns():
    """API endpoint to get monthly returns data."""
    ticker = request.args.get("ticker", DEFAULT_TICKER)
    refresh = request.args.get("refresh", "false").lower() == "true"

    try:
        # Load data
        df = load_data(ticker, force_refresh=refresh)

        # Calculate monthly returns
        monthly_data = calculate_monthly_returns(df)

        # Format data for frontend
        result = format_monthly_returns(monthly_data)
        result["ticker"] = ticker.upper()

        # Use Flask's jsonify which handles None values properly
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/daily-returns")
def api_daily_returns():
    """API endpoint to get daily returns data."""
    ticker = request.args.get("ticker", DEFAULT_TICKER)
    refresh = request.args.get("refresh", "false").lower() == "true"

    try:
        # Load data
        df = load_data(ticker, force_refresh=refresh)

        # Calculate daily returns
        daily_data = calculate_daily_returns(df)

        # Format data for frontend
        result = format_daily_returns(daily_data)
        result["ticker"] = ticker.upper()

        # Use Flask's jsonify which handles None values properly
        return jsonify(result)
    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/static/<path:path>")
def serve_static(path):
    """Serve static files."""
    return send_from_directory("static", path)

@app.route("/health")
def health_check():
    """Health check endpoint for Docker."""
    return jsonify({"status": "healthy", "timestamp": dt.datetime.now().isoformat()})

def create_directories():
    """Create necessary directories if they don't exist."""
    # Create templates directory
    templates_dir = Path("templates")
    templates_dir.mkdir(exist_ok=True)

    # Create static directory
    static_dir = Path("static")
    static_dir.mkdir(exist_ok=True)

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Monthly returns visualization server")
    parser.add_argument("-p", "--port", type=int, default=DEFAULT_PORT,
                        help=f"Port to run the server on (default: {DEFAULT_PORT})")
    parser.add_argument("-t", "--ticker", default=DEFAULT_TICKER,
                        help=f"Default ticker symbol (default: {DEFAULT_TICKER})")
    parser.add_argument("--debug", action="store_true",
                        help="Run in debug mode")

    args = parser.parse_args()

    # Create necessary directories
    create_directories()

    # Use environment variables if available, otherwise use command line args
    port = int(os.environ.get("PORT", args.port))
    debug = os.environ.get("DEBUG", "").lower() == "true" or args.debug

    print(f"Starting server on port {port}...")
    print(f"Open your browser and navigate to http://localhost:{port}")
    print(f"Default ticker: {DEFAULT_TICKER}")
    print(f"Cache directory: {CACHE_DIR}")
    print("Press Ctrl+C to stop the server")

    try:
        # Run the Flask app
        app.run(host="0.0.0.0", port=port, debug=debug)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
    except Exception as e:
        print(f"\nError: {e}")
        return 1

    return 0

if __name__ == "__main__":
    import sys
    sys.exit(main())
