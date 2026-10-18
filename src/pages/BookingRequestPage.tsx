import { useMemo, useState } from 'react'
import { RequestLayout, StatusPill } from '../components/RequestLayout'
import { commodityImage, readBookings } from '../data/bookings'

const seed = [
  { id: 'coffee', commodity: 'Coffee', grade: 'Grade A', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', date: '21/09/2026', quantity: '500 Qtl', status: 'Pending' },
  { id: 'turmeric', commodity: 'Turmeric', grade: 'Raw', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', date: '21/09/2026', quantity: '500 Qtl', status: 'Accepted' },
  { id: 'cardamum', commodity: 'Cardamum', grade: 'Raw', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', date: '21/09/2026', quantity: '500 Qtl', status: 'Rejected' },
  { id: 'pepper', commodity: 'Black Pepper', grade: 'Raw', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', date: '21/09/2026', quantity: '500 Qtl', status: 'Pending' },
  { id: 'cumin', commodity: 'Cumin', grade: 'Raw', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', date: '21/09/2026', quantity: '500 Qtl', status: 'Accepted' },
  { id: 'cumin-2', commodity: 'Cumin', grade: 'Raw', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', date: '21/09/2026', quantity: '500 Qtl', status: 'Accepted' },
]

const statuses = ['All Status', 'Pending', 'Accepted', 'Rejected']
const bookingCols = 'grid-cols-[140px_138px_123px_155px_123px_111px_75px]'

export function BookingRequestPage() {
  const saved = useMemo(() => readBookings(), [])
  const rows = useMemo(
    () => [
      ...saved.map((item) => ({
        id: item.id,
        commodity: item.commodity,
        grade: item.grade,
        warehouse: item.warehouse,
        location: item.location,
        date: item.date,
        quantity: item.quantity.includes('Qtl') ? item.quantity : `${item.quantity} Qtl`,
        status: item.status,
      })),
      ...seed,
    ],
    [saved],
  )
  const commodities = ['All Commodities', ...Array.from(new Set(rows.map((row) => row.commodity)))]
  const dates = ['Select Date', ...Array.from(new Set(rows.map((row) => row.date)))]
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [status, setStatus] = useState(statuses[0])
  const [commodity, setCommodity] = useState('All Commodities')
  const [date, setDate] = useState(dates[0])
  const [more, setMore] = useState(false)

  const visible = rows.filter((row) => {
    const text = applied.trim().toLowerCase()
    const matchesText =
      text === '' || `${row.commodity} ${row.warehouse} ${row.location}`.toLowerCase().includes(text)
    const matchesStatus = status === 'All Status' || row.status === status
    const matchesCommodity = commodity === 'All Commodities' || row.commodity === commodity
    const matchesDate = date === 'Select Date' || row.date === date
    return matchesText && matchesStatus && matchesCommodity && matchesDate
  })

  return (
    <RequestLayout
      section="store"
      storePage="Booking Request"
      crumb="Booking Request"
      title="Booking Request"
      subtitle="Track and manage you warehouse storage requests."
      toolbar={
      <form
        className="flex items-center gap-[15px]"
        onSubmit={(event) => {
          event.preventDefault()
          setApplied(query)
        }}
      >
        <label className="flex h-[30px] w-[376px] shrink-0 items-center gap-2 rounded-[8px] border border-[#E6E8EC] bg-white px-2.5">
          <SearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by commodity, warehouse, location..."
            aria-label="Search bookings"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#98A2B3]"
          />
        </label>
        <MiniSelect label="Status" value={status} options={statuses} onChange={setStatus} />
        <MiniSelect label="Commodity" value={commodity} options={commodities} onChange={setCommodity} />
        <MiniSelect label="Date" value={date} options={dates} onChange={setDate} />
        <button
          type="button"
          onClick={() => setMore((open) => !open)}
          className={`flex h-[30px] w-[150px] shrink-0 items-center justify-center gap-1.5 rounded-[8px] border bg-white text-[13px] ${
            more ? 'border-[#1F8955] text-[#1F8955]' : 'border-[#E6E8EC] text-[#344054]'
          }`}
        >
          <span className="text-[15px] leading-none">☰</span>
          More Filter
        </button>
        <button type="submit" className="h-[30px] w-[150px] shrink-0 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white">
          Search
        </button>
      </form>
      }
    >
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
      <div className="mt-3 overflow-hidden rounded-[12px] bg-white">
        <div className={`grid h-[50px] ${bookingCols} items-center pl-[15px] text-[13px] text-[#667085]`}>
          <span>Commodity</span>
          <span>Warehouse</span>
          <span>Location</span>
          <span>Requested On</span>
          <span>Quantity</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">No booking requests match these filters.</p>
        ) : (
          visible.map((row) => (
            <div
              key={row.id}
              className={`grid h-[70px] ${bookingCols} items-center border-t border-[#F2F4F7] pl-[15px] text-[13px]`}
            >
              <span className="flex items-center gap-2">
                <img src={commodityImage(row.commodity)} alt="" className="size-10 shrink-0 rounded-[8px] object-cover" />
                <span>
                  <span className="block font-medium">{row.commodity}</span>
                  <span className="text-[11px] text-[#98A2B3]">{row.grade}</span>
                </span>
              </span>
              <span className="w-16 leading-[15px]">{row.warehouse}</span>
              <span>{row.location}</span>
              <span>{row.date}</span>
              <span>{row.quantity}</span>
              <StatusPill status={row.status} className="w-[100px] justify-self-start" />
              <button type="button" aria-label={`Actions for ${row.commodity}`} className="grid size-6 place-items-center text-[#667085]">
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <circle cx="12" cy="6" r="1.4" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                  <circle cx="12" cy="18" r="1.4" fill="currentColor" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </RequestLayout>
  )
}

function MiniSelect({
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
    <label className="relative block h-[30px] w-[150px] shrink-0">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-full w-full appearance-none rounded-[8px] border border-[#E6E8EC] bg-white px-2.5 pr-7 text-[13px] outline-none"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-[#667085]">▾</span>
    </label>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[15px] shrink-0 text-[#98A2B3]" aria-hidden="true">
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
