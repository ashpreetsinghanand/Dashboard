import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { Booking, BookingStatus, DepositRequest, DepositResult } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { RequestLayout, StatusPill } from '../components/RequestLayout'
import { Pager } from '../components/store/Pager'
import { ErrorBanner, FieldError, LedgerTimeline, Modal } from '../components/ui'
import { qtl, statusLabel, toUiDate } from '../lib/format'
import { useAction, useApi } from '../lib/useApi'

const statuses = ['All Status', 'Pending', 'Accepted', 'Rejected', 'Cancelled', 'Stored']
const statusParam: Record<string, BookingStatus> = {
  Pending: 'PENDING',
  Accepted: 'ACCEPTED',
  Rejected: 'REJECTED',
  Cancelled: 'CANCELLED',
  Stored: 'DEPOSITED',
}
const bookingCols = 'grid-cols-[140fr_138fr_123fr_155fr_123fr_111fr_75fr]'

type Dialog =
  | { kind: 'accept' | 'reject'; booking: Booking }
  | { kind: 'deposit'; booking: Booking }
  | { kind: 'ledger'; booking: Booking }

export function BookingRequestPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('')
  const [status, setStatus] = useState(statuses[0])
  const [commodity, setCommodity] = useState('All Commodities')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(0)
  const [more, setMore] = useState(false)
  const [menu, setMenu] = useState<number>()
  const [dialog, setDialog] = useState<Dialog>()
  const [notice, setNotice] = useState<string>()

  const reference = useApi(() => api.reference.commodities(), [])
  const commodities = ['All Commodities', ...(reference.data?.map((item) => item.name) ?? [])]
  const { data, loading, error, reload } = useApi(
    () =>
      api.bookings.search({
        q: applied.trim() || undefined,
        status: statusParam[status],
        commodity: commodity === 'All Commodities' ? undefined : commodity,
        date: date || undefined,
        page,
      }),
    [applied, status, commodity, date, page],
  )
  const rows = data?.items ?? []
  /** Every action reloads afterwards, success or not: INVALID_STATE usually means someone else changed the record. */
  async function withReload<R>(call: () => Promise<R>): Promise<R> {
    try {
      return await call()
    } finally {
      reload()
    }
  }
  const cancelAction = useAction((id: number) => withReload(() => api.bookings.cancel(id)))

  const filter = (set: (value: string) => void) => (value: string) => {
    set(value)
    setPage(0)
  }

  async function cancel(booking: Booking) {
    if (!window.confirm(`Cancel the ${booking.commodity} booking at ${booking.warehouseName}?`)) return
    setNotice(undefined)
    if (await cancelAction.run(booking.id)) setNotice(`Booking ${booking.code} cancelled.`)
  }

  function menuItems(booking: Booking): { label: string; onSelect: () => void }[] {
    if (!user) return []
    const depositor = user.id === booking.depositorId
    const owner = user.role === 'WAREHOUSE_OWNER'
    const items: { label: string; onSelect: () => void }[] = []
    if (depositor && (booking.status === 'PENDING' || booking.status === 'ACCEPTED')) {
      items.push({ label: 'Cancel', onSelect: () => void cancel(booking) })
    }
    if (owner && booking.status === 'PENDING') items.push({ label: 'Accept', onSelect: () => setDialog({ kind: 'accept', booking }) })
    if (owner && booking.status === 'ACCEPTED') items.push({ label: 'Record arrival', onSelect: () => setDialog({ kind: 'deposit', booking }) })
    if (owner && (booking.status === 'PENDING' || booking.status === 'ACCEPTED')) {
      items.push({ label: 'Reject', onSelect: () => setDialog({ kind: 'reject', booking }) })
    }
    if (booking.status === 'DEPOSITED' && user.role !== 'AUDITOR') {
      items.push({ label: 'View receipt', onSelect: () => navigate(owner ? '/owner/receipts' : '/trade/enwr') })
    }
    items.push({ label: 'Ledger history', onSelect: () => setDialog({ kind: 'ledger', booking }) })
    return items
  }

  function closeDialog() {
    setDialog(undefined)
  }

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
          setPage(0)
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
        <MiniSelect label="Status" value={status} options={statuses} onChange={filter(setStatus)} />
        <MiniSelect label="Commodity" value={commodity} options={commodities} onChange={filter(setCommodity)} />
        <label className="relative block h-[30px] w-[150px] shrink-0">
          <input
            type="date"
            aria-label="Requested on"
            value={date}
            onChange={(event) => filter(setDate)(event.target.value)}
            className={`h-full w-full rounded-[8px] border border-[#E6E8EC] bg-white px-2.5 text-[13px] outline-none ${date ? '' : 'text-[#98A2B3]'}`}
          />
        </label>
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
      {cancelAction.error ? (
        <div className="mt-3">
          <ErrorBanner error={cancelAction.error} />
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
      ) : null}
      <div className="mt-3 rounded-[12px] bg-white">
        <div className={`grid h-[50px] ${bookingCols} items-center pl-[15px] text-[13px] text-[#667085]`}>
          <span>Commodity</span>
          <span>Warehouse</span>
          <span>Location</span>
          <span>Requested On</span>
          <span>Quantity</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {loading && !data ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">Loading booking requests…</p>
        ) : rows.length === 0 ? (
          error ? null : <p className="px-4 py-8 text-center text-[14px] text-[#667085]">No booking requests match these filters.</p>
        ) : (
          rows.map((row) => {
            const items = menuItems(row)
            return (
              <div
                key={row.id}
                className={`grid min-h-[70px] ${bookingCols} items-center border-t border-[#F2F4F7] py-2 pl-[15px] text-[13px] ${loading ? 'opacity-60' : ''}`}
              >
                <span className="flex items-center gap-2">
                  <img src={row.imageUrl} alt="" className="size-10 shrink-0 rounded-[8px] object-cover" />
                  <span>
                    <span className="block font-medium">{row.commodity}</span>
                    <span className="text-[11px] text-[#98A2B3]">{row.grade}</span>
                  </span>
                </span>
                <span className="pr-2 leading-[15px]">{row.warehouseName}</span>
                <span>{row.warehouseLocation}</span>
                <span>{toUiDate(row.createdAt)}</span>
                <span>{qtl(row.quantityQtl)}</span>
                <span className="grid justify-items-start gap-1">
                  <StatusPill status={statusLabel(row.status)} className="w-[100px]" />
                  {row.decisionNote ? (
                    <span title={row.decisionNote} className="line-clamp-2 pr-2 text-[11px] leading-[13px] text-[#667085]">
                      {row.decisionNote}
                    </span>
                  ) : null}
                </span>
                <span className="relative">
                  <button
                    type="button"
                    aria-label={`Actions for ${row.commodity}`}
                    aria-haspopup="menu"
                    aria-expanded={menu === row.id}
                    disabled={cancelAction.busy}
                    onClick={() => setMenu((open) => (open === row.id ? undefined : row.id))}
                    className="grid size-6 place-items-center text-[#667085] disabled:opacity-40"
                  >
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                      <circle cx="12" cy="6" r="1.4" fill="currentColor" />
                      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                      <circle cx="12" cy="18" r="1.4" fill="currentColor" />
                    </svg>
                  </button>
                  {menu === row.id && (
                    <>
                      <button type="button" aria-label="Close menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenu(undefined)} />
                      <span role="menu" className="absolute top-7 right-2 z-20 grid w-[160px] rounded-[10px] border border-[#E6E8EC] bg-white py-1 shadow-[0_12px_30px_rgba(16,24,40,0.12)]">
                        {items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMenu(undefined)
                              setNotice(undefined)
                              item.onSelect()
                            }}
                            className={`px-3 py-2 text-left text-[13px] hover:bg-[#F9FAFB] ${
                              item.label === 'Cancel' || item.label === 'Reject' ? 'text-[#D92D20]' : 'text-[#344054]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </span>
                    </>
                  )}
                </span>
              </div>
            )
          })
        )}
      </div>
      <Pager page={page} totalPages={data?.totalPages ?? 0} onPage={setPage} />

      {(dialog?.kind === 'accept' || dialog?.kind === 'reject') && (
        <DecisionModal
          kind={dialog.kind}
          booking={dialog.booking}
          onClose={closeDialog}
          submit={(note) => {
            const id = dialog.booking.id
            return withReload(() => (dialog.kind === 'accept' ? api.bookings.accept(id, note) : api.bookings.reject(id, note)))
          }}
          onDone={() => {
            setNotice(`Booking ${dialog.booking.code} ${dialog.kind === 'accept' ? 'accepted' : 'rejected'}.`)
            closeDialog()
          }}
        />
      )}
      {dialog?.kind === 'deposit' && (
        <DepositModal
          booking={dialog.booking}
          onClose={closeDialog}
          submit={(body) => withReload(() => api.bookings.deposit(dialog.booking.id, body))}
          onDone={({ receipt, invoice }) => {
            setNotice(`Arrival recorded: receipt ${receipt.receiptNo} is awaiting audit, invoice ${invoice.invoiceNo} issued.`)
            closeDialog()
          }}
        />
      )}
      {dialog?.kind === 'ledger' && (
        <Modal title={`Ledger history · ${dialog.booking.code}`} onClose={closeDialog}>
          <LedgerTimeline load={() => api.bookings.ledger(dialog.booking.id)} />
        </Modal>
      )}
    </RequestLayout>
  )
}

function DecisionModal({
  kind,
  booking,
  onClose,
  submit,
  onDone,
}: {
  kind: 'accept' | 'reject'
  booking: Booking
  onClose: () => void
  submit: (note: string | undefined) => Promise<Booking>
  onDone: () => void
}) {
  const { run, busy, error } = useAction(submit)
  const [note, setNote] = useState('')
  const verb = kind === 'accept' ? 'Accept' : 'Reject'
  return (
    <Modal title={`${verb} booking`} onClose={onClose} width="w-[420px]">
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          void run(note.trim() || undefined).then((done) => done && onDone())
        }}
      >
        <p className="text-[14px] text-[#667085]">
          {booking.depositorName} · {booking.commodity} · {qtl(booking.quantityQtl)} at {booking.warehouseName}
        </p>
        <label className="mt-4 block text-[14px] leading-[19px]" htmlFor="decision-note">
          Note to depositor (optional)
        </label>
        <textarea
          id="decision-note"
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
          placeholder={kind === 'accept' ? 'E.g. Bring produce between 9 am and 5 pm' : 'E.g. Chamber under maintenance this month'}
          className="mt-2.5 h-24 w-full rounded-[8px] border border-[#E6E8EC] px-2.5 py-2 text-[14px] outline-none placeholder:text-[#98A2B3]"
        />
        <FieldError message={error?.fieldMessage('note') ?? error?.message} />
        <button
          type="submit"
          disabled={busy}
          className={`mt-4 h-12 w-full rounded-[8px] text-[16px] font-semibold text-white disabled:opacity-60 ${
            kind === 'accept' ? 'bg-[#1F8955]' : 'bg-[#D92D20]'
          }`}
        >
          {busy ? 'Saving…' : verb}
        </button>
      </form>
    </Modal>
  )
}

function DepositModal({
  booking,
  onClose,
  submit,
  onDone,
}: {
  booking: Booking
  onClose: () => void
  submit: (body: DepositRequest) => Promise<DepositResult>
  onDone: (result: DepositResult) => void
}) {
  const { run, busy, error } = useAction(submit)
  const [weight, setWeight] = useState(String(booking.quantityMt))
  const [grade, setGrade] = useState(booking.grade)
  const [moisture, setMoisture] = useState('')
  const [formError, setFormError] = useState<string>()
  const input = 'mt-2.5 h-12 w-full rounded-[8px] border border-[#E6E8EC] px-2.5 text-[14px] outline-none placeholder:text-[#98A2B3]'
  const fieldError = (field: string) => error?.fieldMessage(field)

  return (
    <Modal title="Record arrival" onClose={onClose} width="w-[420px]">
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault()
          setFormError(undefined)
          const netWeightMt = Number(weight)
          const moisturePct = moisture.trim() ? Number(moisture) : undefined
          if (!(netWeightMt > 0)) return setFormError('Net weight must be a number above 0')
          if (moisturePct !== undefined && !(moisturePct >= 0 && moisturePct <= 100)) return setFormError('Moisture must be between 0 and 100')
          if (!grade.trim()) return setFormError('Grade is required')
          void run({ netWeightMt, grade: grade.trim(), moisturePct }).then((result) => result && onDone(result))
        }}
      >
        <p className="text-[14px] text-[#667085]">
          {booking.code} · {booking.commodity} · booked {qtl(booking.quantityQtl)} by {booking.depositorName}
        </p>
        <label className="mt-4 block text-[14px] leading-[19px]" htmlFor="arrival-weight">
          Net weight (MT)*
        </label>
        <input id="arrival-weight" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} className={input} />
        <FieldError message={fieldError('netWeightMt')} />
        <label className="mt-[15px] block text-[14px] leading-[19px]" htmlFor="arrival-grade">
          Grade*
        </label>
        <input id="arrival-grade" value={grade} onChange={(event) => setGrade(event.target.value)} className={input} />
        <FieldError message={fieldError('grade')} />
        <label className="mt-[15px] block text-[14px] leading-[19px]" htmlFor="arrival-moisture">
          Moisture %
        </label>
        <input
          id="arrival-moisture"
          inputMode="decimal"
          value={moisture}
          onChange={(event) => setMoisture(event.target.value)}
          placeholder="E.g. 11.5"
          className={input}
        />
        <FieldError message={fieldError('moisturePct')} />
        <FieldError
          message={formError ?? (error && !fieldError('netWeightMt') && !fieldError('grade') && !fieldError('moisturePct') ? error.message : undefined)}
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-4 h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Record arrival'}
        </button>
      </form>
    </Modal>
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
