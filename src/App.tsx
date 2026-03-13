import { Route, Routes } from "react-router-dom";

import { AvailabilityDetailPage } from "@/pages/AvailabilityDetailPage";
import { DashboardPage } from "@/pages/DashboardPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/availability" element={<AvailabilityDetailPage />} />
    </Routes>
  );
}

export default App;
