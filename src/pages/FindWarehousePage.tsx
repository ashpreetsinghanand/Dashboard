import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardShell } from '../components/DashboardShell'
import { BoxIcon, PinIcon, ShieldIcon, WarehouseIcon } from '../components/Icons'
import { insights, warehouses, type Warehouse } from '../data/warehouses'

const commodities = ['All Commodities', ...Array.from(new Set(warehouses.flatMap((warehouse) => warehouse.crops)))]
const distances = ['Within 100 Km', 'Within 20 Km', 'Within 30 Km']
const capacities = ['Any Capacity', 'Up to 3,000 MT', '3,500 MT and above']
const sorts = ['Nearest', 'Capacity', 'Name']

const stats = [
  { value: '1,120', label: 'Verified Warehouse', icon: WarehouseIcon },
  { value: '8.6 Mn MT', label: 'Total Storage Capacity', icon: BoxIcon },
  { value: '98%', label: 'Quality Verified', icon: ShieldIcon },
  { value: '20', label: 'States Covered', icon: PinIcon },
]

function kilometres(distance: string) {
  return Number(distance.replace(/[^\d.]/g, '')) || 0
}

function tonnes(capacity: string) {
  return Number(capacity.replace(/[^\d.]/g, '')) || 0
}

function matchesCapacity(capacity: string, filter: string) {
  const amount = tonnes(capacity)
  if (filter === 'Up to 3,000 MT') return amount <= 3000
  if (filter === '3,500 MT and above') return amount >= 3500
  return true
}

function matchesDistance(distance: string, filter: string) {
  const amount = kilometres(distance)
  if (filter === 'Within 20 Km') return amount <= 20
  if (filter === 'Within 30 Km') return amount <= 30
  return amount <= 100
}

export function FindWarehousePage() {
  const [place, setPlace] = useState('Lalitpur, Uttar Pradesh')
  const [appliedPlace, setAppliedPlace] = useState('')
  const [distance, setDistance] = useState(distances[0])
  const [commodity, setCommodity] = useState(commodities[0])
  const [capacity, setCapacity] = useState(capacities[0])
  const [sort, setSort] = useState(sorts[0])
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [more, setMore] = useState(false)

  const results = useMemo(() => {
    const query = appliedPlace.trim().toLowerCase()
    const filtered = warehouses.filter((warehouse) => {
      const haystack = `${warehouse.name} ${warehouse.location} ${warehouse.crops.join(' ')}`.toLowerCase()
      const placeOk = query === '' || query === 'lalitpur, uttar pradesh' || haystack.includes(query)
      const cropOk = commodity === 'All Commodities' || warehouse.crops.includes(commodity)
      return placeOk && cropOk && matchesDistance(warehouse.distance, distance) && matchesCapacity(warehouse.capacity, capacity)
    })
    return filtered.sort((a, b) => {
      if (sort === 'Capacity') return tonnes(b.capacity) - tonnes(a.capacity)
      if (sort === 'Name') return a.name.localeCompare(b.name)
      return kilometres(a.distance) - kilometres(b.distance)
    })
  }, [appliedPlace, capacity, commodity, distance, sort])

  return (
    <DashboardShell section="store">
      <main className="min-w-0 flex-1 px-5 pt-4 pb-8">
        <div className="flex items-center gap-6 text-[14px] leading-[15px]">
          <Link to="/dashboard" className="text-[#667085]">
            Store
          </Link>
          <span className="font-semibold text-[#1F8955]">Warehouse</span>
        </div>

        <section className="relative mt-3 h-[150px] overflow-hidden rounded-[12px]">
          <img src="/assets/warehouse-card.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E4F38]/80 via-[#0E4F38]/55 to-[#0E4F38]/20" />
          <div className="relative px-[15px] pt-[15px] text-white">
            <h1 className="text-[24px] leading-[29px] font-bold">Find A Warehouse</h1>
            <p className="mt-[10px] max-w-[641px] text-[14px] leading-[19px]">
              Store your produce safely, get warehouse receipts. access finance and better prices.
            </p>
          </div>
        </section>

        <form
          className="mt-[15px] flex items-center gap-[15px]"
          onSubmit={(event) => {
            event.preventDefault()
            setAppliedPlace(place)
          }}
        >
          <label className="flex h-[30px] w-[376px] items-center gap-2 rounded-[8px] border border-[#E6E8EC] bg-white px-2.5">
            <PinIcon className="size-[15px] shrink-0 text-[#1F8955]" />
            <input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              aria-label="Location"
              className="w-full bg-transparent text-[13px] leading-4 text-[#1E1E1E] outline-none"
            />
          </label>
          <FilterSelect label="Distance" value={distance} options={distances} onChange={setDistance} />
          <FilterSelect label="Commodity" value={commodity} options={commodities} onChange={setCommodity} />
          <FilterSelect label="Capacity" value={capacity} options={capacities} onChange={setCapacity} />
          <button
            type="button"
            onClick={() => setMore((open) => !open)}
            className={`flex h-[30px] w-[150px] items-center justify-center gap-1.5 rounded-[8px] border bg-white text-[13px] ${
              more ? 'border-[#1F8955] text-[#1F8955]' : 'border-[#E6E8EC] text-[#344054]'
            }`}
          >
            <span className="text-[15px] leading-none">☰</span>
            More Filter
          </button>
          <button type="submit" className="h-[30px] w-[150px] rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white">
            Search
          </button>
        </form>

        {more && (
          <div className="mt-3 flex flex-wrap gap-2">
            {commodities.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCommodity(item)}
                className={`h-7 rounded-full px-3 text-[12px] ${
                  commodity === item ? 'bg-[#1F8955] text-white' : 'bg-white text-[#344054]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <div className="mt-[15px] grid w-[880px] grid-cols-4 gap-5">
          {stats.map((stat) => (
            <article key={stat.label} className="flex h-[75px] items-center gap-3 rounded-[12px] bg-white px-[15px]">
              <span className="grid size-[30px] shrink-0 place-items-center rounded-full bg-[#E7F6EE] text-[#1F8955]">
                <stat.icon className="size-4" />
              </span>
              <div>
                <p className="text-[16px] leading-[19px] font-bold">{stat.value}</p>
                <p className="text-[12px] leading-[15px] text-[#667085]">{stat.label}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[880px_300px] gap-5">
          <section>
            <div className="flex h-[30px] items-center justify-between">
              <h2 className="text-[24px] leading-[29px] font-bold">Available Warehouses</h2>
              <div className="flex items-center gap-[15px]">
                <label className="relative">
                  <select
                    aria-label="Sort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value)}
                    className="h-[30px] w-[150px] appearance-none rounded-[8px] border border-[#E6E8EC] bg-white pr-7 pl-2.5 text-[13px] outline-none"
                  >
                    {sorts.map((item) => (
                      <option key={item} value={item}>
                        Sort by: {item}
                      </option>
                    ))}
                  </select>
                  <Chevron />
                </label>
                <div className="flex h-[30px] overflow-hidden rounded-[8px] border border-[#E6E8EC] bg-white">
                  <LayoutButton label="Grid" active={layout === 'grid'} onClick={() => setLayout('grid')} />
                  <LayoutButton label="List" active={layout === 'list'} onClick={() => setLayout('list')} />
                </div>
              </div>
            </div>

            {results.length === 0 ? (
              <p className="mt-8 rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">
                No warehouses match these filters.
              </p>
            ) : (
              <div className={layout === 'grid' ? 'mt-3 grid grid-cols-3 gap-5' : 'mt-3 grid gap-4'}>
                {results.map((warehouse) => (
                  <WarehouseCard key={warehouse.id} warehouse={warehouse} layout={layout} />
                ))}
              </div>
            )}
          </section>

          <aside className="grid content-start gap-4">
            <article className="rounded-[16px] bg-white px-[15px] pt-[15px] pb-4">
              <h2 className="text-[20px] leading-[29px] font-bold">Market Insights</h2>
              <div className="mt-3 flex gap-2 text-[12px]">
                <span className="rounded-full bg-[#1F8955] px-3 py-1 text-white">Top Gainers</span>
                <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-[#667085]">Top Loser</span>
                <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-[#667085]">Watchlist</span>
              </div>
              <div className="mt-3 grid gap-2.5">
                {insights.map(([name, price, change, image]) => (
                  <div key={name} className="flex items-center gap-2 text-[13px]">
                    <img src={image} alt="" className="size-[30px] rounded-[6px] object-cover" />
                    <span className="flex-1">{name}</span>
                    <span>{price}</span>
                    <span className="w-12 text-right text-[#1F8955]">{change}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="relative h-[217px] overflow-hidden rounded-[16px]">
              <img src="/assets/warehouse-card.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
              <p className="relative max-w-[205px] px-[15px] pt-[23px] text-[18px] leading-6 font-semibold text-white">
                Verified Warehouses. Trusted Financing.
              </p>
            </article>
          </aside>
        </div>
      </main>
    </DashboardShell>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-[30px] w-[150px] appearance-none rounded-[8px] border border-[#E6E8EC] bg-white pr-7 pl-2.5 text-[13px] text-[#344054] outline-none"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <Chevron />
    </label>
  )
}

function Chevron() {
  return (
    <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-[#667085]">▾</span>
  )
}

function LayoutButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full w-[75px] items-center justify-center gap-1 text-[13px] ${
        active ? 'bg-[#E7F6EE] font-medium text-[#1F8955]' : 'text-[#667085]'
      }`}
    >
      <span aria-hidden="true">{label === 'Grid' ? '⊞' : '☰'}</span>
      {label}
    </button>
  )
}

function WarehouseCard({ warehouse, layout }: { warehouse: Warehouse; layout: 'grid' | 'list' }) {
  const shown = warehouse.crops.slice(0, 3)
  const extra = warehouse.crops.length - shown.length
  const horizontal = layout === 'list'

  return (
    <article className={`overflow-hidden rounded-[12px] bg-white shadow-[0_6px_16px_rgba(16,24,40,0.05)] ${horizontal ? 'flex' : ''}`}>
      <Link to={`/store/${warehouse.id}`} className={horizontal ? 'flex min-w-0 flex-1' : 'block'}>
        <div className={horizontal ? 'relative h-[140px] w-[220px] shrink-0 overflow-hidden' : 'relative h-[120px] overflow-hidden'}>
          <img src={warehouse.image} alt="" className="h-full w-full object-cover" />
          <span className="absolute top-[9px] left-[5px] grid h-5 min-w-[60px] place-items-center rounded-[4px] bg-white px-1.5 text-[11px] leading-3 font-medium">
            {warehouse.distance}
          </span>
          <span className="absolute bottom-2 left-[5px] grid h-5 place-items-center rounded-[4px] bg-white px-1.5 text-[11px] leading-3 font-medium text-[#1F8955]">
            WDRA Registered
          </span>
        </div>
        <div className={`min-w-0 ${horizontal ? 'flex-1 px-4 py-3' : 'px-[15px] pt-2.5'}`}>
          <h3 className="truncate text-[15px] leading-[17px] font-semibold">{warehouse.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-[12px] leading-3 text-[#667085]">
            <PinIcon className="size-2.5 shrink-0 text-[#1F8955]" />
            <span className="truncate">{warehouse.location}</span>
          </p>
          <p className="mt-2 text-[11px] leading-3 text-[#98A2B3]">Available Capacity</p>
          <p className="text-[14px] leading-[17px] font-semibold">{warehouse.capacity}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {shown.map((crop) => (
              <span key={crop} className="grid h-5 place-items-center rounded-[4px] bg-[#F2F4F7] px-1.5 text-[11px] leading-3 text-[#344054]">
                {crop}
              </span>
            ))}
            {extra > 0 && (
              <span className="grid size-5 place-items-center rounded-[4px] bg-[#E7F6EE] text-[11px] leading-3 text-[#1F8955]">
                +{extra}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className={`flex gap-[10px] ${horizontal ? 'shrink-0 flex-col justify-center pr-4' : 'px-[15px] pt-3 pb-3'}`}>
        <Link
          to={`/store/${warehouse.id}`}
          className="grid h-[30px] w-[120px] place-items-center rounded-[8px] border border-[#D0D5DD] text-[13px] leading-[17px]"
        >
          View Details
        </Link>
        <Link
          to={`/store/${warehouse.id}?book=1`}
          className="grid h-[30px] w-[120px] place-items-center rounded-[8px] bg-[#1F8955] text-[13px] leading-[17px] text-white"
        >
          Book Now
        </Link>
      </div>
    </article>
  )
}
