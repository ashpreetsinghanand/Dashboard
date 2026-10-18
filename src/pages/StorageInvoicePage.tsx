import { useMemo, useState } from 'react'
import { RequestLayout, StatusPill } from '../components/RequestLayout'
import { commodityImage } from '../data/bookings'

const invoices = [
  { id: 'coffee', commodity: 'Coffee', detail: '100MT - Grade A', invoice: 'INV-2026-00125', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', charge: '500 MT', total: '500 Qtl', status: 'Paid' },
  { id: 'turmeric', commodity: 'Turmeric', detail: 'Raw', invoice: 'INV-2026-00125', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', charge: '500 MT', total: '500 Qtl', status: 'Pending' },
  { id: 'cardamum', commodity: 'Cardamum', detail: 'Raw', invoice: 'INV-2026-00125', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', charge: '', total: '500 Qtl', status: 'Paid' },
  { id: 'pepper', commodity: 'Black Pepper', detail: 'Raw', invoice: 'INV-2026-00125', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', charge: '', total: '500 Qtl', status: 'Paid' },
  { id: 'cumin', commodity: 'Cumin', detail: 'Raw', invoice: 'INV-2026-00125', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', charge: '', total: '500 Qtl', status: 'Pending' },
  { id: 'clove', commodity: 'Clove', detail: 'Raw', invoice: 'INV-2026-00125', warehouse: 'Nayak Warehouse', location: 'Lalitpur, UP', charge: '', total: '500 Qtl', status: 'Paid' },
]

const invoiceCols = 'grid-cols-[86px_113px_98px_119px_82px_110px_71px_186px]'

const statusChips = ['All', 'Paid', 'Pending', 'Overdue', 'Draft', 'Cancelled']
const commodityChips = ['All Commodities', 'Pending', 'Overdue', 'Draft', 'Cancelled']

export function StorageInvoicePage() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [status, setStatus] = useState('All')
  const [second, setSecond] = useState('All Commodities')
  const [layout, setLayout] = useState<'list' | 'grid'>('list')

  const visible = useMemo(() => {
    const text = applied.trim().toLowerCase()
    return invoices.filter((row) => {
      const matchesText =
        text === '' || `${row.commodity} ${row.warehouse} ${row.location} ${row.invoice}`.toLowerCase().includes(text)
      const matchesStatus = status === 'All' || row.status === status
      const matchesSecond = second === 'All Commodities' || row.status === second
      return matchesText && matchesStatus && matchesSecond
    })
  }, [applied, second, status])

  return (
    <RequestLayout
      section="store"
      storePage="Storage Invoice"
      crumb="Storage Invoice"
      title="Store"
      subtitle="Track and manage you warehouse storage requests."
      toolbar={
      <form
        className="flex items-center gap-[10px]"
        onSubmit={(event) => {
          event.preventDefault()
          setApplied(query)
        }}
      >
        <label className="flex h-[30px] min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-[#E6E8EC] bg-white px-2.5">
          <span className="text-[13px] text-[#98A2B3]">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by commodity, warehouse, location..."
            aria-label="Search invoices"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[#98A2B3]"
          />
        </label>
        <button type="submit" className="h-[30px] w-[150px] shrink-0 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white">
          Search
        </button>
      </form>
      }
    >
      <div className="flex flex-wrap gap-2">
        {statusChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setStatus(chip)}
            className={`h-[30px] rounded-full px-3 text-[13px] ${
              status === chip ? 'bg-[#E7F6EE] font-medium text-[#1F8955]' : 'bg-white text-[#344054]'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {commodityChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => setSecond(chip)}
            className={`h-[30px] rounded-full px-3 text-[13px] ${
              second === chip ? 'bg-[#1F8955] text-white' : 'border border-[#E6E8EC] bg-white text-[#344054]'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <div className="flex h-[30px] overflow-hidden rounded-[8px] border border-[#E6E8EC] bg-white">
          <button
            type="button"
            onClick={() => setLayout('grid')}
            className={`px-3 text-[13px] ${layout === 'grid' ? 'bg-[#1F8955] text-white' : 'text-[#344054]'}`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setLayout('list')}
            className={`px-3 text-[13px] ${layout === 'list' ? 'bg-[#1F8955] text-white' : 'text-[#344054]'}`}
          >
            List
          </button>
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="mt-3 rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">
          No invoices match these filters.
        </p>
      ) : layout === 'list' ? (
        <div className="mt-3 overflow-hidden rounded-[12px] bg-white">
          <div className={`grid h-[50px] ${invoiceCols} items-center pl-[15px] text-[12px] text-[#667085]`}>
            <span>Commodity</span>
            <span>Invoice Details</span>
            <span>Warehouse</span>
            <span>Storage Period</span>
            <span>Charges</span>
            <span>Total Amount</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {visible.map((row) => (
            <div
              key={row.id}
              className={`grid h-[70px] ${invoiceCols} items-center border-t border-[#F2F4F7] pl-[15px] text-[13px]`}
            >
              <img src={commodityImage(row.commodity)} alt="" className="size-10 rounded-[8px] object-cover" />
              <span>
                <span className="block leading-[15px] font-medium">{row.commodity}</span>
                <span className="block text-[11px] leading-3 text-[#98A2B3]">{row.detail}</span>
                <span className="mt-0.5 inline-block rounded-[2px] bg-[#F2F4F7] px-1 text-[8px] leading-[10px] text-[#98A2B3]">{row.invoice}</span>
              </span>
              <span className="w-16 leading-[15px]">{row.warehouse}</span>
              <span>{row.location}</span>
              <span>{row.charge}</span>
              <span>{row.total}</span>
              <StatusPill status={row.status} className="w-[60px] justify-self-start" />
              <span className="flex items-center gap-3 text-[12px] whitespace-nowrap text-[#1F8955]">
                <button type="button" className="flex items-center gap-1">
                  <EyeIcon />
                  View Details
                </button>
                <button type="button" className="flex items-center gap-1">
                  <DownloadIcon />
                  Download
                </button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {visible.map((row) => (
            <article key={row.id} className="flex gap-3 rounded-[12px] bg-white p-3">
              <img src={commodityImage(row.commodity)} alt="" className="size-16 rounded-[8px] object-cover" />
              <div className="min-w-0 text-[13px]">
                <p className="font-semibold">{row.commodity}</p>
                <p className="text-[12px] text-[#98A2B3]">{row.detail}</p>
                <p className="mt-1">{row.invoice}</p>
                <p className="text-[#667085]">{row.location}</p>
                <div className="mt-2">
                  <StatusPill status={row.status} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </RequestLayout>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[15px] shrink-0" aria-hidden="true">
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[15px] shrink-0" aria-hidden="true">
      <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
