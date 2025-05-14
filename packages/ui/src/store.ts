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

  // Stock list management
  availableStocks: string[];
  customStocks: string[];
  addCustomStock: (ticker: string) => void;

  // Refresh metadata
  refreshMetadata: RefreshMetadata;
  updateRefreshMetadata: (ticker: string) => void;
  shouldRefreshData: (ticker: string) => boolean;

  // Monthly returns state and actions
  monthlyReturnsData: MonthlyReturnsData | null;
  fetchMonthlyReturns: (ticker: string, refresh: boolean) => Promise<void>;

  // Daily returns state and actions
  dailyReturnsData: DailyReturnsData | null;
  fetchDailyReturns: (ticker: string, refresh: boolean) => Promise<void>;
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

      // Daily returns state
      dailyReturnsData: null,

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

          // Update refresh metadata
          get().updateRefreshMetadata(upperTicker);

          set({
            monthlyReturnsData: result,
            isLoading: false,
            currentTicker: upperTicker,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
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

          // Update refresh metadata
          get().updateRefreshMetadata(upperTicker);

          set({
            dailyReturnsData: result,
            isLoading: false,
            currentTicker: upperTicker,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Unknown error',
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'stock-returns-storage', // name of the item in localStorage
      partialize: (state) => ({
        currentTicker: state.currentTicker,
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
