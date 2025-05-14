import { Action, ACTIONS_HTTP_METHODS } from '../types';
import { 
  loadData, 
  calculateMonthlyReturns, 
  calculateDailyReturns, 
  formatMonthlyReturns, 
  formatDailyReturns 
} from '../utils/dataUtils';

// Default ticker
const DEFAULT_TICKER = process.env.TICKER || 'TSLA';

/**
 * Monthly returns API endpoint
 */
const monthlyReturnsAction: Action = {
  path: 'monthly-returns',
  httpMethod: ACTIONS_HTTP_METHODS.GET,
  f: async ({ params }) => {
    try {
      // Get parameters
      const ticker = (params?.ticker as string) || DEFAULT_TICKER;
      const refresh = (params?.refresh as string) === 'true';
      
      // Load data
      const data = await loadData(ticker, refresh);
      
      // Calculate monthly returns
      const monthlyData = calculateMonthlyReturns(data);
      
      // Format data for frontend
      const result = formatMonthlyReturns(monthlyData);
      result.ticker = ticker.toUpperCase();
      
      return result;
    } catch (error) {
      console.error('Error in monthly returns:', error);
      throw error;
    }
  },
};

/**
 * Daily returns API endpoint
 */
const dailyReturnsAction: Action = {
  path: 'daily-returns',
  httpMethod: ACTIONS_HTTP_METHODS.GET,
  f: async ({ params }) => {
    try {
      // Get parameters
      const ticker = (params?.ticker as string) || DEFAULT_TICKER;
      const refresh = (params?.refresh as string) === 'true';
      
      // Load data
      const data = await loadData(ticker, refresh);
      
      // Calculate daily returns
      const dailyData = calculateDailyReturns(data);
      
      // Format data for frontend
      const result = formatDailyReturns(dailyData);
      result.ticker = ticker.toUpperCase();
      
      return result;
    } catch (error) {
      console.error('Error in daily returns:', error);
      throw error;
    }
  },
};

/**
 * Socket version of monthly returns
 */
const monthlyReturnsSocketAction: Action = {
  path: 'monthly-returns',
  f: async ({ params }) => {
    try {
      // Get parameters
      const ticker = (params?.ticker as string) || DEFAULT_TICKER;
      const refresh = (params?.refresh as boolean) || false;
      
      // Load data
      const data = await loadData(ticker, refresh);
      
      // Calculate monthly returns
      const monthlyData = calculateMonthlyReturns(data);
      
      // Format data for frontend
      const result = formatMonthlyReturns(monthlyData);
      result.ticker = ticker.toUpperCase();
      
      return result;
    } catch (error) {
      console.error('Error in monthly returns socket:', error);
      throw error;
    }
  },
};

/**
 * Socket version of daily returns
 */
const dailyReturnsSocketAction: Action = {
  path: 'daily-returns',
  f: async ({ params }) => {
    try {
      // Get parameters
      const ticker = (params?.ticker as string) || DEFAULT_TICKER;
      const refresh = (params?.refresh as boolean) || false;
      
      // Load data
      const data = await loadData(ticker, refresh);
      
      // Calculate daily returns
      const dailyData = calculateDailyReturns(data);
      
      // Format data for frontend
      const result = formatDailyReturns(dailyData);
      result.ticker = ticker.toUpperCase();
      
      return result;
    } catch (error) {
      console.error('Error in daily returns socket:', error);
      throw error;
    }
  },
};

export default [
  monthlyReturnsAction,
  dailyReturnsAction,
  monthlyReturnsSocketAction,
  dailyReturnsSocketAction
];
