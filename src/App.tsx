import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { Role } from './api/types'
import { RequireAuth } from './auth/AuthContext'
import { BookingRequestPage } from './pages/BookingRequestPage'
import { CategoryPage } from './pages/CategoryPage'
import { DashboardPage } from './pages/DashboardPage'
import { DesktopPage } from './pages/DesktopPage'
import { FindWarehousePage } from './pages/FindWarehousePage'
import { KycCallbackPage } from './pages/KycCallbackPage'
import { LanguagePage } from './pages/LanguagePage'
import { LoansPage } from './pages/LoansPage'
import { LoginPage } from './pages/LoginPage'
import { MarketplacePage } from './pages/MarketplacePage'
import { OtpPage } from './pages/OtpPage'
import { PasswordPage } from './pages/PasswordPage'
import { PhonePage } from './pages/PhonePage'
import { PriceAlertsPage } from './pages/PriceAlertsPage'
import { SettingsPage } from './pages/SettingsPage'
import { StorageInvoicePage } from './pages/StorageInvoicePage'
import { TradePage } from './pages/TradePage'
import { WarehouseDetailPage } from './pages/WarehouseDetailPage'
import { InspectionsPage } from './pages/audit/InspectionsPage'
import { LedgerExplorerPage } from './pages/audit/LedgerExplorerPage'
import { WarehouseAuditsPage } from './pages/audit/WarehouseAuditsPage'
import { MyWarehousesPage } from './pages/owner/MyWarehousesPage'
import { OwnerReceiptsPage } from './pages/owner/OwnerReceiptsPage'

// Signed-in only; `roles` also limits who may open the page (the backend enforces the same rules).
const p = (element: ReactNode, roles?: Role[]) => <RequireAuth roles={roles}>{element}</RequireAuth>
const TRADERS: Role[] = ['FARMER', 'MERCHANT']

export default function App() {
  return (
    <Routes>
      {/* public: landing, sign-in/up, warehouse search and details, marketplace */}
      <Route path="/" element={<DesktopPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LanguagePage />} />
      <Route path="/signup/category" element={<CategoryPage />} />
      <Route path="/signup/phone" element={<PhonePage />} />
      <Route path="/signup/otp" element={<OtpPage />} />
      <Route path="/signup/password" element={<PasswordPage />} />
      {/* the app pages need a session; signed-out visitors land on sign-in and come back here afterwards */}
      <Route path="/store" element={p(<FindWarehousePage />)} />
      <Route path="/store/:id" element={p(<WarehouseDetailPage />)} />
      <Route path="/marketplace" element={p(<MarketplacePage />)} />

      <Route path="/dashboard" element={p(<DashboardPage />)} />
      <Route path="/store/booking" element={p(<BookingRequestPage />)} />
      <Route path="/store/invoice" element={p(<StorageInvoicePage />)} />
      <Route path="/trade/enwr" element={p(<TradePage page="enwr" />, TRADERS)} />
      <Route path="/trade/listing" element={p(<TradePage page="listing" />, TRADERS)} />
      <Route path="/trade/bid" element={p(<TradePage page="bid" />, ['MERCHANT'])} />
      <Route path="/trade/history" element={p(<TradePage page="history" />, TRADERS)} />
      <Route path="/trade/loans" element={p(<LoansPage />, TRADERS)} />
      <Route path="/alerts" element={p(<PriceAlertsPage />)} />
      <Route path="/kyc/callback" element={p(<KycCallbackPage />)} />
      <Route path="/settings" element={p(<SettingsPage />)} />
      <Route path="/owner/warehouses" element={p(<MyWarehousesPage />, ['WAREHOUSE_OWNER'])} />
      <Route path="/owner/receipts" element={p(<OwnerReceiptsPage />, ['WAREHOUSE_OWNER'])} />
      <Route path="/audit/inspections" element={p(<InspectionsPage />, ['AUDITOR'])} />
      <Route path="/audit/warehouses" element={p(<WarehouseAuditsPage />, ['AUDITOR'])} />
      <Route path="/audit/ledger" element={p(<LedgerExplorerPage />, ['AUDITOR'])} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
