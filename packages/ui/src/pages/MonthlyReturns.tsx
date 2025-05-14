import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store';

export default function MonthlyReturns() {
  const { fetchMonthlyReturns, monthlyReturnsData, isLoading, error } = useStore((state) => ({
    fetchMonthlyReturns: state.fetchMonthlyReturns,
    monthlyReturnsData: state.monthlyReturnsData,
    isLoading: state.isLoading,
    error: state.error,
  }));

  const [ticker, setTicker] = useState('TSLA');

  useEffect(() => {
    fetchMonthlyReturns(ticker, false);
  }, []);

  // Function to handle refresh button click
  const handleRefresh = () => {
    fetchMonthlyReturns(ticker, true);
  };

  // Function to handle ticker input change
  const handleTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTicker(e.target.value.toUpperCase());
  };

  // Function to handle ticker input keypress
  const handleTickerKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchMonthlyReturns(ticker, false);
    }
  };

  // Function to calculate color opacity based on value
  const getColorOpacity = (value: number, min: number, max: number) => {
    if (value >= 0) {
      // For positive values, scale from 0.1 to 1.0
      return max <= 0 ? 0.5 : 0.1 + 0.9 * (value / max);
    } else {
      // For negative values, scale from 0.1 to 1.0
      return min >= 0 ? 0.5 : 0.1 + 0.9 * (Math.abs(value) / Math.abs(min));
    }
  };

  // Get all return values to calculate color gradation
  const allReturns: number[] = [];
  if (monthlyReturnsData) {
    Object.entries(monthlyReturnsData.data).forEach(([_, values]) => {
      values.forEach((value) => {
        if (value !== null && !isNaN(value)) {
          allReturns.push(value);
        }
      });
    });
  }

  // Sort returns to find min and max for color scaling
  const sortedReturns = [...allReturns].sort((a, b) => a - b);
  const minReturn = sortedReturns[0] || -1; // Default to -1 if no negative returns
  const maxReturn = sortedReturns[sortedReturns.length - 1] || 1; // Default to 1 if no positive returns

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">MONTHLY RETURNS</h1>
              <div className="flex space-x-4">
                <Link to="/" className="text-blue-600 font-medium border-b-2 border-blue-600">
                  Monthly View
                </Link>
                <Link to="/daily" className="text-gray-600 hover:text-blue-600 transition">
                  Daily View
                </Link>
              </div>
            </div>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0">
              <div className="flex items-center">
                <label htmlFor="ticker" className="mr-2 text-gray-700">
                  Ticker:
                </label>
                <input
                  type="text"
                  id="ticker"
                  className="border rounded px-2 py-1 w-24"
                  value={ticker}
                  onChange={handleTickerChange}
                  onKeyPress={handleTickerKeyPress}
                />
              </div>
              <button
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </div>

          <p className="mb-6 text-gray-700">
            The table below presents the monthly returns of{' '}
            <span id="ticker-name">{monthlyReturnsData?.ticker || ticker}</span>, with color gradation from worst to
            best to easily spot seasonal factors. Returns are adjusted for dividends.
          </p>

          {error && <div className="text-red-600 mb-4">{error}</div>}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-4 py-2 bg-gray-100 text-left">Year</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Jan</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Feb</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Mar</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Apr</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">May</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Jun</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Jul</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Aug</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Sep</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Oct</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Nov</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Dec</th>
                  <th className="border px-4 py-2 bg-gray-100 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {!monthlyReturnsData ? (
                  <tr>
                    <td colSpan={14} className="border px-4 py-2 text-center">
                      Loading data...
                    </td>
                  </tr>
                ) : (
                  monthlyReturnsData.years.map((year, yearIndex) => (
                    <tr key={year}>
                      <td className="border px-4 py-2 font-medium">{year}</td>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total'].map(
                        (month) => {
                          const value = monthlyReturnsData.data[month]?.[yearIndex];
                          return (
                            <td
                              key={`${year}-${month}`}
                              className="border px-4 py-2 text-center"
                              style={{
                                backgroundColor:
                                  value !== null && !isNaN(value)
                                    ? value >= 0
                                      ? `rgba(52, 211, 153, ${getColorOpacity(value, minReturn, maxReturn)})`
                                      : `rgba(239, 68, 68, ${getColorOpacity(value, minReturn, maxReturn)})`
                                    : undefined,
                              }}
                            >
                              {value !== null && !isNaN(value) ? value.toFixed(2) + '%' : '-'}
                            </td>
                          );
                        }
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
