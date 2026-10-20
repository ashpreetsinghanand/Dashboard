import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { WarehouseSort, WarehouseSummary } from '../api/types'
import { DashboardShell } from '../components/DashboardShell'
import { MarketRail } from '../components/MarketRail'
import { BoxIcon, PinIcon, ShieldIcon, WarehouseIcon } from '../components/Icons'
import { Pager } from '../components/store/Pager'
import { ErrorBanner } from '../components/ui'
import { mt } from '../lib/format'
import { useApi } from '../lib/useApi'

const distances = ['Any distance', 'Within 20 Km', 'Within 30 Km', 'Within 100 Km']
const radii: Record<string, number> = { 'Within 20 Km': 20, 'Within 30 Km': 30, 'Within 100 Km': 100 }
const capacities = ['Any Capacity', 'Up to 3,000 MT', '3,500 MT and above']
const sorts = ['Nearest', 'Capacity', 'Name']
const sortParam: Record<string, WarehouseSort> = { Nearest: 'NEAREST', Capacity: 'CAPACITY', Name: 'NAME' }

export function FindWarehousePage() {
  const [place, setPlace] = useState('')
  const [appliedPlace, setAppliedPlace] = useState('')
  const [distance, setDistance] = useState(distances[0])
  const [commodity, setCommodity] = useState('All Commodities')
  const [capacity, setCapacity] = useState(capacities[0])
  const [sort, setSort] = useState(sorts[0])
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [more, setMore] = useState(false)
  const [page, setPage] = useState(0)
  const [origin, setOrigin] = useState<{ lat: number; lng: number }>()

  // Distance needs a search origin; without one the server ignores radiusKm and the card shows the district.
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => setOrigin({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => {},
    )
  }, [])

  const reference = useApi(() => api.reference.commodities(), [])
  const commodities = ['All Commodities', ...(reference.data?.map((item) => item.name) ?? [])]
  const stats = useApi(() => api.warehouses.stats(), [])
  const results = useApi(
    () =>
      api.warehouses.search({
        q: appliedPlace.trim() || undefined,
        commodity: commodity === 'All Commodities' ? undefined : commodity,
        lat: origin?.lat,
        lng: origin?.lng,
        radiusKm: radii[distance],
        maxAvailableMt: capacity === 'Up to 3,000 MT' ? 3000 : undefined,
        minAvailableMt: capacity === '3,500 MT and above' ? 3500 : undefined,
        sort: sortParam[sort],
        size: 12,
        page,
      }),
    [appliedPlace, commodity, origin, distance, capacity, sort, page],
  )
  const warehouses = results.data?.items ?? []

  /** Any filter change starts again from the first page. */
  const filter = (set: (value: string) => void) => (value: string) => {
    set(value)
    setPage(0)
  }

  const tiles = [
    { value: stats.data ? String(stats.data.verifiedWarehouses) : '-', label: 'Verified Warehouse', icon: WarehouseIcon },
    { value: mt(stats.data?.totalCapacityMt), label: 'Total Storage Capacity', icon: BoxIcon },
    { value: stats.data ? `${stats.data.qualityVerifiedPercent}%` : '-', label: 'Quality Verified', icon: ShieldIcon },
    { value: stats.data ? String(stats.data.statesCovered) : '-', label: 'States Covered', icon: PinIcon },
  ]

  return (
    <DashboardShell section="store">
      <main className="min-w-0 flex-1 px-5 pt-[15px] pb-8">
        <div className="flex items-center gap-2 text-[14px] leading-[15px]">
          <Link to="/dashboard" className="text-[#667085]">
            Store
          </Link>
          <span className="text-[#98A2B3]">&gt;</span>
          <span className="font-semibold text-[#1F8955]">Warehouse</span>
        </div>

        <section className="relative mt-3 h-[150px] overflow-hidden rounded-[12px]">
          <img src="/assets/silo-banner.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative px-[15px] pt-[15px]">
            <h1 className="text-[24px] leading-[29px] font-bold text-[#1A1A1A]">Find A Warehouse</h1>
            <p className="mt-[10px] max-w-[641px] text-[14px] leading-[19px] text-[#667085]">
              Store your produce safely, get warehouse receipts. access finance and better prices.
            </p>
          </div>
        </section>

        <form
          className="mt-[15px] flex items-center gap-[15px]"
          onSubmit={(event) => {
            event.preventDefault()
            setAppliedPlace(place)
            setPage(0)
          }}
        >
          <label className="flex h-[30px] w-[376px] items-center gap-2 rounded-[8px] border border-[#E6E8EC] bg-white px-2.5">
            <PinIcon className="size-[15px] shrink-0 text-[#1F8955]" />
            <input
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              aria-label="Location"
              placeholder="City, district or warehouse, e.g. Lalitpur"
              className="w-full bg-transparent text-[13px] leading-4 text-[#1E1E1E] outline-none placeholder:text-[#98A2B3]"
            />
          </label>
          <FilterSelect label="Distance" value={distance} options={distances} onChange={filter(setDistance)} />
          <FilterSelect label="Commodity" value={commodity} options={commodities} onChange={filter(setCommodity)} />
          <FilterSelect label="Capacity" value={capacity} options={capacities} onChange={filter(setCapacity)} />
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
                onClick={() => filter(setCommodity)(item)}
                className={`h-7 rounded-full px-3 text-[12px] ${
                  commodity === item ? 'bg-[#1F8955] text-white' : 'bg-white text-[#344054]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <div className="mt-[15px] grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5">
          <section className="min-w-0">
            <div className="mb-4 grid grid-cols-4 gap-5">
          {tiles.map((stat) => (
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
            <div className="flex h-[30px] items-center justify-between">
              <h2 className="text-[24px] leading-[29px] font-bold">Available Warehouses</h2>
              <div className="flex items-center gap-[15px]">
                <label className="relative">
                  <select
                    aria-label="Sort"
                    value={sort}
                    onChange={(event) => filter(setSort)(event.target.value)}
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

            {stats.error ? (
              <div className="mt-3">
                <ErrorBanner error={stats.error} onRetry={stats.reload} />
              </div>
            ) : null}
            {results.error ? (
              <div className="mt-3">
                <ErrorBanner error={results.error} onRetry={results.reload} />
              </div>
            ) : results.loading && !results.data ? (
              <p className="mt-8 rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">Loading warehouses…</p>
            ) : warehouses.length === 0 ? (
              <p className="mt-8 rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">
                No warehouses match these filters.
              </p>
            ) : (
              <>
                <div className={`${layout === 'grid' ? 'mt-3 grid grid-cols-3 gap-5' : 'mt-3 grid gap-4'} ${results.loading ? 'opacity-60' : ''}`}>
                  {warehouses.map((warehouse) => (
                    <WarehouseCard key={warehouse.id} warehouse={warehouse} layout={layout} />
                  ))}
                </div>
                <Pager page={page} totalPages={results.data?.totalPages ?? 0} onPage={setPage} />
              </>
            )}
          </section>

          <MarketRail />
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

function WarehouseCard({ warehouse, layout }: { warehouse: WarehouseSummary; layout: 'grid' | 'list' }) {
  const shown = warehouse.crops.slice(0, 3)
  const extra = warehouse.crops.length - shown.length
  const horizontal = layout === 'list'

  return (
    <article className={`overflow-hidden rounded-[12px] bg-white shadow-[0_6px_16px_rgba(16,24,40,0.05)] ${horizontal ? 'flex' : ''}`}>
      <Link to={`/store/${warehouse.id}`} className={horizontal ? 'flex min-w-0 flex-1' : 'block'}>
        <div className={horizontal ? 'relative h-[140px] w-[220px] shrink-0 overflow-hidden' : 'relative h-[120px] overflow-hidden'}>
          <img src={warehouse.imageUrl} alt="" className="h-full w-full object-cover" />
          <span className="absolute top-[9px] left-[5px] grid h-5 min-w-[60px] place-items-center rounded-[4px] bg-white px-1.5 text-[11px] leading-3 font-medium">
            {warehouse.distanceKm != null ? `${warehouse.distanceKm} Km` : warehouse.district}
          </span>
          {warehouse.wdraRegistered && (
            <span className="absolute bottom-2 left-[5px] grid h-5 place-items-center rounded-[4px] bg-white px-1.5 text-[11px] leading-3 font-medium text-[#1F8955]">
              WDRA Registered
            </span>
          )}
        </div>
        <div className={`min-w-0 ${horizontal ? 'flex-1 px-4 py-3' : 'px-[15px] pt-2.5'}`}>
          <h3 className="flex items-center gap-1 text-[15px] leading-[17px] font-semibold">
            <span className="truncate">{warehouse.name}</span>
            {warehouse.verified && (
              <span
                title="Verified Warehouse"
                aria-label="Verified Warehouse"
                className="grid size-3.5 shrink-0 place-items-center rounded-full bg-[#E7F6EE] text-[9px] text-[#1F8955]"
              >
                ✓
              </span>
            )}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-[12px] leading-3 text-[#667085]">
            <PinIcon className="size-2.5 shrink-0 text-[#1F8955]" />
            <span className="truncate">{warehouse.address}</span>
          </p>
          <p className="mt-2 text-[11px] leading-3 text-[#98A2B3]">Available Capacity</p>
          <p className="text-[14px] leading-[17px] font-semibold">{mt(warehouse.availableCapacityMt)}</p>
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
