import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { WarehouseDetails } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { DashboardShell } from '../components/DashboardShell'
import { MarketRail } from '../components/MarketRail'
import { BoxIcon, PinIcon, ShieldIcon, WarehouseIcon } from '../components/Icons'
import { ErrorBanner, FieldError } from '../components/ui'
import { money, mt, toApiDate, toUiDate } from '../lib/format'
import { useAction, useApi } from '../lib/useApi'

const tabs = ['Overview', 'Inventory', 'Amenities', 'Licenses', 'Location', 'Nearby Warehouses', 'Reviews']
const VERIFIED = 'Verified Warehouse'

export function WarehouseDetailPage() {
  const { id = '' } = useParams()
  const { user, restoring } = useAuth()
  const navigate = useNavigate()
  const details = useApi(() => api.warehouses.details(id), [id])
  const nearby = useApi(() => api.warehouses.nearby(id), [id])
  const [params, setParams] = useSearchParams()
  const booking = params.get('book') === '1'
  const [tab, setTab] = useState('Overview')
  const [photo, setPhoto] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  // Only depositors book storage; signed-out visitors are sent to sign in first.
  const canBook = !user || user.role === 'FARMER' || user.role === 'MERCHANT'

  useEffect(() => {
    setPhoto(0)
    setTab('Overview')
  }, [id])

  const warehouse = details.data
  if (!warehouse) {
    const notFound = details.error?.error.code === 'NOT_FOUND'
    return (
      <DashboardShell section="store">
        <main className="min-w-0 flex-1 px-5 pt-[15px] pb-10">
          <div>
            {details.loading ? (
              <p className="rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">Loading warehouse…</p>
            ) : notFound ? (
              <div className="rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">
                <p className="text-[18px] font-semibold text-[#101828]">Warehouse not found</p>
                <Link to="/store" className="mt-3 inline-block font-semibold text-[#1F8955]">
                  ← Back to Find A Warehouse
                </Link>
              </div>
            ) : (
              <ErrorBanner error={details.error} onRetry={details.reload} />
            )}
          </div>
        </main>
      </DashboardShell>
    )
  }

  const gallery = warehouse.photos.length ? warehouse.photos.slice(0, 4) : ['/assets/warehouse.png']
  const current = Math.min(photo, gallery.length - 1)
  const licenses = [...(warehouse.verified ? [VERIFIED] : []), ...warehouse.licenses.filter((license) => license !== VERIFIED)]
  const rating = warehouse.ratingCount > 0 ? `${warehouse.rating}/5` : 'Not rated'
  const rate = `${money(warehouse.storageRatePerMtMonth, warehouse.currency)} / MT / month`

  function openBook() {
    if (!user) {
      navigate('/login')
      return
    }
    const next = new URLSearchParams(params)
    next.set('book', '1')
    setParams(next)
  }

  function closeBook() {
    const next = new URLSearchParams(params)
    next.delete('book')
    setParams(next, { replace: true })
  }

  const thumbs = gallery.map((src, index) => ({ src, index })).filter((item) => item.index !== current)

  return (
    <DashboardShell section="store">
      <main className="min-w-0 flex-1 px-5 pt-[15px] pb-10">
        <div className="flex items-center gap-2 text-[14px] leading-[15px]">
          <Link to="/dashboard" className="text-[#667085]">
            Store
          </Link>
          <span className="text-[#98A2B3]">&gt;</span>
          <Link to="/store" className="text-[#667085]">
            Warehouse
          </Link>
          <span className="text-[#98A2B3]">&gt;</span>
          <span className="font-semibold text-[#1F8955]">Warehouse Details</span>
        </div>

        <section className="relative mt-3 h-[150px] overflow-hidden rounded-[12px]">
          <img src="/assets/silo-banner.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="relative px-[15px] pt-[15px]">
            <h1 className="text-[24px] leading-[29px] font-bold text-[#1A1A1A]">Warehouse Details</h1>
            <p className="mt-[10px] max-w-[641px] text-[14px] leading-[19px] text-[#667085]">
              Store your produce safely, get warehouse receipts. access finance and better prices.
            </p>
          </div>
        </section>

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[24px] leading-[29px] font-bold">{warehouse.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="mr-2 flex items-center gap-1.5 text-[14px] text-[#344054]">
                <PinIcon className="size-[15px] text-[#1F8955]" />
                {warehouse.address}
              </p>
              {licenses.map((license) => (
                <span
                  key={license}
                  className="flex h-[25px] items-center gap-1.5 rounded-[6px] border border-[#E6E8EC] bg-white px-2 text-[12px] text-[#344054]"
                >
                  <span className="grid size-3.5 place-items-center rounded-full bg-[#E7F6EE] text-[9px] text-[#1F8955]">✓</span>
                  {license}
                </span>
              ))}
            </div>
          </div>
          <div className="shrink-0">
          <div className="flex gap-[15px]">
            <Link
              to="/store"
              className="flex h-[30px] w-[136px] items-center justify-center gap-2 rounded-[8px] border border-[#D0D5DD] bg-white text-[14px]"
            >
              <span aria-hidden="true">←</span> Back
            </Link>
            <button
              type="button"
              onClick={openBook}
              disabled={!canBook}
              className="h-[30px] w-[150px] rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white disabled:opacity-50"
            >
              Book Now
            </button>
          </div>
          {!canBook && <p className="mt-1.5 text-right text-[12px] text-[#667085]">Only farmers and merchants can book storage.</p>}
          </div>
        </div>

        <p className="mt-4 text-[13px] leading-[17px] text-[#667085]">
          {warehouse.description}
        </p>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_300px] items-start gap-5">
        <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_250px] gap-5">
          <div className="relative h-[340px] overflow-hidden rounded-[12px]">
            <img src={gallery[current]} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => setPhoto((current) => (current - 1 + gallery.length) % gallery.length)}
              className="absolute top-1/2 left-[15px] grid size-[25px] -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[14px]"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => setPhoto((current) => (current + 1) % gallery.length)}
              className="absolute top-1/2 right-[15px] grid size-[25px] -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[14px]"
            >
              ›
            </button>
            <div className="absolute right-[15px] bottom-[15px] flex gap-[15px]">
              <button
                type="button"
                onClick={() => setPhoto((current) => (current + 1) % gallery.length)}
                className="flex h-[30px] w-[106px] items-center justify-center gap-1.5 rounded-[8px] bg-white text-[12px]"
              >
                <span aria-hidden="true">▶</span> Virtual Tour
              </button>
              <button
                type="button"
                onClick={() => setLightbox(true)}
                className="flex h-[30px] w-[106px] items-center justify-center gap-1.5 rounded-[8px] bg-white text-[12px]"
              >
                <span aria-hidden="true">▣</span> View Photo
              </button>
            </div>
          </div>
          <div className="grid gap-5">
            {thumbs.map((thumb) => (
              <button
                key={thumb.src}
                type="button"
                onClick={() => setPhoto(thumb.index)}
                className="h-[100px] overflow-hidden rounded-[12px]"
              >
                <img src={thumb.src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-5">
          <Stat icon={WarehouseIcon} label="Total Capacity" value={mt(warehouse.totalCapacityMt)} />
          <Stat icon={BoxIcon} label="Available Capacity" value={mt(warehouse.availableCapacityMt)} />
          <Stat icon={ShieldIcon} label="Current Occupancy" value={mt(warehouse.occupancyMt)} />
          <Stat icon={PinIcon} label="Average rating" value={rating} />
        </div>

        <div className="mt-5 flex h-[50px] items-center gap-7 overflow-x-auto rounded-[10px] bg-white px-[15px]">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`shrink-0 text-[13px] leading-[15px] ${
                tab === item ? 'font-semibold text-[#1F8955]' : 'text-[#667085]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <div className="mt-5 grid grid-cols-3 items-start gap-5">
            <article className="flex min-h-[438px] flex-col rounded-[12px] bg-white px-[15px] py-[15px]">
              <h3 className="text-[15px] leading-[18px] font-semibold">Warehouse Information</h3>
              <div className="mt-3 grid gap-[10px]">
                <Row label="Warehouse Name" value={warehouse.legalName} />
                <Row label="Warehouse ID" value={warehouse.code} />
                <Row label="Type" value={warehouse.type} />
                <Row label="Operator" value={warehouse.operator} />
                <Row label="Year of Establishment" value={warehouse.yearEstablished?.toString() ?? '-'} />
                <Row
                  label="Total Area"
                  value={warehouse.totalAreaSqft == null ? '-' : `${warehouse.totalAreaSqft.toLocaleString('en-IN')} sq ft`}
                />
                <Row label="Warehouse Capacity" value={mt(warehouse.totalCapacityMt)} />
                <Row label="Current Available" value={mt(warehouse.availableCapacityMt)} />
                <Row label="Storage Rate" value={rate} />
                <Row label="Suitable For" value={warehouse.suitableFor} />
                <Row label="Access" value={warehouse.accessHours} />
                <Row label="Connectivity" value={warehouse.connectivity} />
              </div>
              <button
                type="button"
                onClick={openBook}
                disabled={!canBook}
                className="mt-auto self-end pt-3 text-[14px] font-semibold text-[#1F8955] disabled:opacity-50"
              >
                Book Now
              </button>
            </article>
            <article className="min-h-[438px] rounded-[12px] bg-white px-[15px] py-[15px]">
              <h3 className="text-[15px] leading-[17px] font-semibold">Infrastructure Details</h3>
              <div className="mt-3 grid gap-[10px]">
                {warehouse.infrastructure.map((item) => (
                  <Row key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </article>
            <article className="min-h-[438px] rounded-[12px] bg-white px-[15px] py-[15px]">
              <h3 className="text-[15px] leading-[17px] font-semibold">Amenities</h3>
              <ul className="mt-3 grid gap-[10px]">
                {warehouse.amenities.map((item) => (
                  <li key={item} className="flex items-center justify-between text-[12px] leading-3">
                    <span>{item}</span>
                    <span className="grid size-2.5 place-items-center rounded-[2px] bg-[#1F8955] text-[8px] text-white">✓</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        )}

        {tab === 'Inventory' && (
          <Panel>
            <p className="text-[15px] font-semibold">Current stock</p>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <Stat icon={WarehouseIcon} label="Total Capacity" value={mt(warehouse.totalCapacityMt)} />
              <Stat icon={BoxIcon} label="Available Capacity" value={mt(warehouse.availableCapacityMt)} />
              <Stat icon={ShieldIcon} label="Current Occupancy" value={mt(warehouse.occupancyMt)} />
            </div>
            <p className="mt-4 text-[13px] text-[#667085]">Suitable For: {warehouse.suitableFor}</p>
            <p className="mt-1 text-[13px] text-[#667085]">Commodities: {warehouse.crops.join(', ')}</p>
            <p className="mt-1 text-[13px] text-[#667085]">Storage Rate: {rate}</p>
          </Panel>
        )}

        {tab === 'Amenities' && (
          <Panel>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-3">
              {warehouse.amenities.map((item) => (
                <li key={item} className="flex items-center justify-between text-[13px]">
                  <span>{item}</span>
                  <span className="grid size-3 place-items-center rounded-[2px] bg-[#1F8955] text-[8px] text-white">✓</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {tab === 'Licenses' && (
          <Panel>
            <div className="flex flex-wrap gap-3">
              {licenses.map((license) => (
                <span key={license} className="flex h-9 items-center gap-2 rounded-[8px] border border-[#E6E8EC] px-3 text-[13px]">
                  <span className="text-[#1F8955]">✓</span>
                  {license}
                </span>
              ))}
            </div>
          </Panel>
        )}

        {tab === 'Location' && (
          <Panel>
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <PinIcon className="size-4 text-[#1F8955]" />
              {warehouse.address}
            </p>
            <p className="mt-3 text-[13px] text-[#667085]">Connectivity: {warehouse.connectivity}</p>
            <p className="mt-1 text-[13px] text-[#667085]">Access: {warehouse.accessHours}</p>
            <a
              href={`https://www.openstreetmap.org/?mlat=${warehouse.latitude}&mlon=${warehouse.longitude}#map=13/${warehouse.latitude}/${warehouse.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1F8955]"
            >
              <PinIcon className="size-3.5" />
              {warehouse.latitude}, {warehouse.longitude} · View on map
            </a>
          </Panel>
        )}

        {tab === 'Nearby Warehouses' && (
          <Panel>
            <div className="grid gap-3">
              {nearby.error ? <ErrorBanner error={nearby.error} onRetry={nearby.reload} /> : null}
              {nearby.loading && !nearby.data ? <p className="text-[13px] text-[#667085]">Loading nearby warehouses…</p> : null}
              {nearby.data?.length === 0 ? <p className="text-[13px] text-[#667085]">No other warehouses nearby.</p> : null}
              {nearby.data?.map((item) => (
                <Link key={item.id} to={`/store/${item.id}`} className="flex items-center gap-3 rounded-[10px] border border-[#E6E8EC] p-2">
                  <img src={item.imageUrl} alt="" className="h-14 w-20 rounded-[8px] object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-semibold">{item.name}</span>
                    <span className="block text-[12px] text-[#667085]">
                      {item.address}
                      {item.distanceKm != null ? ` · ${item.distanceKm} Km away` : ''}
                    </span>
                  </span>
                  <span className="text-[13px] font-semibold text-[#1F8955]">{mt(item.availableCapacityMt)}</span>
                </Link>
              ))}
            </div>
          </Panel>
        )}

        {tab === 'Reviews' && (
          <Panel>
            <p className="text-[28px] leading-none font-bold text-[#1F8955]">{rating}</p>
            <p className="mt-2 text-[14px] text-[#667085]">
              {warehouse.ratingCount > 0
                ? `Average of ${warehouse.ratingCount} auditor visit${warehouse.ratingCount === 1 ? '' : 's'} at ${warehouse.name}.`
                : `${warehouse.name} has not been audited yet.`}
            </p>
            {warehouse.latestAudit && (
              <div className="mt-4 rounded-[10px] border border-[#E6E8EC] p-3 text-[13px]">
                <p className="font-semibold">
                  Latest audit · {toUiDate(warehouse.latestAudit.auditedOn)} ·{' '}
                  {warehouse.latestAudit.result.replaceAll('_', ' ').toLowerCase()}
                </p>
                <p className="mt-1 text-[#667085]">
                  {warehouse.latestAudit.auditorName} rated it {warehouse.latestAudit.rating}/5
                </p>
                {warehouse.latestAudit.findings && <p className="mt-1 text-[#667085]">{warehouse.latestAudit.findings}</p>}
              </div>
            )}
          </Panel>
        )}
        </div>
        <MarketRail />
        </div>
      </main>

      {booking && !restoring && (!user ? <Navigate to="/login" replace /> : canBook && <BookNowModal warehouse={warehouse} onClose={closeBook} />)}
      {lightbox && (
        <button type="button" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-10" onClick={() => setLightbox(false)}>
          <img src={gallery[current]} alt="" className="max-h-full max-w-[900px] rounded-[12px] object-contain" />
        </button>
      )}
    </DashboardShell>
  )
}

function Stat({ icon: Icon, label, value }: { icon: typeof WarehouseIcon; label: string; value: string }) {
  return (
    <article className="flex h-[75px] items-center gap-3 rounded-[12px] bg-white px-[15px]">
      <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-[#E7F6EE] text-[#1F8955]">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-[12px] leading-[15px] text-[#667085]">{label}</p>
        <p className="text-[16px] leading-[19px] font-bold">{value}</p>
      </div>
    </article>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-start justify-between gap-2 text-[11px] leading-[14px]">
      <span className="shrink-0 whitespace-nowrap text-[#667085]">{label}</span>
      <span className="text-right font-medium text-[#1E1E1E]">{value}</span>
    </p>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="mt-5 rounded-[12px] bg-white p-5">{children}</section>
}

function BookNowModal({ warehouse, onClose }: { warehouse: WarehouseDetails; onClose: () => void }) {
  const navigate = useNavigate()
  const create = useAction(api.bookings.create)
  const [commodity, setCommodity] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState('')
  const [formError, setFormError] = useState<string>()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setFormError(undefined)
    const preferredDate = toApiDate(date)
    const quantityQtl = Number(quantity)
    if (!commodity || !quantity.trim() || !preferredDate) return setFormError('Commodity, quantity and date are required')
    if (!(quantityQtl > 0)) return setFormError('Quantity must be a number above 0')
    const created = await create.run({ warehouseId: warehouse.id, commodity, quantityQtl, preferredDate })
    if (created) navigate('/store/booking')
  }

  const fieldError = (field: string) => create.error?.fieldMessage(field)
  const generalError =
    formError ??
    (create.error && !fieldError('commodity') && !fieldError('quantityQtl') && !fieldError('preferredDate') ? create.error.message : undefined)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/40 px-4 py-6" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Book Now"
        className="w-[350px] rounded-[16px] bg-white px-[15px] pt-[15px] pb-[15px] shadow-[0_20px_50px_rgba(16,24,40,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="text-center text-[24px] leading-[29px] font-bold">Book Now</h2>
        <label className="mt-[10px] block text-[14px] leading-[19px]">Location</label>
        <label className="mt-2.5 flex h-12 items-center gap-2 rounded-[8px] border border-[#E6E8EC] px-2.5">
          <PinIcon className="size-5 shrink-0 text-[#667085]" />
          <input value={warehouse.address} readOnly aria-label="Location" className="w-full bg-transparent text-[14px] outline-none" />
        </label>
        <label className="mt-[15px] block text-[14px] leading-[19px]">Commodity Name*</label>
        <label className="relative mt-2.5 block">
          <select
            aria-label="Commodity name"
            value={commodity}
            onChange={(event) => setCommodity(event.target.value)}
            className={`h-12 w-full appearance-none rounded-[8px] border border-[#E6E8EC] bg-white pr-10 pl-2.5 text-[14px] outline-none ${
              commodity ? 'text-[#1E1E1E]' : 'text-[#98A2B3]'
            }`}
          >
            <option value="">E.g. Wheat</option>
            {warehouse.crops.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#667085]">▾</span>
        </label>
        <FieldError message={fieldError('commodity')} />
        <label className="mt-[15px] block text-[14px] leading-[19px]">Quantity (in Quintal)*</label>
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="E.g. 23"
          aria-label="Quantity in quintal"
          inputMode="decimal"
          className="mt-2.5 h-12 w-full rounded-[8px] border border-[#E6E8EC] px-2.5 text-[14px] outline-none placeholder:text-[#98A2B3]"
        />
        <FieldError message={fieldError('quantityQtl')} />
        <label className="mt-[15px] block text-[14px] leading-[19px]">Date*</label>
        <label className="relative mt-2.5 block">
          <input
            value={date}
            onChange={(event) => setDate(event.target.value)}
            placeholder="E.g. 23/08/2025"
            aria-label="Date"
            className="h-12 w-full rounded-[8px] border border-[#E6E8EC] px-2.5 pr-10 text-[14px] outline-none placeholder:text-[#98A2B3]"
          />
          <input
            type="date"
            aria-label="Pick a date"
            className="absolute top-3 right-3 size-6 cursor-pointer opacity-0"
            onChange={(event) => {
              const [year, month, day] = event.target.value.split('-')
              if (year && month && day) setDate(`${day}/${month}/${year}`)
            }}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[16px] text-[#667085]">▦</span>
        </label>
        <FieldError message={fieldError('preferredDate')} />
        <FieldError message={generalError} />
        <button
          type="submit"
          disabled={create.busy}
          className="mt-[10px] h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-semibold text-white disabled:opacity-60"
        >
          {create.busy ? 'Booking…' : 'Confirm'}
        </button>
      </form>
    </div>
  )
}
