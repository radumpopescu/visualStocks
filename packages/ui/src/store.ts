import { create } from 'zustand';
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

type StoreType = {
  // Original state
  state: string;
  test: () => Promise<void>;
  createTimestampFile: () => Promise<void>;
  timestampFilePath: string;
  isLoading: boolean;
  error: string | null;

  // Monthly returns state and actions
  monthlyReturnsData: MonthlyReturnsData | null;
  fetchMonthlyReturns: (ticker: string, refresh: boolean) => Promise<void>;

  // Daily returns state and actions
  dailyReturnsData: DailyReturnsData | null;
  fetchDailyReturns: (ticker: string, refresh: boolean) => Promise<void>;
};

const useStore = create<StoreType>((set) => ({
  // Original state
  state: '',
  timestampFilePath: '',
  isLoading: false,
  error: null,

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

      // Call the monthly returns endpoint
      const result = await socketRequestWithId<MonthlyReturnsData>(socket, 'monthly-returns', {
        ticker,
        refresh,
      });

      set({
        monthlyReturnsData: result,
        isLoading: false,
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

      // Call the daily returns endpoint
      const result = await socketRequestWithId<DailyReturnsData>(socket, 'daily-returns', {
        ticker,
        refresh,
      });

      set({
        dailyReturnsData: result,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },
}));

export default useStore;
