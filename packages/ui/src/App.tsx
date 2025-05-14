import { HashRouter, Route, Routes } from 'react-router-dom';
import useStore from './store';
import MonthlyReturns from './pages/MonthlyReturns';
import DailyReturns from './pages/DailyReturns';

export default function App() {
  const { test, createTimestampFile, state, timestampFilePath, isLoading, error } = useStore((state) => ({
    test: state.test,
    createTimestampFile: state.createTimestampFile,
    state: state.state,
    timestampFilePath: state.timestampFilePath,
    isLoading: state.isLoading,
    error: state.error,
  }));

  return (
    <HashRouter>
      <Routes>
        {/* Monthly Returns (Default Route) */}
        <Route path="/" element={<MonthlyReturns />} />

        {/* Daily Returns */}
        <Route path="/daily" element={<DailyReturns />} />

        {/* Original Test Route */}
        <Route
          path="/test"
          element={
            <div className="w-screen h-screen flex flex-col items-center justify-center gap-4">
              <button
                className="border p-6 text-5xl rounded-full"
                onClick={() => {
                  test();
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Get timestamp from backend'}
              </button>

              <button
                className="border p-6 text-5xl rounded-full bg-blue-100"
                onClick={() => {
                  createTimestampFile();
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Create timestamp file'}
              </button>

              {state && <div className="text-2xl">Response: {state}</div>}

              {timestampFilePath && (
                <div className="text-xl">
                  <p>File created at: {timestampFilePath}</p>
                  <p>
                    <a
                      href="/data/ts.txt"
                      target="_blank"
                      className="text-blue-500 underline"
                    >
                      View timestamp file
                    </a>
                  </p>
                </div>
              )}

              {error && <div className="text-red-500 text-xl">Error: {error}</div>}
            </div>
          }
        />
      </Routes>
    </HashRouter>
  );
}
