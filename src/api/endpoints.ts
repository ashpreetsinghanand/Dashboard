import { del, get, openAuthenticated, patch, post, put } from './client'
import type * as T from './types'

/** One function per backend endpoint, grouped like the Swagger tags. */
export const api = {
  auth: {
    sendOtp: (phone: string, purpose: T.OtpPurpose = 'SIGNUP') => post<T.OtpSent>('/auth/otp/send', { phone, purpose }),
    verifyOtp: (challengeId: string, otp: string) => post<T.OtpVerified>('/auth/otp/verify', { challengeId, otp }),
    signup: (body: T.SignupRequest) => post<T.Session>('/auth/signup', body),
    login: (phone: string, password: string) => post<T.Session>('/auth/login', { phone, password }),
    resetPassword: (verificationToken: string, password: string, confirmPassword: string) =>
      post<T.Session>('/auth/password/reset', { verificationToken, password, confirmPassword }),
    me: () => get<T.Profile>('/me'),
    updateMe: (body: T.UpdateProfileRequest) => patch<T.Profile>('/me', body),
  },

  reference: {
    categories: () => get<T.CategoryOption[]>('/reference/categories'),
    languages: () => get<T.LanguageOption[]>('/reference/languages'),
    commodities: () => get<T.Commodity[]>('/reference/commodities'),
  },

  dashboard: () => get<T.Dashboard>('/dashboard'),

  market: {
    prices: (category?: string, limit = 20) => get<T.CommodityPrice[]>('/market/prices', { category, limit }),
    insights: (type: T.InsightType, limit = 5) => get<T.CommodityPrice[]>('/market/insights', { type, limit }),
    watch: (commodity: string) => put<T.CommodityPrice[]>(`/market/watchlist/${encodeURIComponent(commodity)}`, {}),
    unwatch: (commodity: string) => del<T.CommodityPrice[]>(`/market/watchlist/${encodeURIComponent(commodity)}`),
  },

  warehouses: {
    search: (q: T.WarehouseSearch) => get<T.Page<T.WarehouseSummary>>('/warehouses', q),
    stats: () => get<T.WarehouseStats>('/warehouses/stats'),
    details: (id: string) => get<T.WarehouseDetails>(`/warehouses/${encodeURIComponent(id)}`),
    nearby: (id: string, limit = 4) => get<T.WarehouseSummary[]>(`/warehouses/${encodeURIComponent(id)}/nearby`, { limit }),
    mine: () => get<T.WarehouseSummary[]>('/warehouses/mine'),
    create: (body: T.WarehouseUpsert) => post<T.WarehouseDetails>('/warehouses', body),
    update: (id: string, body: T.WarehouseUpsert) => put<T.WarehouseDetails>(`/warehouses/${encodeURIComponent(id)}`, body),
    audits: (id: string, limit = 20) => get<T.WarehouseAudit[]>(`/warehouses/${encodeURIComponent(id)}/audits`, { limit }),
    audit: (id: string, body: T.WarehouseAuditRequest) => post<T.WarehouseAudit>(`/warehouses/${encodeURIComponent(id)}/audits`, body),
  },

  bookings: {
    create: (body: T.CreateBookingRequest) => post<T.Booking>('/bookings', body),
    search: (q: T.BookingSearch) => get<T.Page<T.Booking>>('/bookings', q),
    get: (id: number) => get<T.Booking>(`/bookings/${id}`),
    ledger: (id: number) => get<T.EntityProof>(`/bookings/${id}/ledger`),
    accept: (id: number, note?: string) => post<T.Booking>(`/bookings/${id}/accept`, { note }),
    reject: (id: number, note?: string) => post<T.Booking>(`/bookings/${id}/reject`, { note }),
    cancel: (id: number) => post<T.Booking>(`/bookings/${id}/cancel`),
    deposit: (id: number, body: T.DepositRequest = {}) => post<T.DepositResult>(`/bookings/${id}/deposit`, body),
  },

  enwrs: {
    search: (q: T.EnwrSearch) => get<T.Page<T.Enwr>>('/enwrs', q),
    get: (id: number) => get<T.Enwr>(`/enwrs/${id}`),
    ledger: (id: number) => get<T.EntityProof>(`/enwrs/${id}/ledger`),
    pendingInspection: (limit = 50) => get<T.Enwr[]>('/enwrs/pending-inspection', { limit }),
    inspect: (id: number, body: T.InspectionRequest) => post<T.Enwr>(`/enwrs/${id}/inspection`, body),
    release: (id: number) => post<T.Enwr>(`/enwrs/${id}/release`),
    billNextPeriod: (id: number) => post<T.Invoice>(`/enwrs/${id}/invoices`),
  },

  marketplace: {
    search: (q: T.MarketSearch) => get<T.Page<T.Listing>>('/marketplace', q),
    filters: () => get<{ regions: string[]; grades: string[] }>('/marketplace/filters'),
    lot: (listingId: number) => get<T.Listing>(`/marketplace/${listingId}`),
  },

  listings: {
    create: (body: T.CreateListingRequest) => post<T.Listing>('/listings', body),
    mine: (q: T.ListingSearch) => get<T.Page<T.Listing>>('/listings/mine', q),
    stats: () => get<T.StatTile[]>('/listings/mine/stats'),
    get: (id: number) => get<T.Listing>(`/listings/${id}`),
    update: (id: number, body: T.UpdateListingRequest) => patch<T.Listing>(`/listings/${id}`, body),
    withdraw: (id: number) => post<T.Listing>(`/listings/${id}/withdraw`),
    bids: (id: number) => get<T.Bid[]>(`/listings/${id}/bids`),
    placeBid: (id: number, body: T.PlaceBidRequest) => post<T.Bid>(`/listings/${id}/bids`, body),
    ledger: (id: number) => get<T.EntityProof>(`/listings/${id}/ledger`),
  },

  bids: {
    mine: (q: T.BidSearch) => get<T.Page<T.Bid>>('/bids/mine', q),
    stats: () => get<T.StatTile[]>('/bids/mine/stats'),
    get: (id: number) => get<T.Bid>(`/bids/${id}`),
    accept: (id: number) => post<T.Settlement>(`/bids/${id}/accept`),
    reject: (id: number) => post<T.Bid>(`/bids/${id}/reject`),
    withdraw: (id: number) => post<T.Bid>(`/bids/${id}/withdraw`),
  },

  trades: {
    mine: (q: { q?: string; page?: number; size?: number } = {}) => get<T.Page<T.Trade>>('/trades/mine', q),
    get: (id: number) => get<T.Trade>(`/trades/${id}`),
    ledger: (id: number) => get<T.EntityProof>(`/trades/${id}/ledger`),
  },

  invoices: {
    search: (q: T.InvoiceSearch) => get<T.Page<T.Invoice>>('/invoices', q),
    get: (id: number) => get<T.Invoice>(`/invoices/${id}`),
    pay: (id: number, paymentRef?: string) => post<T.Invoice>(`/invoices/${id}/pay`, { paymentRef }),
    cancel: (id: number) => post<T.Invoice>(`/invoices/${id}/cancel`),
    download: (id: number) => openAuthenticated(`/invoices/${id}/download`),
  },

  loans: {
    eligibility: (enwrId: number) => get<T.LoanEligibility>('/loans/eligibility', { enwrId }),
    apply: (enwrId: number, amount: number) => post<T.Loan>('/loans', { enwrId, amount }),
    mine: (q: { status?: T.LoanStatus; page?: number; size?: number } = {}) => get<T.Page<T.Loan>>('/loans/mine', q),
    get: (id: number) => get<T.Loan>(`/loans/${id}`),
    repay: (id: number, amount: number) => post<T.Loan>(`/loans/${id}/repay`, { amount }),
  },

  ledger: {
    verify: () => get<T.LedgerVerification>('/ledger/verify'),
    blocks: (limit = 50, beforeHeight?: number) => get<T.LedgerBlock[]>('/ledger/blocks', { limit, beforeHeight }),
    entity: (type: T.LedgerEntityType, id: string | number) => get<T.EntityProof>(`/ledger/entities/${type}/${encodeURIComponent(String(id))}`),
  },

  audits: {
    recent: (limit = 50) => get<T.WarehouseAudit[]>('/audits', { limit }),
    due: (days = 90, limit = 50) => get<T.WarehouseSummary[]>('/audits/due', { days, limit }),
  },

  health: () => get<T.Health>('/health'),
}
