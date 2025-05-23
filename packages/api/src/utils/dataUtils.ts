import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { parse } from 'csv-parse/sync';

// Configuration
const CACHE_DIR = process.env.CACHE_DIR || path.join(__dirname, './data');
const STOOQ_URL_TEMPLATE = process.env.STOOQ_URL || 'https://stooq.com/q/d/l/?s={ticker}.us&i=d';
const DEFAULT_TICKER = process.env.TICKER || 'TSLA';
const METADATA_FILE = path.join(CACHE_DIR, 'metadata.json');

// Types
interface StockData {
  Date: Date;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
  Year?: number;
  Month?: number;
  Day?: number;
  Weekday?: number;
  Return?: number;
}

interface MonthlyReturn {
  Year: number;
  Month: number;
  Return: number;
}

interface DailyReturn {
  Date: Date;
  Year: number;
  Month: number;
  Day: number;
  Weekday: number;
  Return: number;
}

interface FormattedMonthlyReturns {
  years: number[];
  data: Record<string, (number | null)[]>;
  ticker: string;
}

interface DailyCalendarData {
  return: number;
  weekday: number;
}

interface FormattedDailyReturns {
  years: number[];
  data: Record<string, Record<string, DailyCalendarData[] | null>>;
  ticker: string;
}

/**
 * Fetch stock data from Stooq
 */
async function fetchStooqData(ticker: string): Promise<StockData[]> {
  const url = STOOQ_URL_TEMPLATE.replace('{ticker}', ticker.toLowerCase());

  try {
    const response = await axios.get(url, { timeout: 30000 });

    // Check for rate limit response
    if (response.data.includes('Exceeded the daily hits limit')) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    // Parse CSV data
    const records = parse(response.data, {
      columns: true,
      skip_empty_lines: true,
    });

    // Check if we got valid data
    if (!records || records.length === 0) {
      throw new Error('NO_DATA_RETURNED');
    }

    // Convert to proper types
    return records.map((record: any) => ({
      Date: new Date(record.Date),
      Open: parseFloat(record.Open),
      High: parseFloat(record.High),
      Low: parseFloat(record.Low),
      Close: parseFloat(record.Close),
      Volume: parseInt(record.Volume, 10),
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT_EXCEEDED') {
      throw new Error(`Rate limit exceeded for Stooq API when fetching ${ticker}. Try again later.`);
    }
    if (error instanceof Error && error.message === 'NO_DATA_RETURNED') {
      throw new Error(`No data returned from Stooq for ${ticker}.`);
    }
    throw new Error(`Failed to download data for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load data from cache or download if necessary
 */
/**
 * Get metadata about data refresh times
 */
interface RefreshMetadata {
  lastUpdated: {
    [ticker: string]: {
      timestamp: number;
    };
  };
}

function getMetadata(): RefreshMetadata {
  try {
    // Ensure cache directory exists
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // Create metadata file if it doesn't exist
    if (!fs.existsSync(METADATA_FILE)) {
      const initialMetadata: RefreshMetadata = {
        lastUpdated: {
          [DEFAULT_TICKER]: {
            timestamp: 0,
          },
        },
      };
      fs.writeFileSync(METADATA_FILE, JSON.stringify(initialMetadata, null, 2));
      return initialMetadata;
    }

    // Read and parse metadata file
    const metadataContent = fs.readFileSync(METADATA_FILE, 'utf-8');
    return JSON.parse(metadataContent) as RefreshMetadata;
  } catch (error) {
    console.error('Error reading metadata:', error);
    // Return default metadata if there's an error
    return {
      lastUpdated: {
        [DEFAULT_TICKER]: {
          timestamp: 0,
        },
      },
    };
  }
}

/**
 * Update metadata with new refresh timestamp
 */
function updateMetadata(ticker: string): void {
  try {
    const metadata = getMetadata();

    // Update timestamp for ticker
    metadata.lastUpdated[ticker.toUpperCase()] = {
      timestamp: Date.now(),
    };

    // Write updated metadata to file
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
  } catch (error) {
    console.error('Error updating metadata:', error);
  }
}

/**
 * Check if data needs to be refreshed based on metadata
 */
function shouldRefreshData(ticker: string): boolean {
  try {
    const metadata = getMetadata();
    const tickerData = metadata.lastUpdated[ticker.toUpperCase()];

    if (!tickerData) return true;

    // Check if last refresh was more than 24 hours ago
    const oneDayMs = 24 * 60 * 60 * 1000;
    return Date.now() - tickerData.timestamp > oneDayMs;
  } catch (error) {
    console.error('Error checking refresh status:', error);
    return true; // Default to refreshing if there's an error
  }
}

export async function loadData(ticker: string, forceRefresh = false): Promise<StockData[]> {
  // Ensure cache directory exists
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  const upperTicker = ticker.toUpperCase();
  const cacheFile = path.join(CACHE_DIR, `${upperTicker}_daily.csv`);

  // Check if we should refresh based on metadata
  const shouldRefresh = shouldRefreshData(upperTicker);

  // Check if cache exists
  const cacheExists = fs.existsSync(cacheFile);

  // Try to fetch fresh data if needed
  if (forceRefresh || !cacheExists || shouldRefresh) {
    try {
      const data = await fetchStooqData(upperTicker);

      // Only save to cache if we got valid data
      if (data && data.length > 0) {
        // Save to cache
        const csvContent = [
          'Date,Open,High,Low,Close,Volume',
          ...data.map((row) => `${row.Date.toISOString().split('T')[0]},${row.Open},${row.High},${row.Low},${row.Close},${row.Volume}`),
        ].join('\n');

        fs.writeFileSync(cacheFile, csvContent);

        // Update metadata
        updateMetadata(upperTicker);
        return data;
      } else if (cacheExists) {
        // If no data returned but cache exists, use cache
        console.log(`No data returned for ${upperTicker}, using cached data`);
      } else {
        // No data and no cache
        throw new Error(`No data found for ticker ${upperTicker}`);
      }
    } catch (error) {
      // If fetch fails but we have cache, use it
      if (cacheExists) {
        console.error(`Error fetching fresh data for ${upperTicker}, using cached data:`, error);
      } else {
        // No cache and fetch failed
        throw error;
      }
    }
  }

  // If we reach here, we're using cached data
  if (!cacheExists) {
    throw new Error(`No cached data found for ticker ${upperTicker}`);
  }

  // Read from cache
  const csvContent = fs.readFileSync(cacheFile, 'utf-8');

  // Check if the file has content beyond the header
  if (csvContent.trim().split('\n').length <= 1) {
    throw new Error(`No data found in cache for ticker ${upperTicker}`);
  }

  const cachedData = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  }).map((record: any) => ({
    Date: new Date(record.Date),
    Open: parseFloat(record.Open),
    High: parseFloat(record.High),
    Low: parseFloat(record.Low),
    Close: parseFloat(record.Close),
    Volume: parseInt(record.Volume, 10),
  }));

  // Check if we have valid data in the cache
  if (!cachedData || cachedData.length === 0) {
    throw new Error(`No valid data found in cache for ticker ${upperTicker}`);
  }

  // Try to update with newer data if not forcing refresh
  if (!forceRefresh) {
    try {
      // Check for newer data
      const remoteData = await fetchStooqData(ticker);

      // Find the latest date in cached data
      const latestCachedDate = new Date(Math.max(...cachedData.map((item: StockData) => new Date(item.Date).getTime())));

      // Filter remote data for newer entries
      const newData = remoteData.filter((item: StockData) => new Date(item.Date) > latestCachedDate);

      if (newData.length > 0) {
        // Append new data to cached data
        const updatedData = [...cachedData, ...newData];

        // Sort by date
        updatedData.sort((a, b) => a.Date.getTime() - b.Date.getTime());

        // Save updated data to cache
        const updatedCsvContent = [
          'Date,Open,High,Low,Close,Volume',
          ...updatedData.map(
            (row) => `${row.Date.toISOString().split('T')[0]},${row.Open},${row.High},${row.Low},${row.Close},${row.Volume}`,
          ),
        ].join('\n');

        fs.writeFileSync(cacheFile, updatedCsvContent);

        // Update metadata
        updateMetadata(upperTicker);
        return updatedData;
      }
    } catch (error) {
      // If checking for newer data fails, just use cached data
      console.error(`Failed to check for newer data for ${upperTicker}:`, error);
    }
  }

  return cachedData;
}

/**
 * Calculate monthly returns from daily data
 */
export function calculateMonthlyReturns(data: StockData[]): MonthlyReturn[] {
  // Sort data by date
  const sortedData = [...data].sort((a, b) => a.Date.getTime() - b.Date.getTime());

  // Extract year and month
  sortedData.forEach((item) => {
    item.Year = item.Date.getFullYear();
    item.Month = item.Date.getMonth() + 1; // JavaScript months are 0-indexed
  });

  // Group by year and month
  const monthlyGroups: Record<string, StockData[]> = {};

  sortedData.forEach((item) => {
    const key = `${item.Year}-${item.Month}`;
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = [];
    }
    monthlyGroups[key].push(item);
  });

  // Calculate monthly returns
  const monthlyReturns: MonthlyReturn[] = [];

  Object.entries(monthlyGroups).forEach(([key, group]) => {
    if (group.length >= 2) {
      const [year, month] = key.split('-').map(Number);
      const firstClose = group[0].Close;
      const lastClose = group[group.length - 1].Close;

      if (firstClose > 0) {
        const monthlyReturn = (lastClose / firstClose - 1) * 100;
        monthlyReturns.push({
          Year: year,
          Month: month,
          Return: monthlyReturn,
        });
      }
    }
  });

  return monthlyReturns;
}

/**
 * Calculate daily returns from daily data
 */
export function calculateDailyReturns(data: StockData[]): DailyReturn[] {
  // Sort data by date
  const sortedData = [...data].sort((a, b) => a.Date.getTime() - b.Date.getTime());

  // Calculate daily returns
  const dailyReturns: DailyReturn[] = [];

  for (let i = 1; i < sortedData.length; i++) {
    const prevDay = sortedData[i - 1];
    const currentDay = sortedData[i];

    if (prevDay.Close > 0) {
      const dailyReturn = (currentDay.Close / prevDay.Close - 1) * 100;

      dailyReturns.push({
        Date: currentDay.Date,
        Year: currentDay.Date.getFullYear(),
        Month: currentDay.Date.getMonth() + 1,
        Day: currentDay.Date.getDate(),
        Weekday: currentDay.Date.getDay(),
        Return: dailyReturn,
      });
    }
  }

  return dailyReturns;
}

/**
 * Format monthly returns for frontend
 */
export function formatMonthlyReturns(monthlyData: MonthlyReturn[]): FormattedMonthlyReturns {
  // Get unique years
  const years = [...new Set(monthlyData.map((item) => item.Year))].sort();

  // Create data structure
  const result: FormattedMonthlyReturns = {
    years,
    data: {},
    ticker: DEFAULT_TICKER,
  };

  // Initialize month arrays
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total'];
  monthNames.forEach((month) => {
    result.data[month] = Array(years.length).fill(null);
  });

  // Fill in monthly returns
  monthlyData.forEach((item) => {
    const yearIndex = years.indexOf(item.Year);
    if (yearIndex !== -1) {
      const monthName = new Date(2000, item.Month - 1, 1).toLocaleString('en-US', { month: 'short' });
      result.data[monthName][yearIndex] = item.Return;
    }
  });

  // Calculate yearly totals
  years.forEach((year, index) => {
    const yearData = monthlyData.filter((item) => item.Year === year);
    if (yearData.length > 0) {
      // Calculate compound return
      const compoundReturn =
        yearData.reduce((acc, item) => {
          return acc * (1 + item.Return / 100);
        }, 1) - 1;

      result.data['Total'][index] = compoundReturn * 100;
    }
  });

  return result;
}

/**
 * Format daily returns for frontend
 */
export function formatDailyReturns(dailyData: DailyReturn[]): FormattedDailyReturns {
  // Get unique years
  const years = [...new Set(dailyData.map((item) => item.Year))].sort();

  // Create result structure
  const result: FormattedDailyReturns = {
    years,
    data: {},
    ticker: DEFAULT_TICKER,
  };

  // Initialize year and month structure
  years.forEach((year) => {
    result.data[year] = {};
  });

  // Group by year and month
  dailyData.forEach((item) => {
    const year = item.Year;
    const monthName = new Date(2000, item.Month - 1, 1).toLocaleString('en-US', { month: 'short' });

    if (!result.data[year][monthName]) {
      // Create array for days in month
      const daysInMonth = new Date(year, item.Month, 0).getDate();
      result.data[year][monthName] = Array(daysInMonth).fill(null);
    }

    // Add daily return data
    const dayIndex = item.Day - 1;
    if (dayIndex >= 0 && dayIndex < result.data[year][monthName].length) {
      result.data[year][monthName][dayIndex] = {
        return: item.Return,
        weekday: item.Weekday,
      };
    }
  });

  return result;
}
