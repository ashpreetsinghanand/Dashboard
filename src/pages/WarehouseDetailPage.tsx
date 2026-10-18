import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DashboardShell } from '../components/DashboardShell'
import { BoxIcon, PinIcon, ShieldIcon, WarehouseIcon } from '../components/Icons'
import { saveBooking } from '../data/bookings'
import { warehouseById, warehouses, type Warehouse } from '../data/warehouses'

const tabs = ['Overview', 'Inventory', 'Amenities', 'Licenses', 'Location', 'Nearby Warehouses', 'Reviews']

const infrastructure = [
  ['Structure', '1'],
  ['Age of Warehouse', '0-5 Years'],
  ['Floor Type', 'RCC'],
  ['Type of Door', 'Iron Shutter'],
  ['Compound Gate', 'Yes'],
  ['Roof', 'Tin'],
  ['Wall Type', 'Tin'],
  ['Floor Size (ft)', `131'44" X 16'`],
  ['Plinth Height', '8 ft'],
  ['Number of Doors', '2'],
  ['Number of Windows', '13'],
  ['Ventilation Type', 'Normal'],
  ['Fire Safety', 'Yes (NOC)'],
  ['Security', 'CCTV, Guard Room'],
]

const amenities = [
  'Pakka Road',
  'Separate Guard Room',
  'Fire Extinguishers',
  'Phone',
  'Rodent Control',
  'Safety Signage',
  'Running Water',
  'Open Plinth',
  'Electricity',
  'Fire/Smoke Detector',
  'Sprinkler System',
  'Grading Machine',
  'Iron Sheet',
  'Drain Pipes',
  'Drinking Water',
  'Fire Bucket',
  'Hoses & Hydrant',
  'Lock & Key',
]

const licenses = ['Verified Warehouse', 'WDRA Registered', 'FSSAI Compliant', 'Quality Assued']

function profile(warehouse: Warehouse) {
  if (warehouse.id === 'nayak') {
    return {
      legalName: 'Nayak Stone Industries',
      code: 'WAH-UP-0823',
      operator: 'Nayak Industries Pvt. Ltd.',
      total: '5,000 MT',
      available: '2,600 MT',
      occupancy: '2,400 MT',
    }
  }
  const total = Number(warehouse.capacity.replace(/[^\d]/g, '')) || 0
  const available = Math.round(total * 0.52)
  return {
    legalName: warehouse.name,
    code: `WAH-${warehouse.shortLocation.slice(0, 2).toUpperCase()}-${warehouse.id.length}823`,
    operator: `${warehouse.name} Pvt. Ltd.`,
    total: warehouse.capacity,
    available: `${available.toLocaleString('en-IN')} MT`,
    occupancy: `${Math.max(total - available, 0).toLocaleString('en-IN')} MT`,
  }
}

export function WarehouseDetailPage() {
  const { id = 'nayak' } = useParams()
  const warehouse = warehouseById(id)
  const facts = profile(warehouse)
  const [params, setParams] = useSearchParams()
  const booking = params.get('book') === '1'
  const [tab, setTab] = useState('Overview')
  const gallery = useMemo(() => {
    const photos = [warehouse.image, '/assets/warehouse.png', '/assets/farmer-field.png', '/assets/hero.jpg', '/assets/warehouse-card.png']
    return photos.filter((photo, index) => photos.indexOf(photo) === index).slice(0, 4)
  }, [warehouse.image])
  const [photo, setPhoto] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  useEffect(() => {
    setPhoto(0)
    setTab('Overview')
  }, [warehouse.id])

  function openBook() {
    const next = new URLSearchParams(params)
    next.set('book', '1')
    setParams(next)
  }

  function closeBook() {
    const next = new URLSearchParams(params)
    next.delete('book')
    setParams(next, { replace: true })
  }

  const thumbs = gallery.map((src, index) => ({ src, index })).filter((item) => item.index !== photo)

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
          <img src={warehouse.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E4F38]/80 via-[#0E4F38]/55 to-[#0E4F38]/20" />
          <div className="relative px-[15px] pt-[15px] text-white">
            <h1 className="text-[24px] leading-[29px] font-bold">Warehouse Details</h1>
            <p className="mt-[10px] max-w-[641px] text-[14px] leading-[19px]">
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
                {warehouse.location}
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
          <div className="flex shrink-0 gap-[15px]">
            <Link
              to="/store"
              className="flex h-[30px] w-[136px] items-center justify-center gap-2 rounded-[8px] border border-[#D0D5DD] bg-white text-[14px]"
            >
              <span aria-hidden="true">←</span> Back
            </Link>
            <button
              type="button"
              onClick={openBook}
              className="h-[30px] w-[150px] rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white"
            >
              Book Now
            </button>
          </div>
        </div>

        <p className="mt-4 max-w-[880px] text-[13px] leading-[17px] text-[#667085]">
          Modern warehouse facilty with high capacity , suitable for gains , pulses and other agricultural commodities. Well
          connected by road and idle for long term storage.
        </p>

        <div className="mt-4 grid w-[880px] grid-cols-[610px_250px] gap-5">
          <div className="relative h-[340px] overflow-hidden rounded-[12px]">
            <img src={gallery[photo]} alt="" className="h-full w-full object-cover" />
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

        <div className="mt-5 grid w-[880px] grid-cols-4 gap-5">
          <Stat icon={WarehouseIcon} label="Total Capacity" value={facts.total} />
          <Stat icon={BoxIcon} label="Available Capacity" value={facts.available} />
          <Stat icon={ShieldIcon} label="Current Occupancy" value={facts.occupancy} />
          <Stat icon={PinIcon} label="Average rating" value="4.6/5" />
        </div>

        <div className="mt-5 flex h-[50px] w-[880px] items-center gap-7 overflow-x-auto rounded-[10px] bg-white px-[15px]">
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
          <div className="mt-5 grid w-[880px] grid-cols-3 items-start gap-5">
            <article className="flex min-h-[438px] flex-col rounded-[12px] bg-white px-[15px] py-[15px]">
              <h3 className="text-[15px] leading-[18px] font-semibold">Warehouse Information</h3>
              <div className="mt-3 grid gap-[10px]">
                <Row label="Warehouse Name" value={facts.legalName} />
                <Row label="Warehouse ID" value={facts.code} />
                <Row label="Type" value="Private" />
                <Row label="Operator" value={facts.operator} />
                <Row label="Year of Establishment" value="2021" />
                <Row label="Total Area" value="13,000 sq ft" />
                <Row label="Warehouse Capacity" value={facts.total} />
                <Row label="Current Available" value={facts.available} />
                <Row label="Suitable For" value="Gains, Pulses, Oilseeds, Spices" />
                <Row label="Access" value="24/7" />
                <Row label="Connectivity" value="NH-44 (12Km), Rail (28 Km)" />
              </div>
              <button type="button" onClick={openBook} className="mt-auto self-end pt-3 text-[14px] font-semibold text-[#1F8955]">
                Book Now
              </button>
            </article>
            <article className="min-h-[438px] rounded-[12px] bg-white px-[15px] py-[15px]">
              <h3 className="text-[15px] leading-[17px] font-semibold">Infrastructure Details</h3>
              <div className="mt-3 grid gap-[10px]">
                {infrastructure.map(([label, value]) => (
                  <Row key={label} label={label} value={value} />
                ))}
              </div>
            </article>
            <article className="min-h-[438px] rounded-[12px] bg-white px-[15px] py-[15px]">
              <h3 className="text-[15px] leading-[17px] font-semibold">Amenities</h3>
              <ul className="mt-3 grid gap-[10px]">
                {amenities.map((item) => (
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
              <Stat icon={WarehouseIcon} label="Total Capacity" value={facts.total} />
              <Stat icon={BoxIcon} label="Available Capacity" value={facts.available} />
              <Stat icon={ShieldIcon} label="Current Occupancy" value={facts.occupancy} />
            </div>
            <p className="mt-4 text-[13px] text-[#667085]">Suitable For: Gains, Pulses, Oilseeds, Spices</p>
          </Panel>
        )}

        {tab === 'Amenities' && (
          <Panel>
            <ul className="grid grid-cols-2 gap-x-8 gap-y-3">
              {amenities.map((item) => (
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
              {warehouse.location}
            </p>
            <p className="mt-3 text-[13px] text-[#667085]">Connectivity: NH-44 (12Km), Rail (28 Km)</p>
            <p className="mt-1 text-[13px] text-[#667085]">Access: 24/7</p>
          </Panel>
        )}

        {tab === 'Nearby Warehouses' && (
          <Panel>
            <div className="grid gap-3">
              {warehouses
                .filter((item) => item.id !== warehouse.id)
                .slice(0, 4)
                .map((item) => (
                  <Link key={item.id} to={`/store/${item.id}`} className="flex items-center gap-3 rounded-[10px] border border-[#E6E8EC] p-2">
                    <img src={item.image} alt="" className="h-14 w-20 rounded-[8px] object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold">{item.name}</span>
                      <span className="block text-[12px] text-[#667085]">
                        {item.location} · {item.distance}
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold text-[#1F8955]">{item.capacity}</span>
                  </Link>
                ))}
            </div>
          </Panel>
        )}

        {tab === 'Reviews' && (
          <Panel>
            <p className="text-[28px] leading-none font-bold text-[#1F8955]">4.6/5</p>
            <p className="mt-2 text-[14px] text-[#667085]">Average rating from verified depositors at {warehouse.name}.</p>
          </Panel>
        )}
      </main>

      {booking && <BookNowModal warehouse={warehouse} onClose={closeBook} />}
      {lightbox && (
        <button type="button" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-10" onClick={() => setLightbox(false)}>
          <img src={gallery[photo]} alt="" className="max-h-full max-w-[900px] rounded-[12px] object-contain" />
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
  return <section className="mt-5 w-[880px] rounded-[12px] bg-white p-5">{children}</section>
}

function BookNowModal({ warehouse, onClose }: { warehouse: Warehouse; onClose: () => void }) {
  const navigate = useNavigate()
  const [location, setLocation] = useState(warehouse.location)
  const [commodity, setCommodity] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState('')

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
        className="w-[350px] rounded-[16px] bg-white px-[15px] pt-[15px] pb-[15px] shadow-[0_20px_50px_rgba(16,24,40,0.18)]"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          saveBooking({
            commodity: commodity || 'Wheat',
            warehouse: warehouse.name,
            location: warehouse.shortLocation || location,
            date: date || '21/09/2026',
            quantity: quantity || '500',
          })
          navigate('/store/booking')
        }}
      >
        <h2 className="text-center text-[24px] leading-[29px] font-bold">Book Now</h2>
        <label className="mt-[10px] block text-[14px] leading-[19px]">Location</label>
        <label className="mt-2.5 flex h-12 items-center gap-2 rounded-[8px] border border-[#E6E8EC] px-2.5">
          <PinIcon className="size-5 shrink-0 text-[#667085]" />
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full bg-transparent text-[14px] outline-none"
          />
        </label>
        <label className="mt-[15px] block text-[14px] leading-[19px]">Commodity Name*</label>
        <label className="relative mt-2.5 block">
          <select
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
        <label className="mt-[15px] block text-[14px] leading-[19px]">Quantity (in Quintal)*</label>
        <input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          placeholder="E.g. 23"
          className="mt-2.5 h-12 w-full rounded-[8px] border border-[#E6E8EC] px-2.5 text-[14px] outline-none placeholder:text-[#98A2B3]"
        />
        <label className="mt-[15px] block text-[14px] leading-[19px]">Date</label>
        <label className="relative mt-2.5 block">
          <input
            value={date}
            onChange={(event) => setDate(event.target.value)}
            placeholder="E.g. 23/08/2025"
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
        <button type="submit" className="mt-[10px] h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-semibold text-white">
          Confirm
        </button>
      </form>
    </div>
  )
}
