import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DashboardShell, type TradePage as TradePageName } from '../components/DashboardShell'
import { StatusPill } from '../components/RequestLayout'
import { commodityImage } from '../data/bookings'

const enwrCopy = 'Buy and sell verified eNWRs fom trsuted warehouses across India.'

const enwrRows = [
  { id: 'coffee', commodity: 'Coffee', grade: 'Grade A', code: 'INV-2026-00125', warehouse: 'Nayak Warehouse', quantity: '100 MT', storedOn: '09-06-2026', validTill: '180 Days', price: '$2500/MT', total: '$250000', min: '10 MT' },
  { id: 'turmeric', commodity: 'Turmeric', grade: 'RAW', code: 'INV-2026-00125', warehouse: 'Nayak Warehouse', quantity: '100 MT', storedOn: '09-06-2026', validTill: '180 Days', price: '$2500/MT', total: '$250000', min: '10 MT' },
]

const listingRow = {
  commodity: 'Coffee',
  grade: 'Grade A',
  code: 'INV-2026-00125',
  warehouse: 'Nayak Warehouse',
  quantity: '100 MT',
  storedOn: '09-06-2026',
  validTill: '180 Days',
  price: '$2500/MT',
  offers: '3',
  status: 'Active',
}

const bidRow = {
  commodity: 'Coffee',
  grade: 'Grade A',
  code: 'INV-2026-00125',
  warehouse: 'Nayak Warehouse',
  quantity: '100 MT',
  price: '$250/MT',
  total: '$25000',
  status: 'Active',
}

const deskCols = 'grid-cols-[93px_66px_91px_76px_85px_75px_98px_90px_106px_85px]'
const bidCols = 'grid-cols-[93px_112px_114px_99px_140px_134px_87px_86px]'
const listingChips = ['All Listings', 'Active', 'Under Offer', 'Sold', 'Expired']
const bidChips = ['All Commodities', 'Wheat', 'Maize', 'Soyabean', 'Coffee']
const enwrChips = ['All eNWR', 'Wheat', 'Maize', 'Barley', 'Coffee']

const listingStats = [
  { label: 'Active Listings', value: '12', delta: '+2 this week' },
  { label: 'Total Listed Quantity', value: '1450 MT', delta: '+12% this week' },
  { label: 'Total Asking Value', value: '$2.5 Mil', delta: '+8% this week' },
  { label: 'Offers Received', value: '08', delta: '+3 this week' },
]

const bidStats = [
  { label: 'Active Bids', value: '8', delta: '+2 this week' },
  { label: 'Total Bid Value', value: '1450 MT', delta: '+12% this week' },
  { label: 'Successful Bids', value: '5', delta: '+8% this week' },
  { label: 'Pending Response', value: '6', delta: '+3 this week' },
]

export function TradePage({ page }: { page: 'enwr' | 'listing' | 'bid' | 'history' }) {
  if (page === 'listing') return <ListingBoard />
  if (page === 'bid') return <BidBoard />
  if (page === 'history') return <HistoryBoard />
  return <EnwrBoard />
}

function EnwrBoard() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [chip, setChip] = useState('All eNWR')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const visible = useMemo(() => {
    const text = applied.trim().toLowerCase()
    return enwrRows.filter((row) => {
      const matchesText =
        text === '' || `${row.commodity} ${row.grade} ${row.warehouse} ${row.code}`.toLowerCase().includes(text)
      const matchesChip = chip === 'All eNWR' || chip === row.commodity
      return matchesText && matchesChip
    })
  }, [applied, chip])

  return (
    <TradeDesk tradePage="My eNWR" crumb="My eNWR" subtitle={enwrCopy} search={<BoardSearch label="Search My eNWR" query={query} onQuery={setQuery} onSearch={() => setApplied(query)} />}>
      <FilterRow chips={enwrChips} chip={chip} onChip={setChip} view={view} onView={setView} />
      <div className="mt-[15px]">
        <div className={`grid h-[50px] ${deskCols} items-center bg-white pl-[15px] text-[12px] text-[#98A2B3]`}>
          <span>Commodity</span>
          <span>Details</span>
          <span>Warehouse</span>
          <span>Quantity</span>
          <span>Stored On</span>
          <span>Valid Till</span>
          <span>Asking Price</span>
          <span>Total Value</span>
          <span>Min. Quantity</span>
          <span>Actions</span>
        </div>
        {visible.length === 0 ? (
          <EmptyNote>No eNWRs match these filters.</EmptyNote>
        ) : (
          visible.map((row) => (
            <div key={row.id} className={`mt-2 grid h-[90px] ${deskCols} items-center rounded-[12px] bg-white pl-[15px] text-[13px]`}>
              <PhotoCell name={row.commodity} />
              <DetailStack name={row.commodity} grade={row.grade} code={row.code} />
              <span className="w-16 leading-[15px]">{row.warehouse}</span>
              <span>{row.quantity}</span>
              <span>{row.storedOn}</span>
              <span>{row.validTill}</span>
              <span>{row.price}</span>
              <span>{row.total}</span>
              <span>{row.min}</span>
              <span className="grid justify-items-start gap-1 text-[12px] leading-4 font-medium whitespace-nowrap text-[#1F8955]">
                <button type="button">View Details</button>
                <button type="button">Apply For Loan</button>
                <button type="button">List On Market</button>
              </span>
            </div>
          ))
        )}
      </div>
    </TradeDesk>
  )
}

function ListingBoard() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [chip, setChip] = useState('All Listings')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const text = applied.trim().toLowerCase()
  const matchesText = text === '' || `coffee nayak warehouse ${listingRow.code}`.includes(text)
  const matchesChip = chip === 'All Listings' || chip === listingRow.status
  const visible = matchesText && matchesChip

  return (
    <TradeDesk
      tradePage="My Listing"
      crumb="My Listing"
      subtitle="Manage your listed eNWRs and track buyer activity."
      search={<BoardSearch label="Search My Listing" query={query} onQuery={setQuery} onSearch={() => setApplied(query)} />}
    >
      <FilterRow chips={listingChips} chip={chip} onChip={setChip} view={view} onView={setView} />
      <StatRow stats={listingStats} />
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
        {visible ? (
          <div className={`mt-2 grid h-[90px] ${deskCols} items-center rounded-[12px] bg-white pl-[15px] text-[13px]`}>
            <PhotoCell name={listingRow.commodity} />
            <DetailStack name={listingRow.commodity} grade={listingRow.grade} code={listingRow.code} />
            <span className="w-16 leading-[15px]">{listingRow.warehouse}</span>
            <span>{listingRow.quantity}</span>
            <span>{listingRow.storedOn}</span>
            <span>{listingRow.validTill}</span>
            <span>{listingRow.price}</span>
            <span>{listingRow.offers}</span>
            <StatusPill status={listingRow.status} className="w-[60px] justify-self-start" />
            <span className="grid justify-items-start gap-1 text-[12px] leading-4 font-medium whitespace-nowrap text-[#1F8955]">
              <button type="button">View Details</button>
              <button type="button">Edit Listing</button>
              <button type="button">View Offer</button>
            </span>
          </div>
        ) : (
          <EmptyNote>No listings match these filters.</EmptyNote>
        )}
      </div>
    </TradeDesk>
  )
}

function BidBoard() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [chip, setChip] = useState('All Commodities')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const text = applied.trim().toLowerCase()
  const matchesText = text === '' || `coffee nayak warehouse ${bidRow.code}`.includes(text)
  const matchesChip = chip === 'All Commodities' || chip === bidRow.commodity
  const visible = matchesText && matchesChip

  return (
    <TradeDesk
      tradePage="My Bid"
      crumb="My Bid"
      subtitle="View and manage your active bids on eNWRs and commodities."
      search={<BoardSearch label="Search My Bid" query={query} onQuery={setQuery} onSearch={() => setApplied(query)} />}
    >
      <FilterRow chips={bidChips} chip={chip} onChip={setChip} view={view} onView={setView} />
      <StatRow stats={bidStats} />
      <div className="mt-[15px]">
        <div className={`grid h-[50px] ${bidCols} items-center bg-white pl-[15px] text-[12px] text-[#98A2B3]`}>
          <span>Commodity</span>
          <span>Details</span>
          <span>Warehouse</span>
          <span>Quantity</span>
          <span>Bid Price($/MT)</span>
          <span>Total Bid Value</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {visible ? (
          <div className={`mt-2 grid h-[90px] ${bidCols} items-center rounded-[12px] bg-white pl-[15px] text-[13px]`}>
            <PhotoCell name={bidRow.commodity} />
            <DetailStack name={bidRow.commodity} grade={bidRow.grade} code={bidRow.code} />
            <span className="w-16 leading-[15px]">{bidRow.warehouse}</span>
            <span>{bidRow.quantity}</span>
            <span>{bidRow.price}</span>
            <span>{bidRow.total}</span>
            <StatusPill status={bidRow.status} className="w-[60px] justify-self-start" />
            <button type="button" className="text-left text-[12px] leading-4 font-medium whitespace-nowrap text-[#1F8955]">
              View Details
            </button>
          </div>
        ) : (
          <EmptyNote>No bids match these filters.</EmptyNote>
        )}
      </div>
    </TradeDesk>
  )
}

function HistoryBoard() {
  return (
    <TradeDesk tradePage="Trade History" crumb="Trade History" subtitle="Review completed trades and past activity.">
      <div className="rounded-[12px] bg-white px-4 py-12 text-center text-[14px] text-[#667085]">No trade history yet.</div>
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
        <div className="mt-[10px] grid grid-cols-[880px_300px] items-start gap-5">
          <div>{children}</div>
          <aside className="grid gap-4">
            <article className="rounded-[16px] bg-white px-4 pt-4 pb-4">
              <h2 className="text-[20px] leading-[29px] font-bold">Need Storage?</h2>
              <img src="/assets/warehouse.png" alt="" className="mt-2 size-[66px] rounded-[10px] object-cover" />
              <p className="mt-3 text-[13px] leading-[17px] text-[#667085]">
                Find verified warehouses across India and book storage fo your commodities.
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

function StatRow({ stats }: { stats: { label: string; value: string; delta: string }[] }) {
  return (
    <div className="mt-[15px] grid grid-cols-4 gap-[15px]">
      {stats.map((stat) => (
        <article key={stat.label} className="flex h-[75px] items-center gap-2 rounded-[12px] bg-white px-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E7F6EE] text-[#1F8955]">
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path d="M4 20V10l8-5 8 5v10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M9 20v-5h6v5" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] leading-4 text-[#667085]">{stat.label}</span>
            <span className="mt-0.5 block text-[18px] leading-6 font-bold text-[#1A1A1A]">{stat.value}</span>
            <span className="block text-[11px] leading-4 font-medium text-[#1F8955]">{stat.delta}</span>
          </span>
        </article>
      ))}
    </div>
  )
}

function PhotoCell({ name }: { name: string }) {
  return <img src={commodityImage(name)} alt="" className="size-[70px] rounded-[8px] object-cover" />
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


