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

      </Routes>
    </HashRouter>
  );
}
