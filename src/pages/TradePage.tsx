import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { Bid, Enwr, Listing, ListingStatus, Page, StatTile, Trade } from '../api/types'
import { DashboardShell, type TradePage as TradePageName } from '../components/DashboardShell'
import { StatusPill } from '../components/RequestLayout'
import { ConfirmModal, Pager } from '../components/trade/shared'
import { linkBtn } from '../components/trade/styles'
import {
  BidDetailsModal,
  EditListingModal,
  EnwrDetailsModal,
  ListingDetailsModal,
  ListOnMarketModal,
  LoanApplyModal,
  OffersModal,
  TradeLedgerModal,
} from '../components/trade/TradeModals'
import { ErrorBanner } from '../components/ui'
import type { ApiRequestError } from '../api/client'
import { money, mt, perMt, shortHash, statusLabel, statValue, toUiDate } from '../lib/format'
import { useApi } from '../lib/useApi'

const enwrCopy = 'Buy and sell verified eNWRs from trusted warehouses across India.'

const enwrCols = 'grid-cols-[80fr_82fr_80fr_62fr_76fr_62fr_92fr_100fr_62fr_86fr_83fr]'
const deskCols = 'grid-cols-[93fr_66fr_91fr_76fr_85fr_75fr_98fr_90fr_106fr_85fr]'
const bidCols = 'grid-cols-[93fr_112fr_114fr_99fr_140fr_134fr_87fr_86fr]'
const historyCols = 'grid-cols-[100fr_60fr_120fr_70fr_115fr_115fr_110fr_85fr_90fr]'
const listingChips: Record<string, ListingStatus | undefined> = {
  'All Listings': undefined,
  Active: 'ACTIVE',
  'Under Offer': 'UNDER_OFFER',
  Sold: 'SOLD',
  Expired: 'EXPIRED',
}
const OPEN_LISTING: ListingStatus[] = ['ACTIVE', 'UNDER_OFFER']

export function TradePage({ page }: { page: 'enwr' | 'listing' | 'bid' | 'history' }) {
  if (page === 'listing') return <ListingBoard />
  if (page === 'bid') return <BidBoard />
  if (page === 'history') return <HistoryBoard />
  return <EnwrBoard />
}

/** Commodity chips from the reference list (canonical names). */
function useCommodityChips(all: string) {
  const { data } = useApi(() => api.reference.commodities(), [])
  return [all, ...(data?.map((c) => c.name) ?? [])]
}

/** Loading / error / empty states shared by every board. Renders the rows only when there are some. */
function Rows<T>({
  state,
  empty,
  children,
}: {
  state: { data: Page<T> | undefined; loading: boolean; error: ApiRequestError | undefined; reload: () => void }
  empty: string
  children: (items: T[]) => ReactNode
}) {
  if (state.error) return <div className="mt-2"><ErrorBanner error={state.error} onRetry={state.reload} /></div>
  if (state.loading && !state.data) return <EmptyNote>Loading…</EmptyNote>
  if (!state.data?.items.length) return <EmptyNote>{empty}</EmptyNote>
  return <div className={state.loading ? 'opacity-60' : ''}>{children(state.data.items)}</div>
}

type EnwrModal = { kind: 'details' | 'loan' | 'list'; enwr: Enwr }

function EnwrBoard() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [chip, setChip] = useState('All eNWR')
  const [page, setPage] = useState(0)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [modal, setModal] = useState<EnwrModal>()
  const chips = useCommodityChips('All eNWR')
  const state = useApi(
    () => api.enwrs.search({ q: applied || undefined, commodity: chip === 'All eNWR' ? undefined : chip, page }),
    [applied, chip, page],
  )
  // Min. Quantity lives on the receipt's active listing
  const listings = useApi(() => api.listings.mine({ size: 100 }), [])
  const minQty = (enwr: Enwr) => listings.data?.items.find((l) => l.id === enwr.activeListingId)?.minQuantityMt
  const reload = () => {
    state.reload()
    listings.reload()
  }

  return (
    <TradeDesk
      tradePage="My eNWR"
      crumb="My eNWR"
      subtitle={enwrCopy}
      search={<BoardSearch label="Search My eNWR" query={query} onQuery={setQuery} onSearch={() => { setApplied(query.trim()); setPage(0) }} />}
    >
      <FilterRow chips={chips} chip={chip} onChip={(value) => { setChip(value); setPage(0) }} view={view} onView={setView} />
      <div className="mt-[15px]">
        <div className={`grid h-[50px] ${enwrCols} items-center bg-white pl-[15px] text-[12px] text-[#98A2B3]`}>
          <span>Commodity</span>
          <span>Details</span>
          <span>Warehouse</span>
          <span>Quantity</span>
          <span>Stored On</span>
          <span>Valid Till</span>
          <span>Asking Price</span>
          <span>Total Value</span>
          <span>Min. Qty</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <Rows state={state} empty="No eNWRs match these filters.">
          {(items) =>
            items.map((row) => (
              <div key={row.id} className={`mt-2 grid h-[90px] ${enwrCols} items-center rounded-[12px] bg-white pl-[15px] text-[13px]`}>
                <PhotoCell src={row.imageUrl} />
                <DetailStack name={row.commodity} grade={row.grade} code={row.receiptNo} />
                <span className="pr-2 leading-[15px]">{row.warehouseName}</span>
                <span>{mt(row.quantityMt)}</span>
                <span>{toUiDate(row.storedOn)}</span>
                <span>{row.daysRemaining} Days</span>
                <span>{row.marketPricePerMt === null ? '-' : perMt(row.marketPricePerMt)}</span>
                <span>{money(row.estimatedValue)}</span>
                <span>{row.activeListingId ? mt(minQty(row)) : '-'}</span>
                <StatusPill status={statusLabel(row.status)} className="justify-self-start" />
                <span className="grid justify-items-start gap-1 text-[12px] leading-4 font-medium whitespace-nowrap text-[#1F8955]">
                  <button type="button" onClick={() => setModal({ kind: 'details', enwr: row })}>
                    View Details
                  </button>
                  {row.actions.canApplyLoan ? (
                    <button type="button" onClick={() => setModal({ kind: 'loan', enwr: row })}>
                      Apply For Loan
                    </button>
                  ) : null}
                  {row.actions.canList ? (
                    <button type="button" onClick={() => setModal({ kind: 'list', enwr: row })}>
                      List On Market
                    </button>
                  ) : null}
                </span>
              </div>
            ))
          }
        </Rows>
        <Pager page={page} totalPages={state.data?.totalPages ?? 0} onPage={setPage} />
      </div>
      {modal?.kind === 'details' ? <EnwrDetailsModal enwr={modal.enwr} onClose={() => setModal(undefined)} /> : null}
      {modal?.kind === 'loan' ? <LoanApplyModal enwr={modal.enwr} onClose={() => setModal(undefined)} onDone={reload} /> : null}
      {modal?.kind === 'list' ? <ListOnMarketModal enwr={modal.enwr} onClose={() => setModal(undefined)} onDone={reload} /> : null}
    </TradeDesk>
  )
}

type ListingModal = { kind: 'details' | 'edit' | 'offers' | 'withdraw'; listing: Listing }

function ListingBoard() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [chip, setChip] = useState('All Listings')
  const [page, setPage] = useState(0)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [modal, setModal] = useState<ListingModal>()
  const stats = useApi(() => api.listings.stats(), [])
  const state = useApi(() => api.listings.mine({ q: applied || undefined, status: listingChips[chip], page }), [applied, chip, page])
  const reload = () => {
    state.reload()
    stats.reload()
  }
  const close = () => setModal(undefined)

  return (
    <TradeDesk
      tradePage="My Listing"
      crumb="My Listing"
      subtitle="Manage your listed eNWRs and track buyer activity."
      search={<BoardSearch label="Search My Listing" query={query} onQuery={setQuery} onSearch={() => { setApplied(query.trim()); setPage(0) }} />}
    >
      <FilterRow chips={Object.keys(listingChips)} chip={chip} onChip={(value) => { setChip(value); setPage(0) }} view={view} onView={setView} />
      <StatRow stats={stats.data} error={stats.error} onRetry={stats.reload} />
      <div className="mt-[15px]">
        <div className={`grid h-[50px] ${deskCols} items-center bg-white pl-[15px] text-[12px] text-[#98A2B3]`}>
          <span>Commodity</span>
          <span>Details</span>
          <span>Warehouse</span>
          <span>Quantity</span>
          <span>Stored On</span>
          <span>Valid Till</span>
          <span>Asking Price</span>
          <span>Offers</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <Rows state={state} empty="No listings match these filters.">
          {(items) =>
            items.map((row) => {
              const open = OPEN_LISTING.includes(row.status)
              return (
                <div key={row.id} className={`mt-2 grid h-[90px] ${deskCols} items-center rounded-[12px] bg-white pl-[15px] text-[13px]`}>
                  <PhotoCell src={row.imageUrl} />
                  <DetailStack name={row.commodity} grade={row.grade} code={row.receiptNo} />
                  <span className="pr-2 leading-[15px]">{row.warehouseName}</span>
                  <span className="leading-[15px]">
                    {mt(row.quantityMt)}
                    {row.quantityMt !== row.originalQuantityMt ? (
                      <span className="block text-[11px] text-[#98A2B3]">of {mt(row.originalQuantityMt)}</span>
                    ) : null}
                  </span>
                  <span>{toUiDate(row.storedOn)}</span>
                  <span>{row.receiptDaysRemaining} Days</span>
                  <span>{perMt(row.askingPricePerMt)}</span>
                  <span>{row.offers}</span>
                  <StatusPill status={statusLabel(row.status)} className="justify-self-start" />
                  <span className="grid justify-items-start gap-1 text-[12px] leading-4 font-medium whitespace-nowrap text-[#1F8955]">
                    <button type="button" onClick={() => setModal({ kind: 'details', listing: row })}>
                      View Details
                    </button>
                    {open ? (
                      <button type="button" onClick={() => setModal({ kind: 'edit', listing: row })}>
                        Edit Listing
                      </button>
                    ) : null}
                    <button type="button" onClick={() => setModal({ kind: 'offers', listing: row })}>
                      View Offer
                    </button>
                    {open ? (
                      <button type="button" onClick={() => setModal({ kind: 'withdraw', listing: row })}>
                        Withdraw
                      </button>
                    ) : null}
                  </span>
                </div>
              )
            })
          }
        </Rows>
        <Pager page={page} totalPages={state.data?.totalPages ?? 0} onPage={setPage} />
      </div>
      {modal?.kind === 'details' ? <ListingDetailsModal id={modal.listing.id} onClose={close} /> : null}
      {modal?.kind === 'edit' ? <EditListingModal listing={modal.listing} onClose={close} onDone={reload} /> : null}
      {modal?.kind === 'offers' ? <OffersModal listing={modal.listing} onClose={close} onDone={reload} /> : null}
      {modal?.kind === 'withdraw' ? (
        <ConfirmModal
          title={`Withdraw ${modal.listing.code}?`}
          message={`${modal.listing.commodity} (${mt(modal.listing.quantityMt)}) comes off the marketplace and open offers on it are closed.`}
          confirmLabel="Withdraw"
          action={() => api.listings.withdraw(modal.listing.id)}
          onClose={close}
          onDone={reload}
        />
      ) : null}
    </TradeDesk>
  )
}

type BidModal = { kind: 'details' | 'withdraw'; bid: Bid }

function BidBoard() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [chip, setChip] = useState('All Commodities')
  const [page, setPage] = useState(0)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [modal, setModal] = useState<BidModal>()
  const chips = useCommodityChips('All Commodities')
  const stats = useApi(() => api.bids.stats(), [])
  const state = useApi(
    () => api.bids.mine({ q: applied || undefined, commodity: chip === 'All Commodities' ? undefined : chip, page }),
    [applied, chip, page],
  )
  const reload = () => {
    state.reload()
    stats.reload()
  }
  const close = () => setModal(undefined)

  return (
    <TradeDesk
      tradePage="My Bid"
      crumb="My Bid"
      subtitle="View and manage your active bids on eNWRs and commodities."
      search={<BoardSearch label="Search My Bid" query={query} onQuery={setQuery} onSearch={() => { setApplied(query.trim()); setPage(0) }} />}
    >
      <FilterRow chips={chips} chip={chip} onChip={(value) => { setChip(value); setPage(0) }} view={view} onView={setView} />
      <StatRow stats={stats.data} error={stats.error} onRetry={stats.reload} />
      <div className="mt-[15px]">
        <div className={`grid h-[50px] ${bidCols} items-center bg-white pl-[15px] text-[12px] text-[#98A2B3]`}>
          <span>Commodity</span>
          <span>Details</span>
          <span>Warehouse</span>
          <span>Quantity</span>
          <span>Bid Price(₹/MT)</span>
          <span>Total Bid Value</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <Rows state={state} empty="No bids match these filters.">
          {(items) =>
            items.map((row) => (
              <div key={row.id} className={`mt-2 grid h-[90px] ${bidCols} items-center rounded-[12px] bg-white pl-[15px] text-[13px]`}>
                <PhotoCell src={row.imageUrl} />
                <DetailStack name={row.commodity} grade={row.grade} code={row.code} />
                <span className="pr-2 leading-[15px]">{row.warehouseName}</span>
                <span>{mt(row.quantityMt)}</span>
                <span>{perMt(row.pricePerMt)}</span>
                <span>{money(row.totalValue)}</span>
                <StatusPill status={statusLabel(row.status)} className="w-[60px] justify-self-start" />
                <span className="grid justify-items-start gap-1">
                  <button type="button" onClick={() => setModal({ kind: 'details', bid: row })} className={linkBtn}>
                    View Details
                  </button>
                  {row.status === 'ACTIVE' ? (
                    <button type="button" onClick={() => setModal({ kind: 'withdraw', bid: row })} className={linkBtn}>
                      Withdraw
                    </button>
                  ) : null}
                </span>
              </div>
            ))
          }
        </Rows>
        <Pager page={page} totalPages={state.data?.totalPages ?? 0} onPage={setPage} />
      </div>
      {modal?.kind === 'details' ? <BidDetailsModal id={modal.bid.id} onClose={close} /> : null}
      {modal?.kind === 'withdraw' ? (
        <ConfirmModal
          title={`Withdraw ${modal.bid.code}?`}
          message={`Your bid of ${mt(modal.bid.quantityMt)} at ${perMt(modal.bid.pricePerMt)} on ${modal.bid.listingCode} will be withdrawn.`}
          confirmLabel="Withdraw Bid"
          action={() => api.bids.withdraw(modal.bid.id)}
          onClose={close}
          onDone={reload}
        />
      ) : null}
    </TradeDesk>
  )
}

function HistoryBoard() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [page, setPage] = useState(0)
  const [ledger, setLedger] = useState<Trade>()
  const state = useApi(() => api.trades.mine({ q: applied || undefined, page }), [applied, page])

  return (
    <TradeDesk
      tradePage="Trade History"
      crumb="Trade History"
      subtitle="Review completed trades and past activity."
      search={<BoardSearch label="Search Trade History" query={query} onQuery={setQuery} onSearch={() => { setApplied(query.trim()); setPage(0) }} />}
    >
      <div className={`grid h-[50px] ${historyCols} items-center bg-white pl-[15px] text-[12px] text-[#98A2B3]`}>
        <span>Trade</span>
        <span>Side</span>
        <span>Commodity</span>
        <span>Quantity</span>
        <span>Price</span>
        <span>Total Value</span>
        <span>Counterparty</span>
        <span>Settled On</span>
        <span>Ledger</span>
      </div>
      <Rows state={state} empty={applied ? 'No trades match this search.' : 'No trade history yet.'}>
        {(items) =>
          items.map((row) => (
            <div key={row.id} className={`mt-2 grid min-h-[60px] ${historyCols} items-center rounded-[12px] bg-white py-2 pl-[15px] text-[13px]`}>
              <span className="font-medium">{row.code}</span>
              <span className={row.side === 'BUY' ? 'text-[#2F6BFF]' : 'text-[#1F8955]'}>{row.side}</span>
              <span className="flex items-center gap-2 leading-[15px]">
                <img src={row.imageUrl} alt="" className="size-8 shrink-0 rounded-[6px] object-cover" />
                <span>
                  {row.commodity}
                  <span className="block text-[11px] text-[#98A2B3]">{row.grade}</span>
                </span>
              </span>
              <span>{mt(row.quantityMt)}</span>
              <span>{perMt(row.pricePerMt)}</span>
              <span>{money(row.totalValue)}</span>
              <span className="leading-[15px]">{row.side === 'BUY' ? row.sellerName : row.buyerName}</span>
              <span>{toUiDate(row.settledAt)}</span>
              <button type="button" onClick={() => setLedger(row)} title={row.ledgerHash ?? ''} className="text-left text-[12px] text-[#1F8955]">
                ⛓ {shortHash(row.ledgerHash)}
              </button>
            </div>
          ))
        }
      </Rows>
      <Pager page={page} totalPages={state.data?.totalPages ?? 0} onPage={setPage} />
      {ledger ? <TradeLedgerModal id={ledger.id} code={ledger.code} onClose={() => setLedger(undefined)} /> : null}
    </TradeDesk>
  )
}

function TradeDesk({
  tradePage,
  crumb,
  subtitle,
  search,
  children,
}: {
  tradePage: TradePageName
  crumb: string
  subtitle: string
  search?: ReactNode
  children: ReactNode
}) {
  return (
    <DashboardShell section="trade" tradePage={tradePage}>
      <main className="px-5 pt-[15px] pb-8">
        <div className="flex items-center gap-2 text-[14px] leading-[15px]">
          <Link to="/trade/enwr" className="text-[#667085]">
            Trade
          </Link>
          <span className="text-[#98A2B3]">&gt;</span>
          <span className="font-semibold text-[#1F8955]">{crumb}</span>
        </div>
        <section className="relative mt-[15px] h-[150px] overflow-hidden rounded-[12px]">
          <img src="/assets/silo-banner.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative px-[15px] pt-[15px]">
            <h1 className="text-[24px] leading-[29px] font-bold text-[#1A1A1A]">Trade</h1>
            <p className="mt-[10px] max-w-[520px] text-[14px] leading-[19px] text-[#667085]">{subtitle}</p>
          </div>
        </section>
        {search ? <div className="mt-[15px]">{search}</div> : null}
        <div className="mt-[10px] grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5">
          <div className="min-w-0">{children}</div>
          <aside className="grid grid-cols-1 gap-4">
            <article className="rounded-[16px] bg-white px-4 pt-4 pb-4">
              <h2 className="text-[20px] leading-[29px] font-bold">Need Storage?</h2>
              <img src="/assets/warehouse.png" alt="" className="mt-2 size-[66px] rounded-[10px] object-cover" />
              <p className="mt-3 text-[13px] leading-[17px] text-[#667085]">
                Find verified warehouses across India and book storage for your commodities.
              </p>
              <Link
                to="/store"
                className="mt-4 grid h-12 w-full place-items-center rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white"
              >
                Find Warehouse
              </Link>
            </article>
            <article className="h-[217px] overflow-hidden rounded-[16px]">
              <img src="/assets/warehouse-card.png" alt="" className="h-full w-full object-cover" />
            </article>
          </aside>
        </div>
      </main>
    </DashboardShell>
  )
}

function BoardSearch({
  label,
  query,
  onQuery,
  onSearch,
}: {
  label: string
  query: string
  onQuery: (value: string) => void
  onSearch: () => void
}) {
  return (
    <form
      className="flex items-center gap-[10px]"
      onSubmit={(event) => {
        event.preventDefault()
        onSearch()
      }}
    >
      <label className="flex h-[30px] min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-[#E6E8EC] bg-white px-2.5">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-[#98A2B3]" aria-hidden="true">
          <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search by commodity, warehouse, location..."
          aria-label={label}
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#98A2B3]"
        />
      </label>
      <button type="submit" className="h-[30px] w-[150px] shrink-0 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white">
        Search
      </button>
    </form>
  )
}

function FilterRow({
  chips,
  chip,
  onChip,
  view,
  onView,
}: {
  chips: string[]
  chip: string
  onChip: (value: string) => void
  view: 'grid' | 'list'
  onView: (value: 'grid' | 'list') => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChip(item)}
            className={`h-[30px] rounded-full border px-3 text-[13px] ${
              chip === item
                ? 'border-[#1F8955] bg-[#E7F6EE] font-medium text-[#1F8955]'
                : 'border-[#E6E8EC] bg-white text-[#344054]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="flex h-[30px] w-[150px] shrink-0 overflow-hidden rounded-[8px] border border-[#E6E8EC] bg-white text-[13px]">
        <button
          type="button"
          onClick={() => onView('grid')}
          className={`w-[75px] ${view === 'grid' ? 'bg-[#1F8955] text-white' : 'text-[#344054]'}`}
        >
          Grid
        </button>
        <button
          type="button"
          onClick={() => onView('list')}
          className={`flex-1 ${view === 'list' ? 'bg-[#1F8955] text-white' : 'text-[#344054]'}`}
        >
          List
        </button>
      </div>
    </div>
  )
}

function StatRow({ stats, error, onRetry }: { stats: StatTile[] | undefined; error: ApiRequestError | undefined; onRetry: () => void }) {
  if (error) return <div className="mt-[15px]"><ErrorBanner error={error} onRetry={onRetry} /></div>
  return (
    <div className="mt-[15px] grid grid-cols-4 gap-[15px]">
      {(stats ?? []).map((stat) => (
        <article key={stat.key} className="flex h-[75px] items-center gap-2 rounded-[12px] bg-white px-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E7F6EE] text-[#1F8955]">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path d="M4 20V10l8-5 8 5v10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 20v-5h6v5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] leading-4 text-[#667085]">{stat.label}</span>
            <span className="mt-0.5 block truncate text-[18px] leading-6 font-bold text-[#1A1A1A]">{statValue(stat)}</span>
            {stat.note ? <span className="block text-[11px] leading-4 font-medium text-[#1F8955]">{stat.note}</span> : null}
          </span>
        </article>
      ))}
    </div>
  )
}

function PhotoCell({ src }: { src: string }) {
  return <img src={src} alt="" className="size-[70px] rounded-[8px] object-cover" />
}

function DetailStack({ name, grade, code }: { name: string; grade: string; code: string }) {
  return (
    <span>
      <span className="block text-[13px] leading-[15px] font-medium">{name}</span>
      <span className="block text-[11px] leading-3 text-[#98A2B3]">{grade}</span>
      <span className="mt-0.5 inline-block rounded-[4px] bg-[#F2F4F7] px-1 text-[10px] leading-4 whitespace-nowrap text-[#98A2B3]">{code}</span>
    </span>
  )
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">{children}</p>
}
