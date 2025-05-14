import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store';
import cl from '../helpers/classNames';

interface DailyCalendarData {
  return: number;
  weekday: number;
}

export default function DailyReturns() {
  const {
    fetchDailyReturns,
    fetchSecondaryDailyReturns,
    dailyReturnsData,
    secondaryDailyReturnsData,
    isLoading,
    error,
    currentTicker,
    secondaryTicker,
    setTicker,
    setSecondaryTicker,
    compareMode,
    toggleCompareMode,
    shouldRefreshData,
    availableStocks,
    addCustomStock
  } = useStore((state) => ({
    fetchDailyReturns: state.fetchDailyReturns,
    fetchSecondaryDailyReturns: state.fetchSecondaryDailyReturns,
    dailyReturnsData: state.dailyReturnsData,
    secondaryDailyReturnsData: state.secondaryDailyReturnsData,
    isLoading: state.isLoading,
    error: state.error,
    currentTicker: state.currentTicker,
    secondaryTicker: state.secondaryTicker,
    setTicker: state.setTicker,
    setSecondaryTicker: state.setSecondaryTicker,
    compareMode: state.compareMode,
    toggleCompareMode: state.toggleCompareMode,
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

    // If in compare mode and we have a secondary ticker, fetch that data too
    if (compareMode && secondaryTicker) {
      const secondaryNeedsRefresh = shouldRefreshData(secondaryTicker);
      fetchSecondaryDailyReturns(secondaryTicker, secondaryNeedsRefresh);
    }
  }, [compareMode, currentTicker, secondaryTicker]);

  // Combine years from both datasets when in compare mode
  const combinedYears = dailyReturnsData
    ? compareMode && secondaryDailyReturnsData
      ? [...new Set([...dailyReturnsData.years, ...secondaryDailyReturnsData.years])].sort()
      : dailyReturnsData.years
    : [];

  useEffect(() => {
    if (combinedYears.length > 0 && !selectedYear) {
      // Select the most recent year by default
      setSelectedYear(combinedYears[combinedYears.length - 1]);
    }
  }, [dailyReturnsData, secondaryDailyReturnsData, compareMode]);

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

  // Function to handle secondary ticker selection change
  const handleSecondaryTickerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'add-custom') {
      setShowCustomInput(true);
      setTimeout(() => {
        customInputRef.current?.focus();
      }, 0);
    } else if (value === 'none') {
      setSecondaryTicker(null);
      if (compareMode) {
        toggleCompareMode();
      }
    } else {
      setSecondaryTicker(value);
      if (!compareMode) {
        toggleCompareMode();
      }
      fetchSecondaryDailyReturns(value, shouldRefreshData(value));
    }
  };

  // Function to handle custom ticker input change
  const handleCustomTickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTicker(e.target.value.toUpperCase());
  };

  // Function to handle custom ticker input keypress
  const handleCustomTickerKeyPress = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTicker.trim()) {
      try {
        // Try to fetch data for the ticker first
        await fetchDailyReturns(customTicker, true);

        // If successful, add the stock to the custom list
        addCustomStock(customTicker);
        setTicker(customTicker);
        setShowCustomInput(false);
        setCustomTicker('');
      } catch (error) {
        // If there's an error, don't add the stock and reset to TSLA
        setTicker('TSLA');
        fetchDailyReturns('TSLA', false);
      }
    }
  };

  // Function to handle add custom ticker button click
  const handleAddCustomTicker = async () => {
    if (customTicker.trim()) {
      try {
        // Try to fetch data for the ticker first
        await fetchDailyReturns(customTicker, true);

        // If successful, add the stock to the custom list
        addCustomStock(customTicker);
        setTicker(customTicker);
        setShowCustomInput(false);
        setCustomTicker('');
      } catch (error) {
        // If there's an error, don't add the stock and reset to TSLA
        setTicker('TSLA');
        fetchDailyReturns('TSLA', false);
      }
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
    // Get secondary month data if in compare mode
    const secondaryMonthData = compareMode && secondaryTicker && secondaryDailyReturnsData
      ? secondaryDailyReturnsData.data[year]?.[monthName]
      : null;

    // If neither dataset has data for this month, return null
    if (!monthData && !secondaryMonthData) return null;

    // Create empty month data if primary data is missing but secondary exists
    const primaryMonthData = monthData || (secondaryMonthData ? Array(secondaryMonthData.length).fill(null) : []);

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
    const dayCells = primaryMonthData.map((dayData, index) => {
      const day = index + 1;
      const isWeekend = dayData && (dayData.weekday === 0 || dayData.weekday === 6);
      const secondaryDayData = secondaryMonthData && secondaryMonthData[index];

      if (compareMode && secondaryTicker && secondaryMonthData) {
        // Split cell for comparison mode with diagonal design
        return (
          <div
            key={`day-${day}`}
            className={`aspect-square relative group ${isWeekend ? 'opacity-80' : ''}`}
          >
            {/* Day number in the center - only visible on hover unless both stocks have no data */}
            <div className={`absolute inset-0 flex items-center justify-center z-20 pointer-events-none transition-opacity duration-200
              ${(!dayData || dayData.return === undefined || dayData.return === null) &&
                (!secondaryDayData || secondaryDayData.return === undefined || secondaryDayData.return === null)
                ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <span className="text-xs font-medium bg-white bg-opacity-70 px-1 rounded">{day}</span>
            </div>

            {/* Diagonal divider */}
            <div className="absolute inset-0 z-10">
              <div className="absolute top-0 right-0 bottom-0 left-0 border-b border-r border-gray-300 transform rotate-45 origin-center"></div>
            </div>

            {/* Primary ticker (top-left triangle) */}
            <div
              className="absolute top-0 left-0 w-full h-full"
              style={{
                backgroundColor: dayData
                  ? dayData.return >= 0
                    ? `rgba(52, 211, 153, ${getColorOpacity(dayData.return, minReturn, maxReturn)})`
                    : `rgba(239, 68, 68, ${getColorOpacity(dayData.return, minReturn, maxReturn)})`
                  : undefined,
                clipPath: 'polygon(0 0, 0% 100%, 100% 0)'
              }}
              title={dayData ? `${currentTicker}: ${dayData.return.toFixed(2)}%` : undefined}
            >
              {/* Stock identifier in the corner */}
              <div className="absolute top-0.5 left-0.5 text-[6px] font-bold">
                {currentTicker.substring(0, 1)}
              </div>

              {/* Percentage value at 45-degree angle */}
              {dayData && (
                <div
                  className="absolute text-[7px] font-medium"
                  style={{
                    top: '30%',
                    left: '30%',
                    transform: 'translate(-50%, -50%) rotate(-45deg)'
                  }}
                >
                  {dayData.return.toFixed(1)}%
                </div>
              )}
            </div>

            {/* Secondary ticker (bottom-right triangle) */}
            <div
              className="absolute bottom-0 right-0 w-full h-full"
              style={{
                backgroundColor: secondaryDayData
                  ? secondaryDayData.return >= 0
                    ? `rgba(52, 211, 153, ${getColorOpacity(secondaryDayData.return, minReturn, maxReturn)})`
                    : `rgba(239, 68, 68, ${getColorOpacity(secondaryDayData.return, minReturn, maxReturn)})`
                  : undefined,
                clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)'
              }}
              title={secondaryDayData ? `${secondaryTicker}: ${secondaryDayData.return.toFixed(2)}%` : undefined}
            >
              {/* Stock identifier in the corner */}
              <div className="absolute bottom-0.5 right-0.5 text-[6px] font-bold">
                {secondaryTicker.substring(0, 1)}
              </div>

              {/* Percentage value at 45-degree angle */}
              {secondaryDayData && (
                <div
                  className="absolute text-[7px] font-medium"
                  style={{
                    bottom: '30%',
                    right: '30%',
                    transform: 'translate(50%, 50%) rotate(-45deg)'
                  }}
                >
                  {secondaryDayData.return.toFixed(1)}%
                </div>
              )}
            </div>
          </div>
        );
      } else {
        // Regular single cell
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
            {/* Day number always visible in single stock mode */}
            <span>{day}</span>
            {dayData && (
              <span className="text-[8px] font-medium">
                {dayData.return.toFixed(1)}%
              </span>
            )}
          </div>
        );
      }
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
                <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
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

                  <div className="flex items-center">
                    <label htmlFor="secondary-ticker" className="mr-2 text-gray-700">
                      Compare with:
                    </label>
                    <select
                      id="secondary-ticker"
                      className="border rounded px-2 py-1"
                      value={secondaryTicker || 'none'}
                      onChange={handleSecondaryTickerChange}
                      disabled={isLoading}
                    >
                      <option value="none">None</option>
                      {availableStocks
                        .filter(stock => stock !== currentTicker)
                        .map((stock) => (
                          <option key={stock} value={stock}>
                            {stock}
                          </option>
                      ))}
                      <option value="add-custom">+ Add Custom...</option>
                    </select>
                  </div>
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
                    onKeyDown={handleCustomTickerKeyPress}
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
            {compareMode && secondaryTicker ? (
              <>
                The calendars below show daily returns of{' '}
                <span className="font-semibold">{dailyReturnsData?.ticker || currentTicker}</span>{' '}
                compared with{' '}
                <span className="font-semibold">{secondaryDailyReturnsData?.ticker || secondaryTicker}</span>,
                with color intensity representing the magnitude of returns.
                Green indicates positive returns, red indicates negative returns.
                Each day is split diagonally with {currentTicker} in the top-left and {secondaryTicker} in the bottom-right.
              </>
            ) : (
              <>
                The calendars below show daily returns of{' '}
                <span className="font-semibold">{dailyReturnsData?.ticker || currentTicker}</span> with color intensity representing the magnitude of returns.
                Green indicates positive returns, red indicates negative returns.
              </>
            )}
          </p>

          {error && <div className="text-red-600 mb-4">{error}</div>}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded-l flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const currentIndex = combinedYears.indexOf(selectedYear);
                  if (currentIndex > 0) {
                    setSelectedYear(combinedYears[currentIndex - 1]);
                  }
                }}
                disabled={!selectedYear || combinedYears.indexOf(selectedYear) <= 0}
                title="Previous Year"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center">
                <label htmlFor="year-select" className="mr-2 text-gray-700">
                  Year:
                </label>
                <select
                  id="year-select"
                  className="border rounded px-2 py-1"
                  value={selectedYear || ''}
                  onChange={handleYearChange}
                  disabled={combinedYears.length === 0}
                >
                  {combinedYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-1 px-2 rounded-r flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  const currentIndex = combinedYears.indexOf(selectedYear);
                  if (currentIndex < combinedYears.length - 1) {
                    setSelectedYear(combinedYears[currentIndex + 1]);
                  }
                }}
                disabled={!selectedYear || combinedYears.indexOf(selectedYear) >= combinedYears.length - 1}
                title="Next Year"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
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

              {compareMode && secondaryTicker && (
                <>
                  <div className="border-l border-gray-300 h-6 mx-2"></div>
                  <div className="flex items-center">
                    <div className="relative w-5 h-5 border border-gray-300 mr-2">
                      <div className="absolute top-0 left-0 w-full h-full bg-blue-100" style={{ clipPath: 'polygon(0 0, 0% 100%, 100% 0)' }}></div>
                      <div className="absolute top-0.5 left-0.5 text-[6px] font-bold">
                        {currentTicker.substring(0, 1)}
                      </div>
                      <div className="absolute inset-0">
                        <div className="absolute top-0 right-0 bottom-0 left-0 border-b border-r border-gray-500 transform rotate-45 origin-center"></div>
                      </div>
                    </div>
                    <span className="text-sm">{currentTicker} (top-left)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="relative w-5 h-5 border border-gray-300 mr-2">
                      <div className="absolute top-0 left-0 w-full h-full bg-blue-100" style={{ clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)' }}></div>
                      <div className="absolute bottom-0.5 right-0.5 text-[6px] font-bold">
                        {secondaryTicker.substring(0, 1)}
                      </div>
                      <div className="absolute inset-0">
                        <div className="absolute top-0 right-0 bottom-0 left-0 border-b border-r border-gray-500 transform rotate-45 origin-center"></div>
                      </div>
                    </div>
                    <span className="text-sm">{secondaryTicker} (bottom-right)</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {!dailyReturnsData || !selectedYear ? (
            <div className="text-center py-8">Loading data...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                (monthName, index) => {
                  const monthNumber = index + 1;
                  const primaryMonthData = dailyReturnsData.data[selectedYear]?.[monthName];
                  const secondaryMonthData = compareMode && secondaryDailyReturnsData
                    ? secondaryDailyReturnsData.data[selectedYear]?.[monthName]
                    : null;

                  // Show calendar if either dataset has data for this month
                  if (primaryMonthData || (compareMode && secondaryMonthData)) {
                    return createMonthCalendar(selectedYear, monthName, monthNumber, primaryMonthData);
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
