import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store';

interface DailyCalendarData {
  return: number;
  weekday: number;
}

export default function DailyReturns() {
  const {
    fetchDailyReturns,
    dailyReturnsData,
    isLoading,
    error,
    currentTicker,
    setTicker,
    shouldRefreshData,
    availableStocks,
    addCustomStock
  } = useStore((state) => ({
    fetchDailyReturns: state.fetchDailyReturns,
    dailyReturnsData: state.dailyReturnsData,
    isLoading: state.isLoading,
    error: state.error,
    currentTicker: state.currentTicker,
    setTicker: state.setTicker,
    shouldRefreshData: state.shouldRefreshData,
    availableStocks: state.availableStocks,
    addCustomStock: state.addCustomStock
  }));

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTicker, setCustomTicker] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    // Check if we need to refresh the data (it's older than 1 day)
    const needsRefresh = shouldRefreshData(currentTicker);
    fetchDailyReturns(currentTicker, needsRefresh);
  }, []);

  useEffect(() => {
    if (dailyReturnsData && dailyReturnsData.years.length > 0 && !selectedYear) {
      // Select the most recent year by default
      setSelectedYear(dailyReturnsData.years[dailyReturnsData.years.length - 1]);
    }
  }, [dailyReturnsData]);

  // Function to handle ticker selection change
  const handleTickerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'add-custom') {
      setShowCustomInput(true);
      setTimeout(() => {
        customInputRef.current?.focus();
      }, 0);
    } else {
      setTicker(value);
      fetchDailyReturns(value, shouldRefreshData(value));
    }
  };

  // Function to handle custom ticker input change
  const handleCustomTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTicker(e.target.value.toUpperCase());
  };

  // Function to handle custom ticker input keypress
  const handleCustomTickerKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTicker.trim()) {
      addCustomStock(customTicker);
      setTicker(customTicker);
      fetchDailyReturns(customTicker, true);
      setShowCustomInput(false);
      setCustomTicker('');
    }
  };

  // Function to handle add custom ticker button click
  const handleAddCustomTicker = () => {
    if (customTicker.trim()) {
      addCustomStock(customTicker);
      setTicker(customTicker);
      fetchDailyReturns(customTicker, true);
      setShowCustomInput(false);
      setCustomTicker('');
    }
  };

  // Function to cancel adding custom ticker
  const handleCancelCustomTicker = () => {
    setShowCustomInput(false);
    setCustomTicker('');
  };

  // Function to handle year selection change
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
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
  if (dailyReturnsData && selectedYear) {
    Object.entries(dailyReturnsData.data[selectedYear] || {}).forEach(([_, monthData]) => {
      if (monthData) {
        monthData.forEach((day) => {
          if (day && day.return !== undefined) {
            allReturns.push(day.return);
          }
        });
      }
    });
  }

  // Sort returns to find min and max for color scaling
  const sortedReturns = [...allReturns].sort((a, b) => a - b);
  const minReturn = sortedReturns[0] || -1; // Default to -1 if no negative returns
  const maxReturn = sortedReturns[sortedReturns.length - 1] || 1; // Default to 1 if no positive returns

  // Function to create a calendar for a month
  const createMonthCalendar = (year: number, monthName: string, monthNumber: number, monthData: DailyCalendarData[] | null) => {
    if (!monthData) return null;

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Get the first day of the month (0 = Sunday, 6 = Saturday in JavaScript)
    const firstDay = new Date(year, monthNumber - 1, 1).getDay();
    // Adjust for Monday as first day of week (0 = Monday in our grid)
    const firstDayAdjusted = firstDay === 0 ? 6 : firstDay - 1;

    // Create empty cells for days before the 1st of the month
    const emptyCells = Array(firstDayAdjusted).fill(null).map((_, i) => (
      <div key={`empty-${i}`} className="aspect-square"></div>
    ));

    // Create day cells
    const dayCells = monthData.map((dayData, index) => {
      const day = index + 1;
      const isWeekend = dayData && (dayData.weekday === 0 || dayData.weekday === 6);

      return (
        <div
          key={`day-${day}`}
          className={`aspect-square flex flex-col items-center justify-center text-xs rounded ${isWeekend ? 'opacity-80' : ''}`}
          style={{
            backgroundColor: dayData
              ? dayData.return >= 0
                ? `rgba(52, 211, 153, ${getColorOpacity(dayData.return, minReturn, maxReturn)})`
                : `rgba(239, 68, 68, ${getColorOpacity(dayData.return, minReturn, maxReturn)})`
              : undefined,
          }}
          title={dayData ? `${dayData.return.toFixed(2)}%` : undefined}
        >
          <span>{day}</span>
          {dayData && (
            <span className="text-[8px] font-medium">
              {dayData.return.toFixed(1)}%
            </span>
          )}
        </div>
      );
    });

    return (
      <div key={`${year}-${monthName}`} className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-2 text-center">{`${monthName} ${year}`}</h3>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-xs text-center font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {emptyCells}
          {dayCells}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">DAILY RETURNS</h1>
              <div className="flex space-x-4">
                <Link to="/" className="text-gray-600 hover:text-blue-600 transition">
                  Monthly View
                </Link>
                <Link to="/daily" className="text-blue-600 font-medium border-b-2 border-blue-600">
                  Daily View
                </Link>
              </div>
            </div>
            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4 mt-4 md:mt-0">
              {!showCustomInput ? (
                <div className="flex items-center">
                  <label htmlFor="ticker" className="mr-2 text-gray-700">
                    Ticker:
                  </label>
                  <select
                    id="ticker"
                    className="border rounded px-2 py-1"
                    value={currentTicker}
                    onChange={handleTickerChange}
                    disabled={isLoading}
                  >
                    {availableStocks.map((stock) => (
                      <option key={stock} value={stock}>
                        {stock}
                      </option>
                    ))}
                    <option value="add-custom">+ Add Custom...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <label htmlFor="custom-ticker" className="mr-2 text-gray-700">
                    Custom Ticker:
                  </label>
                  <input
                    ref={customInputRef}
                    type="text"
                    id="custom-ticker"
                    className="border rounded px-2 py-1 w-24"
                    value={customTicker}
                    onChange={handleCustomTickerChange}
                    onKeyPress={handleCustomTickerKeyPress}
                    placeholder="e.g. AAPL"
                  />
                  <button
                    className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition text-sm"
                    onClick={handleAddCustomTicker}
                  >
                    Add
                  </button>
                  <button
                    className="bg-gray-400 text-white px-2 py-1 rounded hover:bg-gray-500 transition text-sm"
                    onClick={handleCancelCustomTicker}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="mb-6 text-gray-700">
            The calendars below show daily returns of{' '}
            <span>{dailyReturnsData?.ticker || currentTicker}</span> with color intensity representing the magnitude of returns.
            Green indicates positive returns, red indicates negative returns.
          </p>

          {error && <div className="text-red-600 mb-4">{error}</div>}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <label htmlFor="year-select" className="mr-2 text-gray-700">
                Year:
              </label>
              <select
                id="year-select"
                className="border rounded px-2 py-1"
                value={selectedYear || ''}
                onChange={handleYearChange}
                disabled={!dailyReturnsData || dailyReturnsData.years.length === 0}
              >
                {dailyReturnsData?.years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 mr-1"></div>
                <span className="text-sm">Negative</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 mr-1"></div>
                <span className="text-sm">Positive</span>
              </div>
            </div>
          </div>

          {!dailyReturnsData || !selectedYear ? (
            <div className="text-center py-8">Loading data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                (monthName, index) => {
                  const monthNumber = index + 1;
                  const monthData = dailyReturnsData.data[selectedYear]?.[monthName];

                  if (monthData) {
                    return createMonthCalendar(selectedYear, monthName, monthNumber, monthData);
                  } else {
                    return (
                      <div key={`${selectedYear}-${monthName}`} className="border rounded-lg p-4">
                        <h3 className="text-lg font-semibold mb-2 text-center">{`${monthName} ${selectedYear}`}</h3>
                        <div className="text-center py-8 text-gray-500">No data available</div>
                      </div>
                    );
                  }
                }
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
