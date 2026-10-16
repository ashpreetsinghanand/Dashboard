import { Navigate, Route, Routes } from 'react-router-dom'
import { CategoryPage } from './pages/CategoryPage'
import { DashboardPage } from './pages/DashboardPage'
import { DesktopPage } from './pages/DesktopPage'
import { LanguagePage } from './pages/LanguagePage'
import { OtpPage } from './pages/OtpPage'
import { FindWarehousePage } from './pages/FindWarehousePage'
import { PasswordPage } from './pages/PasswordPage'
import { PhonePage } from './pages/PhonePage'
import { WarehouseDetailPage } from './pages/WarehouseDetailPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DesktopPage />} />
      <Route path="/signup" element={<LanguagePage />} />
      <Route path="/signup/category" element={<CategoryPage />} />
      <Route path="/signup/phone" element={<PhonePage />} />
      <Route path="/signup/otp" element={<OtpPage />} />
      <Route path="/signup/password" element={<PasswordPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/store" element={<FindWarehousePage />} />
      <Route path="/store/:id" element={<WarehouseDetailPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
