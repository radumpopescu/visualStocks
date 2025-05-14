import { HashRouter, Route, Routes } from 'react-router-dom';
import MonthlyReturns from './pages/MonthlyReturns';
import DailyReturns from './pages/DailyReturns';
import ToastContainer from './components/Toast';

export default function App() {
  return (
    <>
      <ToastContainer />
      <HashRouter>
        <Routes>
          {/* Monthly Returns (Default Route) */}
          <Route path="/" element={<MonthlyReturns />} />

          {/* Daily Returns */}
          <Route path="/daily" element={<DailyReturns />} />
        </Routes>
      </HashRouter>
    </>
  );
}
