# Monthly Returns Visualization

This application creates visualizations of stock returns, with color gradation from worst to best to easily spot seasonal factors.

## Features

- Fetches stock data from Stooq API
- Caches data locally to reduce API calls
- Calculates monthly and daily returns with dividend adjustments
- Displays results in a responsive table with color gradation
- Modern UI using Tailwind CSS
- Docker support for easy deployment

## Views

- **Monthly View**: Shows monthly returns in a table format
- **Daily View**: Shows daily returns in a calendar format with color coding

## Running with Docker (Recommended)

### Prerequisites

- Docker
- Docker Compose

### Quick Start

1. Clone or download this repository
2. Run the application using Docker Compose:

```bash
docker-compose up -d
```

3. Open your browser and navigate to:

```
http://localhost:8080
```

### Docker Helper Script

A helper script is provided to make Docker operations easier:

```bash
# Start the application
./docker-run.sh start

# View logs
./docker-run.sh logs

# Stop the application
./docker-run.sh stop

# Rebuild the application
./docker-run.sh build

# Open a shell in the container
./docker-run.sh shell
```

### Docker Configuration

The application is configured to:

- Automatically restart if it crashes
- Use health checks to monitor the application
- Store cache data in a persistent volume
- Limit resource usage to prevent container issues

## Running without Docker

### Requirements

- Python 3.6+
- Required packages: flask, pandas, numpy, requests

### Installation

1. Clone or download this repository
2. Install the required packages:

```bash
pip install -r requirements.txt
```

### Usage

Run the script:

```bash
python monthly_returns.py
```

This will start a web server on port 8080. Open your browser and navigate to:

```
http://localhost:8080
```

### Command Line Options

- `-p, --port`: Specify the port to run the server on (default: 8080)
- `-t, --ticker`: Set the default ticker symbol (default: TSLA)
- `--debug`: Run in debug mode

Example:

```bash
python monthly_returns.py --port 5000 --ticker AAPL
```

## How It Works

1. The script fetches daily stock data from Stooq API
2. Data is cached locally to reduce API calls
3. Monthly and daily returns are calculated from the daily data
4. The web interface displays the returns with color gradation
5. Green cells represent positive returns, red cells represent negative returns
6. The intensity of the color indicates the magnitude of the return

## Data Caching

Data is cached in CSV files. The cache files are named `{TICKER}_daily.csv`.

To force a refresh of the data, click the "Refresh Data" button in the web interface.

## Environment Variables

The application can be configured using environment variables:

- `PORT`: The port to run the server on (default: 8080)
- `TICKER`: The default ticker symbol (default: TSLA)
- `CACHE_DIR`: The directory to store cache files (default: current directory)
- `DEBUG`: Enable debug mode if set to "true" (default: false)
