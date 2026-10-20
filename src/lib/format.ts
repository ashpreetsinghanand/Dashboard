import type { BidStatus, BookingStatus, EnwrStatus, InvoiceStatus, ListingStatus, LoanStatus, StatTile } from '../api/types'

/** 'yyyy-MM-dd' (API) -> 'dd/MM/yyyy' (UI). Also accepts ISO timestamps. */
export function toUiDate(iso: string | null | undefined): string {
  if (!iso) return '-'
  // a timestamp ("…T21:35:00Z") is the viewer's local day; slicing it would show the UTC day, a day early in India before 05:30
  if (iso.includes('T')) return new Date(iso).toLocaleDateString('en-GB')
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
console.assert(toUiDate('2026-10-30') === '30/10/2026' && toUiDate(null) === '-')

/** 'dd/MM/yyyy' (Book Now modal) -> 'yyyy-MM-dd' (API). Returns undefined when the text is not a full date. */
export function toApiDate(ui: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(ui.trim())
  return match ? `${match[3]}-${match[2]}-${match[1]}` : undefined
}

export function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function money(value: number | null | undefined, currency = 'INR'): string {
  if (value === null || value === undefined) return '-'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export const mt = (value: number | null | undefined) => (value === null || value === undefined ? '-' : `${trim(value)} MT`)
export const qtl = (value: number | null | undefined) => (value === null || value === undefined ? '-' : `${trim(value)} Qtl`)
export const perMt = (value: number, currency = 'INR') => `${money(value, currency)}/MT`
export const perKg = (value: number, currency = 'INR') => `${money(value, currency)}/KG`
export const pct = (value: number) => `${value > 0 ? '+' : ''}${value}%`

function trim(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(value)
}

/** Renders a StatTile value according to its unit. */
export function statValue(tile: StatTile, currency = 'INR'): string {
  switch (tile.unit) {
    case 'MT': return mt(tile.value)
    case 'QTL': return qtl(tile.value)
    case 'CURRENCY': return money(tile.value, currency)
    default: return new Intl.NumberFormat('en-IN').format(tile.value)
  }
}

/** Short ledger hash for display, e.g. 0d5460b4…98e5f2 */
export const shortHash = (hash: string | null | undefined) => (hash ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : '-')

type AnyStatus = BookingStatus | EnwrStatus | ListingStatus | BidStatus | InvoiceStatus | LoanStatus

/**
 * API status -> text for the existing StatusPill. The pill's tones are keyed by label
 * (Pending, Accepted, Rejected, Paid, Active, Overdue, Draft, Cancelled); add tones for the new labels.
 */
const LABELS: Record<AnyStatus, string> = {
  PENDING: 'Pending', ACCEPTED: 'Accepted', REJECTED: 'Rejected', CANCELLED: 'Cancelled', DEPOSITED: 'Stored',
  PENDING_AUDIT: 'Awaiting Audit', ACTIVE: 'Active', LISTED: 'Listed', PLEDGED: 'Pledged', SOLD: 'Sold', RELEASED: 'Released',
  UNDER_OFFER: 'Under Offer', WITHDRAWN: 'Withdrawn', EXPIRED: 'Expired', OVERDUE: 'Overdue', PAID: 'Paid', CLOSED: 'Closed',
}

export const statusLabel = (status: AnyStatus) => LABELS[status] ?? status

/** Extra StatusPill tones for labels the mock-ups did not have. Merge into `tones` in RequestLayout.tsx. */
export const extraTones: Record<string, string> = {
  Stored: 'bg-[#E7F6EE] text-[#1F8955]',
  'Awaiting Audit': 'bg-[#FFF6DE] text-[#B54708]',
  Listed: 'bg-[#EAF3FF] text-[#2F6BFF]',
  Pledged: 'bg-[#F3E8FF] text-[#7E22CE]',
  Sold: 'bg-[#F2F4F7] text-[#344054]',
  Released: 'bg-[#F2F4F7] text-[#667085]',
  'Under Offer': 'bg-[#EAF3FF] text-[#2F6BFF]',
  Withdrawn: 'bg-[#F2F4F7] text-[#667085]',
  Expired: 'bg-[#F2F4F7] text-[#667085]',
  Closed: 'bg-[#F2F4F7] text-[#667085]',
}
