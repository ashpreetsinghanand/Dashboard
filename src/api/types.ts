// Types for the KRSI API. They mirror the Java DTOs; regenerate from /v3/api-docs with openapi-typescript if you prefer.
// Dates: LocalDate fields are 'yyyy-MM-dd' strings, Instant fields are ISO-8601 UTC strings. Money and quantities are numbers.

export type Role = 'FARMER' | 'MERCHANT' | 'WAREHOUSE_OWNER' | 'AUDITOR'
export type Category = 'farmer' | 'fpo' | 'trader' | 'fpu' | 'warehouse_owner' | 'auditor'
export type OtpPurpose = 'SIGNUP' | 'LOGIN' | 'RESET_PASSWORD'
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'DEPOSITED'
export type EnwrStatus = 'PENDING_AUDIT' | 'ACTIVE' | 'LISTED' | 'PLEDGED' | 'SOLD' | 'RELEASED' | 'REJECTED'
export type ListingStatus = 'ACTIVE' | 'UNDER_OFFER' | 'SOLD' | 'WITHDRAWN' | 'EXPIRED'
export type BidStatus = 'ACTIVE' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
export type InvoiceStatus = 'PENDING' | 'OVERDUE' | 'PAID' | 'CANCELLED'
export type LoanStatus = 'ACTIVE' | 'CLOSED'
export type AuditResult = 'PASSED' | 'PASSED_WITH_OBSERVATIONS' | 'FAILED'

// ---------- envelope ----------
export type ErrorCode =
  | 'INVALID_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'METHOD_NOT_ALLOWED' | 'CONFLICT'
  | 'INVALID_STATE' | 'OTP_INVALID' | 'OTP_EXPIRED' | 'RATE_LIMITED' | 'DEPENDENCY_UNAVAILABLE' | 'INTERNAL_ERROR' | 'KYC_REQUIRED'
export interface FieldIssue { field: string; message: string }
export interface ApiError { code: ErrorCode; message: string; details: FieldIssue[] }
export interface ApiResponse<T> { success: boolean; data: T | null; error: ApiError | null; traceId: string; timestamp: string }
export interface Page<T> { items: T[]; page: number; size: number; totalItems: number; totalPages: number }

// ---------- auth ----------
export interface OtpSent { challengeId: string; phoneMasked: string; expiresInSeconds: number; resendAfterSeconds: number; devOtp: string | null }
export interface OtpVerified { verificationToken: string; expiresInSeconds: number; phoneRegistered: boolean }
export interface Profile {
  id: number; phone: string; fullName: string | null; displayName: string; role: Role; category: Category; categoryLabel: string
  language: string; district: string | null; state: string | null; latitude: number | null; longitude: number | null
  walletAddress: string; createdAt: string
}
export interface Session { accessToken: string; tokenType: 'Bearer'; expiresInSeconds: number; expiresAt: string; user: Profile }
export interface SignupRequest {
  verificationToken: string; password: string; confirmPassword: string; category: Category; language?: string; fullName?: string
}
export interface UpdateProfileRequest {
  fullName?: string; language?: string; district?: string; state?: string; latitude?: number; longitude?: number
}

// ---------- reference & market ----------
export interface CategoryOption { id: Category; label: string; role: Role; selfSignup: boolean }
export interface LanguageOption { code: string; label: string }
export interface Commodity { name: string; category: string; imageUrl: string }
export interface CommodityPrice {
  commodity: string; category: string; grade: string; imageUrl: string; pricePerKg: number; pricePerMt: number
  previousPricePerKg: number; changePct: number; bestMarket: string; updatedAt: string; watched: boolean
}
export type InsightType = 'GAINERS' | 'LOSERS' | 'WATCHLIST'

// ---------- dashboard ----------
export type StatUnit = 'MT' | 'QTL' | 'CURRENCY' | 'COUNT'
export interface StatTile { key: string; label: string; value: number; unit: StatUnit; note: string | null }
export interface DashboardTask { type: string; id: number; title: string; subtitle: string; status: string; route: string }
export interface Dashboard {
  role: Role; displayName: string; location: string | null; currency: string
  activity: StatTile[]; tasks: DashboardTask[]; marketPrices: CommodityPrice[]
}

// ---------- kyc ----------
export interface KycStatus { status: 'NONE' | 'VERIFIED'; verifiedAt: string | null; fullName: string | null; aadhaarLast4: string | null; provider: string | null; requiredForBooking: boolean }
export interface KycStart { requestId: string; url: string; provider: string }

// ---------- warehouses ----------
export type WarehouseSort = 'NEAREST' | 'CAPACITY' | 'NAME' | 'RATING'
export interface WarehouseSearch {
  q?: string; commodity?: string; lat?: number; lng?: number; radiusKm?: number
  minAvailableMt?: number; maxAvailableMt?: number; verifiedOnly?: boolean; sort?: WarehouseSort; page?: number; size?: number
}
export interface WarehouseSummary {
  id: string; name: string; address: string; district: string; state: string; distanceKm: number | null
  totalCapacityMt: number; availableCapacityMt: number; storageRatePerMtMonth: number; crops: string[]; imageUrl: string
  wdraRegistered: boolean; verified: boolean; rating: number; ratingCount: number
}
export interface Attribute { label: string; value: string }
export interface WarehouseAudit {
  id: number; code: string; warehouseId: string; warehouseName: string; auditorId: number; auditorName: string; auditedOn: string
  result: AuditResult; rating: number; stockRecordedMt: number; stockVerifiedMt: number; varianceMt: number; findings: string
  ledgerHash: string | null; createdAt: string
}
export interface WarehouseDetails {
  id: string; name: string; legalName: string; code: string; operator: string; type: string; description: string
  address: string; district: string; state: string; latitude: number; longitude: number
  totalCapacityMt: number; availableCapacityMt: number; occupancyMt: number; storageRatePerMtMonth: number; currency: string
  crops: string[]; amenities: string[]; licenses: string[]; photos: string[]; infrastructure: Attribute[]
  suitableFor: string; accessHours: string; connectivity: string; yearEstablished: number | null; totalAreaSqft: number | null
  rating: number; ratingCount: number; wdraRegistered: boolean; verified: boolean; ownerId: number; ownerName: string
  latestAudit: WarehouseAudit | null; ledgerHash: string | null; createdAt: string
}
export interface WarehouseStats {
  verifiedWarehouses: number; totalWarehouses: number; totalCapacityMt: number; qualityVerifiedPercent: number; statesCovered: number
}
export interface WarehouseUpsert {
  slug?: string; name: string; legalName: string; code: string; operator: string; type?: string; description?: string
  address: string; district: string; state: string; latitude: number; longitude: number
  totalCapacityMt: number; storageRatePerMtMonth: number; crops: string[]; amenities?: string[]; licenses?: string[]
  photos?: string[]; suitableFor?: string; accessHours?: string; connectivity?: string; yearEstablished?: number
  totalAreaSqft?: number; wdraRegistered?: boolean; infrastructure?: Attribute[]
}
export interface WarehouseAuditRequest {
  result: AuditResult; rating: number; stockVerifiedMt: number; findings: string; auditedOn?: string
}

// ---------- bookings ----------
export interface Booking {
  id: number; code: string; commodity: string; grade: string; imageUrl: string; quantityQtl: number; quantityMt: number
  preferredDate: string; status: BookingStatus; warehouseId: string; warehouseName: string; warehouseLocation: string
  depositorId: number; depositorName: string; decisionNote: string | null; createdAt: string; decidedAt: string | null
  enwrId: number | null; ledgerHash: string | null
}
export interface CreateBookingRequest { warehouseId: string; commodity: string; grade?: string; quantityQtl: number; preferredDate: string }
export interface BookingSearch { q?: string; status?: BookingStatus; commodity?: string; date?: string; warehouseId?: string; page?: number; size?: number }
export interface DepositRequest { netWeightMt?: number; grade?: string; storedOn?: string; moisturePct?: number }
export interface DepositResult { booking: Booking; receipt: Enwr; invoice: Invoice }

// ---------- eNWR ----------
export interface EnwrActions { canList: boolean; canApplyLoan: boolean; canInspect: boolean; canRelease: boolean }
export interface Enwr {
  id: number; receiptNo: string; commodity: string; grade: string; imageUrl: string; quantityMt: number
  warehouseId: string; warehouseName: string; warehouseLocation: string; ownerId: number; ownerName: string; depositorId: number
  storedOn: string; validTill: string; daysRemaining: number; status: EnwrStatus
  moisturePct: number | null; foreignMatterPct: number | null; qualityRemarks: string | null
  inspectedBy: string | null; inspectedAt: string | null; marketPricePerMt: number | null; estimatedValue: number | null
  bookingId: number | null; parentId: number | null; activeListingId: number | null; activeLoanId: number | null
  actions: EnwrActions; ledgerHash: string | null; createdAt: string
}
export interface EnwrSearch { q?: string; commodity?: string; status?: EnwrStatus; warehouseId?: string; page?: number; size?: number }
export interface InspectionRequest {
  decision: 'APPROVE' | 'REJECT'; grade: string; moisturePct?: number; foreignMatterPct?: number; remarks?: string
}

// ---------- trade ----------
export interface Listing {
  id: number; code: string; enwrId: number; receiptNo: string; commodity: string; grade: string; category: string; imageUrl: string
  warehouseId: string; warehouseName: string; region: string; state: string; warehouseVerified: boolean
  sellerId: number; sellerName: string; quantityMt: number; originalQuantityMt: number; askingPricePerMt: number
  minQuantityMt: number; totalValue: number; storedOn: string; validTill: string; receiptDaysRemaining: number
  validUntil: string; status: ListingStatus; offers: number; bestBidPerMt: number | null; createdAt: string; ledgerHash: string | null
}
export interface CreateListingRequest { enwrId: number; askingPricePerMt: number; minQuantityMt?: number; validDays?: number }
export interface UpdateListingRequest { askingPricePerMt?: number; minQuantityMt?: number; validDays?: number }
export interface ListingSearch { q?: string; commodity?: string; status?: ListingStatus; page?: number; size?: number }
export type MarketSort = 'LATEST' | 'NAME' | 'PRICE_LOW' | 'PRICE_HIGH'
export interface MarketSearch {
  q?: string; category?: string; region?: string; grade?: string; minQuantityMt?: number; maxQuantityMt?: number
  verifiedOnly?: boolean; sort?: MarketSort; page?: number; size?: number
}
export interface Bid {
  id: number; code: string; listingId: number; listingCode: string; receiptNo: string; commodity: string; grade: string
  imageUrl: string; warehouseName: string; buyerId: number; buyerName: string; sellerId: number; quantityMt: number
  pricePerMt: number; totalValue: number; status: BidStatus; createdAt: string; decidedAt: string | null
  tradeId: number | null; ledgerHash: string | null
}
export interface PlaceBidRequest { quantityMt: number; pricePerMt: number }
export interface BidSearch { q?: string; commodity?: string; status?: BidStatus; page?: number; size?: number }
export interface Trade {
  id: number; code: string; listingId: number; bidId: number; commodity: string; grade: string; imageUrl: string
  quantityMt: number; pricePerMt: number; totalValue: number; sellerId: number; sellerName: string; buyerId: number
  buyerName: string; side: 'BUY' | 'SELL'; sourceReceiptNo: string; buyerReceiptNo: string; buyerEnwrId: number
  warehouseName: string; settledAt: string; ledgerHash: string | null
}
export interface Settlement { trade: Trade; listing: Listing; buyerReceipt: Enwr }

// ---------- invoices & loans ----------
export interface Invoice {
  id: number; invoiceNo: string; commodity: string; grade: string; imageUrl: string; quantityMt: number; enwrId: number
  receiptNo: string; warehouseId: string; warehouseName: string; warehouseLocation: string; depositorId: number
  depositorName: string; periodFrom: string; periodTo: string; storageDays: number; ratePerMtMonth: number; amount: number
  currency: string; dueDate: string; status: InvoiceStatus; paidAt: string | null; paymentRef: string | null
  createdAt: string; ledgerHash: string | null
}
export interface InvoiceSearch { q?: string; status?: InvoiceStatus; commodity?: string; page?: number; size?: number }
export interface Loan {
  id: number; code: string; borrowerId: number; enwrId: number; receiptNo: string; commodity: string; quantityMt: number
  principal: number; outstanding: number; interestRatePct: number; currency: string; status: LoanStatus
  sanctionedAt: string; closedAt: string | null; ledgerHash: string | null
}
export interface LoanEligibility {
  enwrId: number; receiptNo: string; eligible: boolean; reason: string | null; marketValue: number; loanToValue: number
  maxAmount: number; interestRatePct: number; currency: string
}

// ---------- ledger ----------
export interface LedgerBlock {
  height: number; hash: string; prevHash: string; createdAtMs: number; timestamp: string; eventType: string
  entityType: string; entityId: string; actorAddress: string; payload: Record<string, unknown>
}
export interface EntityProof { entityType: string; entityId: string; intact: boolean; blocks: LedgerBlock[] }
export interface LedgerVerification {
  valid: boolean; blocksChecked: number; headHeight: number; headHash: string | null
  firstInvalidHeight: number | null; problem: string | null; durationMs: number; verifiedAt: string
}
export type LedgerEntityType = 'SYSTEM' | 'USER' | 'WAREHOUSE' | 'BOOKING' | 'ENWR' | 'LISTING' | 'BID' | 'TRADE' | 'INVOICE' | 'LOAN' | 'AUDIT'
export interface Health { status: 'UP' | 'DOWN'; database: string; ledgerBlocks: number }
