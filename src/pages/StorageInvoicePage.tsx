import { useState, type ReactNode } from 'react'
import { api } from '../api/endpoints'
import type { Invoice, InvoiceStatus } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { RequestLayout, StatusPill } from '../components/RequestLayout'
import { Pager } from '../components/store/Pager'
import { ErrorBanner, LedgerTimeline, Modal } from '../components/ui'
import { money, mt, shortHash, statusLabel, toUiDate } from '../lib/format'
import { useAction, useApi } from '../lib/useApi'

const invoiceCols = 'grid-cols-[86px_113px_98px_119px_82px_110px_71px_186px]'

const statusChips = ['All', 'Paid', 'Pending', 'Overdue', 'Cancelled']

export function StorageInvoicePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [status, setStatus] = useState('All')
  const [commodity, setCommodity] = useState('All Commodities')
  const [page, setPage] = useState(0)
  const [layout, setLayout] = useState<'list' | 'grid'>('list')
  const [details, setDetails] = useState<Invoice>()
  const [notice, setNotice] = useState<string>()

  const reference = useApi(() => api.reference.commodities(), [])
  const commodityChips = ['All Commodities', ...(reference.data?.map((item) => item.name) ?? [])]
  const { data, loading, error, reload } = useApi(
    () =>
      api.invoices.search({
        q: applied.trim() || undefined,
        status: status === 'All' ? undefined : (status.toUpperCase() as InvoiceStatus),
        commodity: commodity === 'All Commodities' ? undefined : commodity,
        page,
      }),
    [applied, status, commodity, page],
  )
  const visible = data?.items ?? []

  // Pay and cancel reload whatever happens: INVALID_STATE usually means the invoice changed elsewhere.
  const change = useAction(async (call: () => Promise<Invoice>) => {
    try {
      return await call()
    } finally {
      reload()
    }
  })
  const download = useAction(api.invoices.download)
  const busy = change.busy || download.busy

  async function pay(row: Invoice) {
    if (!window.confirm(`Pay ${money(row.amount, row.currency)} for ${row.invoiceNo}?`)) return
    setNotice(undefined)
    const paid = await change.run(() => api.invoices.pay(row.id))
    if (paid) setNotice(`${paid.invoiceNo} paid${paid.paymentRef ? ` · ref ${paid.paymentRef}` : ''}.`)
  }

  async function cancel(row: Invoice) {
    if (!window.confirm(`Cancel ${row.invoiceNo}? The depositor will no longer be billed for it.`)) return
    setNotice(undefined)
    if (await change.run(() => api.invoices.cancel(row.id))) setNotice(`${row.invoiceNo} cancelled.`)
  }

  function actions(row: Invoice): ReactNode {
    const canPay = user?.id === row.depositorId && (row.status === 'PENDING' || row.status === 'OVERDUE')
    const canCancel = user?.role === 'WAREHOUSE_OWNER' && row.status === 'PENDING'
    return (
      <>
        <button type="button" onClick={() => setDetails(row)} className="flex items-center gap-1 whitespace-nowrap">
          <EyeIcon />
          View Details
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void download.run(row.id)}
          className="flex items-center gap-1 whitespace-nowrap disabled:opacity-50"
        >
          <DownloadIcon />
          Download
        </button>
        {canPay && (
          <button type="button" disabled={busy} onClick={() => void pay(row)} className="font-semibold whitespace-nowrap disabled:opacity-50">
            Pay
          </button>
        )}
        {canCancel && (
          <button type="button" disabled={busy} onClick={() => void cancel(row)} className="whitespace-nowrap text-[#D92D20] disabled:opacity-50">
            Cancel
          </button>
        )}
      </>
    )
  }

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
          setPage(0)
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
            onClick={() => {
              setStatus(chip)
              setPage(0)
            }}
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
            onClick={() => {
              setCommodity(chip)
              setPage(0)
            }}
            className={`h-[30px] rounded-full px-3 text-[13px] ${
              commodity === chip ? 'bg-[#1F8955] text-white' : 'border border-[#E6E8EC] bg-white text-[#344054]'
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
      {change.error || download.error ? (
        <div className="mt-3">
          <ErrorBanner error={change.error ?? download.error} />
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="mt-3 rounded-[10px] bg-[#E7F6EE] px-4 py-3 text-[14px] text-[#1F8955]">
          {notice}
        </p>
      ) : null}
      {error ? (
        <div className="mt-3">
          <ErrorBanner error={error} onRetry={reload} />
        </div>
      ) : loading && !data ? (
        <p className="mt-3 rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">Loading invoices…</p>
      ) : visible.length === 0 ? (
        <p className="mt-3 rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">
          No invoices match these filters.
        </p>
      ) : layout === 'list' ? (
        <div className={`mt-3 overflow-hidden rounded-[12px] bg-white ${loading ? 'opacity-60' : ''}`}>
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
              className={`grid min-h-[70px] ${invoiceCols} items-center border-t border-[#F2F4F7] py-2 pl-[15px] text-[13px]`}
            >
              <img src={row.imageUrl} alt="" className="size-10 rounded-[8px] object-cover" />
              <span>
                <span className="block leading-[15px] font-medium">{row.commodity}</span>
                <span className="block text-[11px] leading-3 text-[#98A2B3]">
                  {mt(row.quantityMt)} - {row.grade}
                </span>
                <span className="mt-0.5 inline-block rounded-[2px] bg-[#F2F4F7] px-1 text-[8px] leading-[10px] text-[#98A2B3]">{row.invoiceNo}</span>
              </span>
              <span className="w-16 leading-[15px]">{row.warehouseName}</span>
              <span className="pr-2 leading-[15px]">
                {toUiDate(row.periodFrom)} – {toUiDate(row.periodTo)}
              </span>
              {/* the rate has no natural break point and overflowed its 82px column, so split it */}
              <span className="pr-2 leading-[15px]">
                {money(row.ratePerMtMonth, row.currency)}
                <span className="block text-[11px] text-[#98A2B3]">/MT/month</span>
              </span>
              <span>{money(row.amount, row.currency)}</span>
              <StatusPill status={statusLabel(row.status)} className="w-[60px] justify-self-start" />
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#1F8955]">{actions(row)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className={`mt-3 grid grid-cols-2 gap-3 ${loading ? 'opacity-60' : ''}`}>
          {visible.map((row) => (
            <article key={row.id} className="flex gap-3 rounded-[12px] bg-white p-3">
              <img src={row.imageUrl} alt="" className="size-16 rounded-[8px] object-cover" />
              <div className="min-w-0 text-[13px]">
                <p className="font-semibold">{row.commodity}</p>
                <p className="text-[12px] text-[#98A2B3]">
                  {mt(row.quantityMt)} - {row.grade}
                </p>
                <p className="mt-1">{row.invoiceNo}</p>
                <p className="text-[#667085]">
                  {row.warehouseName}, {row.warehouseLocation}
                </p>
                <p className="font-semibold">{money(row.amount, row.currency)}</p>
                <div className="mt-2">
                  <StatusPill status={statusLabel(row.status)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#1F8955]">{actions(row)}</div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pager page={page} totalPages={data?.totalPages ?? 0} onPage={setPage} />

      {details && (
        <Modal title={`Invoice ${details.invoiceNo}`} onClose={() => setDetails(undefined)}>
          <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 text-[13px]">
            <Detail label="Receipt">{details.receiptNo}</Detail>
            <Detail label="Depositor">{details.depositorName}</Detail>
            <Detail label="Warehouse">
              {details.warehouseName}, {details.warehouseLocation}
            </Detail>
            <Detail label="Storage period">
              {toUiDate(details.periodFrom)} – {toUiDate(details.periodTo)} ({details.storageDays} days)
            </Detail>
            <Detail label="Amount">{money(details.amount, details.currency)}</Detail>
            <Detail label="Status">{statusLabel(details.status)}</Detail>
            <Detail label="Due date">{toUiDate(details.dueDate)}</Detail>
            <Detail label="Paid at">{details.paidAt ? new Date(details.paidAt).toLocaleString('en-IN') : '-'}</Detail>
            <Detail label="Payment ref">{details.paymentRef ?? '-'}</Detail>
            <Detail label="Ledger hash">
              <code title={details.ledgerHash ?? undefined}>{shortHash(details.ledgerHash)}</code>
            </Detail>
          </dl>
          <h3 className="mt-5 mb-2 text-[15px] font-semibold">Ledger history</h3>
          <LedgerTimeline load={() => api.ledger.entity('INVOICE', details.id)} />
        </Modal>
      )}
    </RequestLayout>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[#667085]">{label}</dt>
      <dd className="font-medium text-[#1E1E1E]">{children}</dd>
    </>
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
