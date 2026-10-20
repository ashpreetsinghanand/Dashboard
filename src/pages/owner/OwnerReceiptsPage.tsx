import { useState } from 'react'
import { api } from '../../api/endpoints'
import type { Enwr } from '../../api/types'
import { RequestLayout, StatusPill } from '../../components/RequestLayout'
import { ErrorBanner, LedgerTimeline, Modal } from '../../components/ui'
import { money, mt, statusLabel, toUiDate } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'

const cols = 'grid-cols-[190px_150px_90px_150px_110px_150px]'
// The server bills only receipts still in store (InvoiceService.issueNextPeriod)
const billable = ['ACTIVE', 'LISTED', 'PLEDGED']

export function OwnerReceiptsPage() {
  const warehouses = useApi(() => api.warehouses.mine(), [])
  const [warehouseId, setWarehouseId] = useState('')
  const [page, setPage] = useState(0)
  const receipts = useApi(() => api.enwrs.search({ warehouseId: warehouseId || undefined, page }), [warehouseId, page])
  const [ledgerFor, setLedgerFor] = useState<Enwr>()
  const [notice, setNotice] = useState<string>()
  const action = useAction((fn: () => Promise<string>) => fn())

  async function perform(fn: () => Promise<string>) {
    setNotice(undefined)
    setNotice(await action.run(fn))
    receipts.reload()
  }

  const data = receipts.data
  return (
    <RequestLayout
      section="owner"
      ownerPage="Stored Receipts"
      crumb="Stored Receipts"
      title="Stored Receipts"
      subtitle="Receipts for produce stored in your warehouses. Bill the next storage period or release stock."
      toolbar={
        <div className="flex items-center gap-[15px]">
          <label className="relative block h-[30px] w-[300px] shrink-0">
            <select
              aria-label="Warehouse"
              value={warehouseId}
              onChange={(event) => {
                setWarehouseId(event.target.value)
                setPage(0)
              }}
              className="h-full w-full appearance-none rounded-[8px] border border-[#E6E8EC] bg-white px-2.5 pr-7 text-[13px] outline-none"
            >
              <option value="">All warehouses</option>
              {warehouses.data?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[10px] text-[#667085]">▾</span>
          </label>
          {data && <span className="text-[13px] text-[#667085]">{data.totalItems} receipts</span>}
        </div>
      }
    >
      <ErrorBanner error={warehouses.error} onRetry={warehouses.reload} />
      <ErrorBanner error={receipts.error} onRetry={receipts.reload} />
      <ErrorBanner error={action.error} />
      {notice && <p className="rounded-[10px] bg-[#E7F6EE] px-4 py-3 text-[14px] text-[#1F8955]">{notice}</p>}
      <div className="mt-3 overflow-hidden rounded-[12px] bg-white">
        <div className={`grid h-[50px] ${cols} items-center pl-[15px] text-[13px] text-[#667085]`}>
          <span>Commodity</span>
          <span>Warehouse</span>
          <span>Quantity</span>
          <span>Stored On / Valid Till</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {receipts.loading && !data ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">Loading receipts…</p>
        ) : data && data.items.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">No receipts are stored in {warehouseId ? 'this warehouse' : 'your warehouses'}.</p>
        ) : (
          data?.items.map((row) => (
            <div key={row.id} className={`grid min-h-[70px] ${cols} items-center border-t border-[#F2F4F7] py-2 pl-[15px] text-[13px]`}>
              <span className="flex items-center gap-2">
                <img src={row.imageUrl} alt="" className="size-10 shrink-0 rounded-[8px] object-cover" />
                <span>
                  <span className="block leading-[15px] font-medium">{row.commodity}</span>
                  <span className="block text-[11px] leading-3 text-[#98A2B3]">{row.grade}</span>
                  <span className="mt-0.5 inline-block rounded-[2px] bg-[#F2F4F7] px-1 text-[8px] leading-[10px] text-[#98A2B3]">{row.receiptNo}</span>
                </span>
              </span>
              <span className="leading-[15px]">
                {row.warehouseName}
                <span className="block text-[11px] text-[#98A2B3]">Holder: {row.ownerName}</span>
              </span>
              <span>{mt(row.quantityMt)}</span>
              <span className="leading-[15px]">
                {toUiDate(row.storedOn)}
                <span className="block text-[11px] text-[#98A2B3]">
                  till {toUiDate(row.validTill)} ({row.daysRemaining} days)
                </span>
              </span>
              <StatusPill status={statusLabel(row.status)} className="w-[100px] justify-self-start" />
              <span className="grid justify-items-start gap-1 text-[12px] font-medium text-[#1F8955]">
                {billable.includes(row.status) && (
                  <button
                    type="button"
                    disabled={action.busy}
                    className="disabled:opacity-50"
                    onClick={() =>
                      perform(async () => {
                        const inv = await api.enwrs.billNextPeriod(row.id)
                        return `Invoice ${inv.invoiceNo} issued: ${money(inv.amount, inv.currency)} for ${toUiDate(inv.periodFrom)} – ${toUiDate(inv.periodTo)}.`
                      })
                    }
                  >
                    Bill next period
                  </button>
                )}
                {row.actions.canRelease && (
                  <button
                    type="button"
                    disabled={action.busy}
                    className="text-[#B54708] disabled:opacity-50"
                    onClick={() =>
                      perform(async () => {
                        const done = await api.enwrs.release(row.id)
                        return `${done.receiptNo} released; ${mt(done.quantityMt)} of capacity is free again.`
                      })
                    }
                  >
                    Release stock
                  </button>
                )}
                <button type="button" onClick={() => setLedgerFor(row)}>
                  View ledger
                </button>
              </span>
            </div>
          ))
        )}
      </div>
      {data && data.totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-3 text-[13px]">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-[8px] border border-[#E6E8EC] bg-white px-3 py-1 disabled:opacity-50">
            Previous
          </button>
          <span className="text-[#667085]">
            Page {page + 1} of {data.totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-[8px] border border-[#E6E8EC] bg-white px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      {ledgerFor && (
        <Modal title={`Ledger · ${ledgerFor.receiptNo}`} onClose={() => setLedgerFor(undefined)}>
          <LedgerTimeline load={() => api.enwrs.ledger(ledgerFor.id)} />
        </Modal>
      )}
    </RequestLayout>
  )
}
