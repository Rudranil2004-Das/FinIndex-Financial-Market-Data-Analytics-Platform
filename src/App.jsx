import { Route, Routes } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import MarketWatch from "./pages/MarketWatch.jsx";
import StockDetails from "./pages/StockDetails.jsx";
import DataImport from "./pages/DataImport.jsx";
import DataValidation from "./pages/DataValidation.jsx";
import IndexManagement from "./pages/IndexManagement.jsx";
import IndexDetails from "./pages/IndexDetails.jsx";
import Analytics from "./pages/Analytics.jsx";
import Settings from "./pages/Settings.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="market" element={<MarketWatch />} />
        <Route path="stocks/:symbol" element={<StockDetails />} />
        <Route path="import" element={<DataImport />} />
        <Route path="validation" element={<DataValidation />} />
        <Route path="indices" element={<IndexManagement />} />
        <Route path="indices/:id" element={<IndexDetails />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<p className="p-6 text-muted">Page not found.</p>} />
      </Route>
    </Routes>
  );
}
