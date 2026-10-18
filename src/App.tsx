import { Navigate, Route, Routes } from 'react-router-dom'
import { CategoryPage } from './pages/CategoryPage'
import { DashboardPage } from './pages/DashboardPage'
import { DesktopPage } from './pages/DesktopPage'
import { LanguagePage } from './pages/LanguagePage'
import { LoginPage } from './pages/LoginPage'
import { OtpPage } from './pages/OtpPage'
import { BookingRequestPage } from './pages/BookingRequestPage'
import { FindWarehousePage } from './pages/FindWarehousePage'
import { MarketplacePage } from './pages/MarketplacePage'
import { PasswordPage } from './pages/PasswordPage'
import { PhonePage } from './pages/PhonePage'
import { StorageInvoicePage } from './pages/StorageInvoicePage'
import { TradePage } from './pages/TradePage'
import { WarehouseDetailPage } from './pages/WarehouseDetailPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DesktopPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LanguagePage />} />
      <Route path="/signup/category" element={<CategoryPage />} />
      <Route path="/signup/phone" element={<PhonePage />} />
      <Route path="/signup/otp" element={<OtpPage />} />
      <Route path="/signup/password" element={<PasswordPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/store" element={<FindWarehousePage />} />
      <Route path="/store/booking" element={<BookingRequestPage />} />
      <Route path="/store/invoice" element={<StorageInvoicePage />} />
      <Route path="/store/:id" element={<WarehouseDetailPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/trade/enwr" element={<TradePage page="enwr" />} />
      <Route path="/trade/listing" element={<TradePage page="listing" />} />
      <Route path="/trade/bid" element={<TradePage page="bid" />} />
      <Route path="/trade/history" element={<TradePage page="history" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
