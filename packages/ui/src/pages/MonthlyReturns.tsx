import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store';
import cl from '../helpers/classNames';
import TickerSelector from '../components/TickerSelector';

export default function MonthlyReturns() {
  const {
    fetchMonthlyReturns,
    fetchSecondaryMonthlyReturns,
    monthlyReturnsData,
    secondaryMonthlyReturnsData,
    isLoading,
    error,
    currentTicker,
    secondaryTicker,
    compareMode,
    shouldRefreshData
  } = useStore((state) => ({
    fetchMonthlyReturns: state.fetchMonthlyReturns,
    fetchSecondaryMonthlyReturns: state.fetchSecondaryMonthlyReturns,
    monthlyReturnsData: state.monthlyReturnsData,
    secondaryMonthlyReturnsData: state.secondaryMonthlyReturnsData,
    isLoading: state.isLoading,
    error: state.error,
    currentTicker: state.currentTicker,
    secondaryTicker: state.secondaryTicker,
    compareMode: state.compareMode,
    shouldRefreshData: state.shouldRefreshData
  }));

  useEffect(() => {
    // Check if we need to refresh the data (it's older than 1 day)
    const needsRefresh = shouldRefreshData(currentTicker);
    fetchMonthlyReturns(currentTicker, needsRefresh);

    // If in compare mode and we have a secondary ticker, fetch that data too
    if (compareMode && secondaryTicker) {
      const secondaryNeedsRefresh = shouldRefreshData(secondaryTicker);
      fetchSecondaryMonthlyReturns(secondaryTicker, secondaryNeedsRefresh);
    }
  }, [compareMode, currentTicker, secondaryTicker, fetchMonthlyReturns, fetchSecondaryMonthlyReturns, shouldRefreshData]);

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
    Object.values(monthlyReturnsData.data).forEach((values) => {
      values.forEach((value) => {
        if (value !== null && !isNaN(value)) {
          allReturns.push(value);
        }
      });
    });
  }

  // Add secondary data returns for color scaling if in compare mode
  if (compareMode && secondaryMonthlyReturnsData) {
    Object.values(secondaryMonthlyReturnsData.data).forEach((values) => {
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

  // Combine years from both datasets when in compare mode
  const combinedYears = monthlyReturnsData
    ? compareMode && secondaryMonthlyReturnsData
      ? [...new Set([...monthlyReturnsData.years, ...secondaryMonthlyReturnsData.years])].sort()
      : monthlyReturnsData.years
    : [];

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
            <TickerSelector
              fetchPrimaryData={fetchMonthlyReturns}
              fetchSecondaryData={fetchSecondaryMonthlyReturns}
              isLoading={isLoading}
            />
          </div>

          <p className="mb-6 text-gray-700">
            {compareMode && secondaryTicker ? (
              <>
                The table below presents the monthly returns of{' '}
                <span id="ticker-name" className="font-semibold">{monthlyReturnsData?.ticker || currentTicker}</span>{' '}
                compared with{' '}
                <span id="secondary-ticker-name" className="font-semibold">{secondaryMonthlyReturnsData?.ticker || secondaryTicker}</span>,
                with color gradation from worst to best to easily spot seasonal factors. Returns are adjusted for dividends.
                Each cell is split diagonally with {currentTicker} in the top-left and {secondaryTicker} in the bottom-right.
              </>
            ) : (
              <>
                The table below presents the monthly returns of{' '}
                <span id="ticker-name" className="font-semibold">{monthlyReturnsData?.ticker || currentTicker}</span>, with color gradation from worst to
                best to easily spot seasonal factors. Returns are adjusted for dividends.
              </>
            )}
          </p>

          {error && <div className="text-red-600 mb-4">{error}</div>}

          {compareMode && secondaryTicker && (
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 mr-1"></div>
                <span className="text-sm">Negative</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 mr-1"></div>
                <span className="text-sm">Positive</span>
              </div>
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
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse shadow-sm rounded-lg overflow-hidden">
              <thead>
                <tr>
                  <th className="border px-4 py-3 bg-gray-100 text-left font-semibold text-gray-700">Year</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Jan</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Feb</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Mar</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Apr</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">May</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Jun</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Jul</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Aug</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Sep</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Oct</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Nov</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Dec</th>
                  <th className="border px-3 py-3 bg-gray-100 text-center font-semibold text-gray-700">Total</th>
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
                  combinedYears.map((year) => {
                    // Find the index of this year in each dataset
                    const primaryYearIndex = monthlyReturnsData.years.indexOf(year);
                    const secondaryYearIndex = secondaryMonthlyReturnsData
                      ? secondaryMonthlyReturnsData.years.indexOf(year)
                      : -1;

                    return (
                      <tr key={year} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="border px-4 py-2 font-medium bg-gray-50 text-gray-700">{year}</td>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total'].map(
                          (month) => {
                            // Get values using the correct indices for each dataset
                            const primaryValue = primaryYearIndex >= 0
                              ? monthlyReturnsData.data[month]?.[primaryYearIndex]
                              : null;

                            const secondaryValue = compareMode && secondaryMonthlyReturnsData && secondaryYearIndex >= 0
                              ? secondaryMonthlyReturnsData.data[month]?.[secondaryYearIndex]
                              : null;

                            if (compareMode && secondaryTicker) {
                              // Split cell for comparison mode
                              return (
                                <td
                                  key={`${year}-${month}`}
                                  className="border px-4 py-2 text-center relative"
                                  style={{ height: '60px', padding: '0' }}
                                >
                                  <div className="relative h-full w-full overflow-hidden">
                                    {/* Diagonal divider */}
                                    <div className="absolute inset-0 z-10">
                                      <div className="absolute top-0 right-0 bottom-0 left-0 border-b border-r border-gray-300 transform rotate-45 origin-center"></div>
                                    </div>

                                    {/* Primary ticker (top-left triangle) */}
                                    <div
                                      className="absolute top-0 left-0 w-full h-full"
                                      style={{
                                        backgroundColor:
                                          primaryValue !== null && !isNaN(primaryValue)
                                            ? primaryValue >= 0
                                              ? `rgba(52, 211, 153, ${getColorOpacity(primaryValue, minReturn, maxReturn)})`
                                              : `rgba(239, 68, 68, ${getColorOpacity(primaryValue, minReturn, maxReturn)})`
                                            : undefined,
                                        clipPath: 'polygon(0 0, 0% 100%, 100% 0)'
                                      }}
                                    >
                                      {/* Stock identifier in the top corner */}
                                      <div className="absolute top-1 left-1 text-[8px] font-bold">
                                        {currentTicker.substring(0, 1)}
                                      </div>

                                      {/* Percentage value at 45-degree angle */}
                                      {primaryValue !== null && !isNaN(primaryValue) && (
                                        <div
                                          className="absolute text-xs font-medium"
                                          style={{
                                            top: '30%',
                                            left: '30%',
                                            transform: 'translate(-25%, -25%) rotate(-35deg)'
                                          }}
                                        >
                                          {primaryValue.toFixed(1)}%
                                        </div>
                                      )}
                                    </div>

                                    {/* Secondary ticker (bottom-right triangle) */}
                                    <div
                                      className="absolute bottom-0 right-0 w-full h-full"
                                      style={{
                                        backgroundColor:
                                          secondaryValue !== null && !isNaN(secondaryValue)
                                            ? secondaryValue >= 0
                                              ? `rgba(52, 211, 153, ${getColorOpacity(secondaryValue, minReturn, maxReturn)})`
                                              : `rgba(239, 68, 68, ${getColorOpacity(secondaryValue, minReturn, maxReturn)})`
                                            : undefined,
                                        clipPath: 'polygon(100% 0, 0% 100%, 100% 100%)'
                                      }}
                                    >
                                      {/* Stock identifier in the bottom corner */}
                                      <div className="absolute bottom-1 right-1 text-[8px] font-bold">
                                        {secondaryTicker.substring(0, 1)}
                                      </div>

                                      {/* Percentage value at 45-degree angle */}
                                      {secondaryValue !== null && !isNaN(secondaryValue) && (
                                        <div
                                          className="absolute text-xs font-medium"
                                          style={{
                                            bottom: '30%',
                                            right: '30%',
                                            transform: 'translate(35%, 20%) rotate(-30deg)'
                                          }}
                                        >
                                          {secondaryValue.toFixed(1)}%
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                            } else {
                              // Regular single cell
                              return (
                                <td
                                  key={`${year}-${month}`}
                                  className="border p-0 text-center relative"
                                  style={{ height: '50px', minWidth: '80px' }}
                                >
                                  <div
                                    className="absolute inset-0 flex items-center justify-center transition-all duration-200 hover:opacity-90 rounded-sm shadow-sm hover:shadow"
                                    style={{
                                      backgroundColor:
                                        primaryValue !== null && !isNaN(primaryValue)
                                          ? primaryValue >= 0
                                            ? `rgba(52, 211, 153, ${getColorOpacity(primaryValue, minReturn, maxReturn)})`
                                            : `rgba(239, 68, 68, ${getColorOpacity(primaryValue, minReturn, maxReturn)})`
                                          : undefined,
                                    }}
                                  >
                                    <div className="flex flex-col items-center">
                                      {primaryValue !== null && !isNaN(primaryValue) ? (
                                        <>
                                          <span className="font-medium text-sm">
                                            {primaryValue.toFixed(1)}%
                                          </span>
                                          <span className="text-[10px] opacity-70">
                                            {month} {year}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-gray-500">-</span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                            }
                          }
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
