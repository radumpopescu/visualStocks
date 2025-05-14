import React, { useState, useRef } from 'react';
import useStore from '../store';
import { toast } from './Toast';

// Default stock tickers (must match the ones in store.ts)
const DEFAULT_STOCKS = ['TSLA', 'AAPL', 'MSFT', 'NVDA', 'MSTR', 'SPY', 'PLTR'];

interface TickerSelectorProps {
  // Function to fetch data for the primary ticker
  fetchPrimaryData: (ticker: string, refresh: boolean) => Promise<any>;
  // Function to fetch data for the secondary ticker
  fetchSecondaryData: (ticker: string, refresh: boolean) => Promise<any>;
  // Whether the component is in a loading state
  isLoading: boolean;
}

const TickerSelector: React.FC<TickerSelectorProps> = ({
  fetchPrimaryData,
  fetchSecondaryData,
  isLoading,
}) => {
  const {
    currentTicker,
    secondaryTicker,
    setTicker,
    setSecondaryTicker,
    compareMode,
    toggleCompareMode,
    shouldRefreshData,
    availableStocks,
    customStocks,
    addCustomStock,
    removeCustomStock,
  } = useStore((state) => ({
    currentTicker: state.currentTicker,
    secondaryTicker: state.secondaryTicker,
    setTicker: state.setTicker,
    setSecondaryTicker: state.setSecondaryTicker,
    compareMode: state.compareMode,
    toggleCompareMode: state.toggleCompareMode,
    shouldRefreshData: state.shouldRefreshData,
    availableStocks: state.availableStocks,
    customStocks: state.customStocks,
    addCustomStock: state.addCustomStock,
    removeCustomStock: state.removeCustomStock,
  }));

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customTicker, setCustomTicker] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);

  // Function to handle ticker selection change
  const handleTickerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;

    if (value === 'add-custom') {
      setShowCustomInput(true);
      setTimeout(() => {
        customInputRef.current?.focus();
      }, 0);
    } else {
      try {
        setTicker(value);
        await fetchPrimaryData(value, shouldRefreshData(value));
      } catch (error) {
        // If it's a custom stock and there's an error, remove it
        if (!DEFAULT_STOCKS.includes(value) && customStocks.includes(value)) {
          removeCustomStock(value);
          toast.error(`No data found for ${value}. Removed from custom stocks.`);
          setTicker('TSLA');
          fetchPrimaryData('TSLA', false);
        } else {
          toast.error(`Error fetching data for ${value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  };

  // Function to handle secondary ticker selection change
  const handleSecondaryTickerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
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
      try {
        setSecondaryTicker(value);
        if (!compareMode) {
          toggleCompareMode();
        }
        await fetchSecondaryData(value, shouldRefreshData(value));
      } catch (error) {
        // If it's a custom stock and there's an error, remove it
        if (!DEFAULT_STOCKS.includes(value) && customStocks.includes(value)) {
          removeCustomStock(value);
          toast.error(`No data found for ${value}. Removed from custom stocks.`);
          setSecondaryTicker(null);
          if (compareMode) {
            toggleCompareMode();
          }
        } else {
          toast.error(`Error fetching data for ${value}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setSecondaryTicker(null);
          if (compareMode) {
            toggleCompareMode();
          }
        }
      }
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
        await fetchPrimaryData(customTicker, true);

        // If successful, add the stock to the custom list
        addCustomStock(customTicker);
        setTicker(customTicker);
        setShowCustomInput(false);
        setCustomTicker('');
        toast.success(`Added ${customTicker} to your stocks.`);
      } catch (error) {
        // If there's an error, don't add the stock and reset to TSLA
        toast.error(`No data found for ${customTicker}. Please try a different ticker.`);
        setTicker('TSLA');
        fetchPrimaryData('TSLA', false).catch(e => console.error(e));
      }
    }
  };

  // Function to handle add custom ticker button click
  const handleAddCustomTicker = async () => {
    if (customTicker.trim()) {
      try {
        // Try to fetch data for the ticker first
        await fetchPrimaryData(customTicker, true);

        // If successful, add the stock to the custom list
        addCustomStock(customTicker);
        setTicker(customTicker);
        setShowCustomInput(false);
        setCustomTicker('');
        toast.success(`Added ${customTicker} to your stocks.`);
      } catch (error) {
        // If there's an error, don't add the stock and reset to TSLA
        toast.error(`No data found for ${customTicker}. Please try a different ticker.`);
        setTicker('TSLA');
        fetchPrimaryData('TSLA', false).catch(e => console.error(e));
      }
    }
  };

  // Function to cancel adding custom ticker
  const handleCancelCustomTicker = () => {
    setShowCustomInput(false);
    setCustomTicker('');
  };

  return (
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
  );
};

export default TickerSelector;
