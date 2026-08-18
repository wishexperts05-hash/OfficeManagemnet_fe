import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthGate } from "./components/AuthGate";
import { InstallPrompt } from "./components/InstallPrompt";
import LoginPage from "./pages/LoginPage";
import MpinPage from "./pages/MpinPage";
import SelectCompanyPage from "./pages/SelectCompanyPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import SitesPage from "./pages/SitesPage";
import TasksPage from "./pages/TasksPage";
import ExpenditurePage from "./pages/ExpenditurePage";
import AttendancePage from "./pages/AttendancePage";
import SalaryPage from "./pages/SalaryPage";
import TrackingPage from "./pages/TrackingPage";

export default function App() {
  return (
    <BrowserRouter>
      <InstallPrompt />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mpin" element={<MpinPage />} />
        <Route element={<AuthGate />}>
          <Route path="/select-company" element={<SelectCompanyPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="sites" element={<SitesPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="expenditure" element={<ExpenditurePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="salary" element={<SalaryPage />} />
            <Route path="tracking" element={<TrackingPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
