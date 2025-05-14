import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import getSocket from './socket';
import { socketRequestWithId } from './socketRequestWithId';

const socket = getSocket();

// Types for monthly returns data
interface MonthlyReturnsData {
  years: number[];
  data: Record<string, (number | null)[]>;
  ticker: string;
}

// Types for daily returns data
interface DailyCalendarData {
  return: number;
  weekday: number;
}

interface DailyReturnsData {
  years: number[];
  data: Record<string, Record<string, DailyCalendarData[] | null>>;
  ticker: string;
}

// Type for refresh metadata
interface RefreshMetadata {
  [ticker: string]: {
    lastRefreshed: number; // timestamp
  };
}

// Default stock tickers
const DEFAULT_STOCKS = ['TSLA', 'AAPL', 'MSFT', 'NVDA', 'MSTR', 'SPY', 'PLTR'];

type StoreType = {
  // Original state
  state: string;
  test: () => Promise<void>;
  createTimestampFile: () => Promise<void>;
  timestampFilePath: string;
  isLoading: boolean;
  error: string | null;

  // Ticker state and actions
  currentTicker: string;
  setTicker: (ticker: string) => void;

  // Comparison mode state and actions
  compareMode: boolean;
  toggleCompareMode: () => void;
  secondaryTicker: string | null;
  setSecondaryTicker: (ticker: string | null) => void;

  // Stock list management
  availableStocks: string[];
  customStocks: string[];
  addCustomStock: (ticker: string) => void;
  removeCustomStock: (ticker: string) => void;

  // Refresh metadata
  refreshMetadata: RefreshMetadata;
  updateRefreshMetadata: (ticker: string) => void;
  shouldRefreshData: (ticker: string) => boolean;

  // Monthly returns state and actions
  monthlyReturnsData: MonthlyReturnsData | null;
  fetchMonthlyReturns: (ticker: string, refresh: boolean) => Promise<MonthlyReturnsData>;
  secondaryMonthlyReturnsData: MonthlyReturnsData | null;
  fetchSecondaryMonthlyReturns: (ticker: string, refresh: boolean) => Promise<MonthlyReturnsData>;

  // Daily returns state and actions
  dailyReturnsData: DailyReturnsData | null;
  fetchDailyReturns: (ticker: string, refresh: boolean) => Promise<DailyReturnsData>;
  secondaryDailyReturnsData: DailyReturnsData | null;
  fetchSecondaryDailyReturns: (ticker: string, refresh: boolean) => Promise<DailyReturnsData>;
};

const useStore = create<StoreType>()(
  persist(
    (set, get) => ({
      // Original state
      state: '',
      timestampFilePath: '',
      isLoading: false,
      error: null,

      // Ticker state
      currentTicker: 'TSLA',
      setTicker: (ticker: string) => {
        set({ currentTicker: ticker.toUpperCase() });
      },

      // Comparison mode state
      compareMode: false,
      toggleCompareMode: () => {
        set((state) => ({ compareMode: !state.compareMode }));
      },
      secondaryTicker: null,
      setSecondaryTicker: (ticker: string | null) => {
        set({ secondaryTicker: ticker ? ticker.toUpperCase() : null });
      },

      // Stock list management
      availableStocks: [...DEFAULT_STOCKS],
      customStocks: [],
      addCustomStock: (ticker: string) => {
        const upperTicker = ticker.toUpperCase();
        set((state) => {
          // Check if stock already exists in default or custom stocks
          if (DEFAULT_STOCKS.includes(upperTicker) || state.customStocks.includes(upperTicker)) {
            return state;
          }

          // Add to custom stocks
          return {
            customStocks: [...state.customStocks, upperTicker],
            availableStocks: [...DEFAULT_STOCKS, ...state.customStocks, upperTicker],
          };
        });
      },
      removeCustomStock: (ticker: string) => {
        const upperTicker = ticker.toUpperCase();
        set((state) => {
          // Skip if it's a default stock or not in custom stocks
          if (DEFAULT_STOCKS.includes(upperTicker) || !state.customStocks.includes(upperTicker)) {
            return state;
          }

          // Remove from custom stocks
          const newCustomStocks = state.customStocks.filter((stock) => stock !== upperTicker);
          return {
            customStocks: newCustomStocks,
            availableStocks: [...DEFAULT_STOCKS, ...newCustomStocks],
          };
        });
      },

      // Refresh metadata
      refreshMetadata: {},
      updateRefreshMetadata: (ticker: string) => {
        set((state) => ({
          refreshMetadata: {
            ...state.refreshMetadata,
            [ticker.toUpperCase()]: {
              lastRefreshed: Date.now(),
            },
          },
        }));
      },
      shouldRefreshData: (ticker: string) => {
        const state = get();
        const metadata = state.refreshMetadata[ticker.toUpperCase()];

        if (!metadata) return true;

        // Check if last refresh was more than 24 hours ago
        const oneDayMs = 24 * 60 * 60 * 1000;
        return Date.now() - metadata.lastRefreshed > oneDayMs;
      },

      // Monthly returns state
      monthlyReturnsData: null,
      secondaryMonthlyReturnsData: null,

      // Daily returns state
      dailyReturnsData: null,
      secondaryDailyReturnsData: null,

      test: async () => {
        try {
          set({ isLoading: true, error: null });

          // Use the new socketRequestWithId utility
          const result = await socketRequestWithId<string>(socket, 'test');

          set({ state: result, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      createTimestampFile: async () => {
        try {
          set({ isLoading: true, error: null });

          // Call our new timestamp endpoint
          const result = await socketRequestWithId<{ timestamp: string; filePath: string }>(socket, 'timestamp');

          set({
            state: result.timestamp,
            timestampFilePath: result.filePath,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },

      // Fetch monthly returns data
      fetchMonthlyReturns: async (ticker: string, refresh: boolean) => {
        try {
          set({ isLoading: true, error: null });
          const upperTicker = ticker.toUpperCase();

          // Call the monthly returns endpoint
          const result = await socketRequestWithId<MonthlyReturnsData>(socket, 'monthly-returns', {
            ticker: upperTicker,
            refresh,
          });

          // Check if we have valid data
          if (!result || !result.data || Object.keys(result.data).length === 0) {
            throw new Error(`No data found for ticker ${upperTicker}`);
          }

          // Check if the data has any non-null values
          let hasData = false;
          Object.values(result.data).forEach((values) => {
            if (values.some((value) => value !== null)) {
              hasData = true;
            }
          });

          if (!hasData) {
            throw new Error(`No data found for ticker ${upperTicker}`);
          }

          // Update refresh metadata
          get().updateRefreshMetadata(upperTicker);

          set({
            monthlyReturnsData: result,
            isLoading: false,
            currentTicker: upperTicker,
          });

          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      // Fetch daily returns data
      fetchDailyReturns: async (ticker: string, refresh: boolean) => {
        try {
          set({ isLoading: true, error: null });
          const upperTicker = ticker.toUpperCase();

          // Call the daily returns endpoint
          const result = await socketRequestWithId<DailyReturnsData>(socket, 'daily-returns', {
            ticker: upperTicker,
            refresh,
          });

          // Check if we have valid data
          if (!result || !result.data || Object.keys(result.data).length === 0) {
            throw new Error(`No data found for ticker ${upperTicker}`);
          }

          // Check if any year has data
          let hasData = false;
          Object.values(result.data).forEach((yearData) => {
            if (Object.keys(yearData).length > 0) {
              // Check if any month has data
              Object.values(yearData).forEach((monthData) => {
                if (monthData && monthData.some((day) => day !== null)) {
                  hasData = true;
                }
              });
            }
          });

          if (!hasData) {
            throw new Error(`No data found for ticker ${upperTicker}`);
          }

          // Update refresh metadata
          get().updateRefreshMetadata(upperTicker);

          set({
            dailyReturnsData: result,
            isLoading: false,
            currentTicker: upperTicker,
          });

          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
          throw error;
        }
      },

      // Fetch secondary monthly returns data
      fetchSecondaryMonthlyReturns: async (ticker: string, refresh: boolean) => {
        try {
          if (!ticker) throw new Error('No ticker provided');

          const upperTicker = ticker.toUpperCase();

          // Call the monthly returns endpoint
          const result = await socketRequestWithId<MonthlyReturnsData>(socket, 'monthly-returns', {
            ticker: upperTicker,
            refresh,
          });

          // Check if we have valid data
          if (!result || !result.data || Object.keys(result.data).length === 0) {
            throw new Error(`No data found for ticker ${upperTicker}`);
          }

          // Check if the data has any non-null values
          let hasData = false;
          Object.values(result.data).forEach((values) => {
            if (values.some((value) => value !== null)) {
              hasData = true;
            }
          });

          if (!hasData) {
            throw new Error(`No data found for ticker ${upperTicker}`);
          }

          // Update refresh metadata
          get().updateRefreshMetadata(upperTicker);

          set({
            secondaryMonthlyReturnsData: result,
            secondaryTicker: upperTicker,
          });

          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      },

      // Fetch secondary daily returns data
      fetchSecondaryDailyReturns: async (ticker: string, refresh: boolean) => {
        try {
          if (!ticker) throw new Error('No ticker provided');

          const upperTicker = ticker.toUpperCase();

          // Call the daily returns endpoint
          const result = await socketRequestWithId<DailyReturnsData>(socket, 'daily-returns', {
            ticker: upperTicker,
            refresh,
          });

          // Check if we have valid data
          if (!result || !result.data || Object.keys(result.data).length === 0) {
            throw new Error(`No data found for ticker ${upperTicker}`);
          }

          // Check if any year has data
          let hasData = false;
          Object.values(result.data).forEach((yearData) => {
            if (Object.keys(yearData).length > 0) {
              // Check if any month has data
              Object.values(yearData).forEach((monthData) => {
                if (monthData && monthData.some((day) => day !== null)) {
                  hasData = true;
                }
              });
            }
          });

          if (!hasData) {
            throw new Error(`No data found for ticker ${upperTicker}`);
          }

          // Update refresh metadata
          get().updateRefreshMetadata(upperTicker);

          set({
            secondaryDailyReturnsData: result,
            secondaryTicker: upperTicker,
          });

          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      },
    }),
    {
      name: 'stock-returns-storage', // name of the item in localStorage
      partialize: (state) => ({
        currentTicker: state.currentTicker,
        secondaryTicker: state.secondaryTicker,
        compareMode: state.compareMode,
        refreshMetadata: state.refreshMetadata,
        customStocks: state.customStocks,
      }), // only persist these fields

      // Initialize state with persisted data
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Update available stocks to include custom stocks
          state.availableStocks = [...DEFAULT_STOCKS, ...(state.customStocks || [])];
        }
      },
    },
  ),
);

export default useStore;
