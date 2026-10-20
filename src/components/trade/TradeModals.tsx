import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/endpoints'
import type { Bid, Enwr, Listing, Loan, Settlement } from '../../api/types'
import { money, mt, perMt, shortHash, statusLabel, toUiDate } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'
import { StatusPill } from '../RequestLayout'
import { ErrorBanner, LedgerTimeline, Modal } from '../ui'
import { DetailGrid, NumberField } from './shared'
import { num, primaryBtn, secondaryBtn } from './styles'

const pill = (status: Parameters<typeof statusLabel>[0]) => <StatusPill key="status" status={statusLabel(status)} />

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-[14px] font-semibold text-[#101828]">{title}</h3>
      {children}
    </section>
  )
}

function FormButtons({ busy, label, onClose }: { busy: boolean; label: string; onClose: () => void }) {
  return (
    <div className="mt-2 flex justify-end gap-2">
      <button type="button" onClick={onClose} className={secondaryBtn}>
        Cancel
      </button>
      <button type="submit" disabled={busy} className={primaryBtn}>
        {busy ? 'Please wait…' : label}
      </button>
    </div>
  )
}

function DoneModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="text-[14px] text-[#344054]">{children}</div>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className={primaryBtn}>
          Done
        </button>
      </div>
    </Modal>
  )
}

// ---------- eNWR ----------

export function EnwrDetailsModal({ enwr, onClose }: { enwr: Enwr; onClose: () => void }) {
  return (
    <Modal title={`${enwr.commodity} · ${enwr.receiptNo}`} onClose={onClose} width="w-[620px]">
      <DetailGrid
        rows={[
          ['Status', pill(enwr.status)],
          ['Grade', enwr.grade],
          ['Quantity', mt(enwr.quantityMt)],
          ['Warehouse', `${enwr.warehouseName}, ${enwr.warehouseLocation}`],
          ['Stored on', toUiDate(enwr.storedOn)],
          ['Valid till', `${toUiDate(enwr.validTill)} (${enwr.daysRemaining} days)`],
          ['Market price', enwr.marketPricePerMt === null ? '-' : perMt(enwr.marketPricePerMt)],
          ['Estimated value', money(enwr.estimatedValue)],
        ]}
      />
      <Section title="Quality">
        <DetailGrid
          rows={[
            ['Moisture', enwr.moisturePct === null ? '-' : `${enwr.moisturePct}%`],
            ['Foreign matter', enwr.foreignMatterPct === null ? '-' : `${enwr.foreignMatterPct}%`],
            ['Inspected by', enwr.inspectedBy ?? 'Awaiting audit'],
            ['Inspected on', toUiDate(enwr.inspectedAt)],
            ['Remarks', enwr.qualityRemarks ?? '-'],
          ]}
        />
      </Section>
      <Section title="Ledger history">
        <LedgerTimeline load={() => api.enwrs.ledger(enwr.id)} />
      </Section>
    </Modal>
  )
}

export function LoanApplyModal({ enwr, onClose, onDone }: { enwr: Enwr; onClose: () => void; onDone: () => void }) {
  const eligibility = useApi(() => api.loans.eligibility(enwr.id), [enwr.id])
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState<string>()
  const [loan, setLoan] = useState<Loan>()
  const apply = useAction(api.loans.apply)
  const e = eligibility.data

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!e) return
    const value = num(amount || String(e.maxAmount))
    if (!(value > 0 && value <= e.maxAmount)) return setFormError(`Enter an amount up to ${money(e.maxAmount, e.currency)}`)
    setFormError(undefined)
    const result = await apply.run(enwr.id, value)
    onDone()
    if (result) setLoan(result)
  }

  if (loan) {
    return (
      <DoneModal title="Loan sanctioned" onClose={onClose}>
        {loan.code}: {money(loan.principal, loan.currency)} at {loan.interestRatePct}% against {loan.receiptNo}. The receipt is now pledged;
        repay it from <Link to="/trade/loans" className="font-medium text-[#1F8955]">My Loans</Link>.
      </DoneModal>
    )
  }

  return (
    <Modal title={`Apply for loan · ${enwr.receiptNo}`} onClose={onClose}>
      {eligibility.loading && !e ? <p className="text-[14px] text-[#667085]">Checking eligibility…</p> : null}
      <ErrorBanner error={eligibility.error} onRetry={eligibility.reload} />
      {e ? (
        <>
          <DetailGrid
            rows={[
              ['Market value', money(e.marketValue, e.currency)],
              ['Loan to value', `${Math.round(e.loanToValue * 100)}%`],
              ['Maximum loan', money(e.maxAmount, e.currency)],
              ['Interest rate', `${e.interestRatePct}% p.a.`],
            ]}
          />
          {e.eligible ? (
            <form onSubmit={submit} className="mt-4 grid gap-3">
              <NumberField
                label="Loan amount (INR)"
                value={amount || String(e.maxAmount)}
                onChange={setAmount}
                error={formError ?? apply.error?.fieldMessage('amount')}
              />
              <ErrorBanner error={apply.error} />
              <FormButtons busy={apply.busy} label="Apply For Loan" onClose={onClose} />
            </form>
          ) : (
            <p className="mt-4 rounded-[10px] bg-[#FFF6DE] px-3 py-2 text-[13px] text-[#B54708]">{e.reason ?? 'This receipt is not eligible for a loan.'}</p>
          )}
        </>
      ) : null}
    </Modal>
  )
}

/** Shared by "List On Market" (create) and "Edit Listing" (update). */
function ListingForm({
  title,
  submitLabel,
  maxQty,
  initial,
  onSave,
  onClose,
  onDone,
}: {
  title: string
  submitLabel: string
  maxQty: number
  initial: { price: string; min: string; days: string }
  onSave: (body: { askingPricePerMt: number; minQuantityMt?: number; validDays?: number }) => Promise<Listing>
  onClose: () => void
  onDone: () => void
}) {
  const [price, setPrice] = useState(initial.price)
  const [min, setMin] = useState(initial.min)
  const [days, setDays] = useState(initial.days)
  const [formError, setFormError] = useState<{ price?: string; min?: string; days?: string }>({})
  const save = useAction(onSave)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const askingPricePerMt = num(price)
    const minQuantityMt = min.trim() ? num(min) : undefined
    const validDays = days.trim() ? num(days) : undefined
    const errors = {
      price: askingPricePerMt > 0 ? undefined : 'Enter a price above 0',
      min: minQuantityMt === undefined || (minQuantityMt > 0 && minQuantityMt <= maxQty) ? undefined : `Enter up to ${mt(maxQty)}`,
      days: validDays === undefined || (Number.isInteger(validDays) && validDays > 0) ? undefined : 'Enter whole days above 0',
    }
    setFormError(errors)
    if (errors.price || errors.min || errors.days) return
    const listing = await save.run({ askingPricePerMt, minQuantityMt, validDays })
    onDone()
    if (listing) onClose()
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-3">
        <NumberField label="Asking price per MT (INR)" value={price} onChange={setPrice} error={formError.price ?? save.error?.fieldMessage('askingPricePerMt')} />
        <NumberField
          label="Minimum order (MT)"
          value={min}
          onChange={setMin}
          hint={`Up to ${mt(maxQty)}`}
          error={formError.min ?? save.error?.fieldMessage('minQuantityMt')}
        />
        <NumberField label="Valid for (days)" value={days} onChange={setDays} error={formError.days ?? save.error?.fieldMessage('validDays')} />
        <ErrorBanner error={save.error} />
        <FormButtons busy={save.busy} label={submitLabel} onClose={onClose} />
      </form>
    </Modal>
  )
}

export function ListOnMarketModal({ enwr, onClose, onDone }: { enwr: Enwr; onClose: () => void; onDone: () => void }) {
  return (
    <ListingForm
      title={`List ${enwr.commodity} · ${enwr.receiptNo}`}
      submitLabel="List On Market"
      maxQty={enwr.quantityMt}
      initial={{ price: enwr.marketPricePerMt === null ? '' : String(enwr.marketPricePerMt), min: '', days: '30' }}
      onSave={(body) => api.listings.create({ enwrId: enwr.id, ...body })}
      onClose={onClose}
      onDone={onDone}
    />
  )
}

// ---------- listings ----------

export function EditListingModal({ listing, onClose, onDone }: { listing: Listing; onClose: () => void; onDone: () => void }) {
  return (
    <ListingForm
      title={`Edit ${listing.code}`}
      submitLabel="Save Changes"
      maxQty={listing.quantityMt}
      initial={{ price: String(listing.askingPricePerMt), min: String(listing.minQuantityMt), days: '' }}
      onSave={(body) => api.listings.update(listing.id, body)}
      onClose={onClose}
      onDone={onDone}
    />
  )
}

export function ListingDetailsModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: l, loading, error, reload } = useApi(() => api.listings.get(id), [id])
  return (
    <Modal title={l ? `${l.commodity} · ${l.code}` : 'Listing'} onClose={onClose} width="w-[620px]">
      {loading && !l ? <p className="text-[14px] text-[#667085]">Loading…</p> : null}
      <ErrorBanner error={error} onRetry={reload} />
      {l ? (
        <>
          <DetailGrid
            rows={[
              ['Status', pill(l.status)],
              ['Receipt', l.receiptNo],
              ['Asking price', perMt(l.askingPricePerMt)],
              ['Best bid', l.bestBidPerMt === null ? 'No bids yet' : perMt(l.bestBidPerMt)],
              ['Quantity left', `${mt(l.quantityMt)} of ${mt(l.originalQuantityMt)}`],
              ['Min. order', mt(l.minQuantityMt)],
              ['Asking value', money(l.totalValue)],
              ['Offers', l.offers],
              ['Warehouse', `${l.warehouseName}, ${l.region}`],
              ['Listing valid until', toUiDate(l.validUntil)],
            ]}
          />
          <Section title="Ledger history">
            <LedgerTimeline load={() => api.listings.ledger(id)} />
          </Section>
        </>
      ) : null}
    </Modal>
  )
}

/** "View Offer": every bid on a listing; the seller accepts or rejects the active ones. */
export function OffersModal({ listing, onClose, onDone }: { listing: Listing; onClose: () => void; onDone: () => void }) {
  const bids = useApi(() => api.listings.bids(listing.id), [listing.id])
  const [confirming, setConfirming] = useState<Bid>()
  const [settled, setSettled] = useState<Settlement>()
  const accept = useAction(api.bids.accept)
  const reject = useAction(api.bids.reject)
  const busy = accept.busy || reject.busy

  async function decide(bid: Bid, ok: boolean) {
    const result = ok ? await accept.run(bid.id) : await reject.run(bid.id)
    setConfirming(undefined)
    bids.reload()
    onDone()
    if (ok && result) setSettled(result as Settlement)
  }

  if (settled) {
    const { trade } = settled
    return (
      <DoneModal title="Trade settled" onClose={onClose}>
        <p>
          {trade.code}: {mt(trade.quantityMt)} of {trade.commodity} sold to {trade.buyerName} at {perMt(trade.pricePerMt)} for{' '}
          <strong>{money(trade.totalValue)}</strong>.
        </p>
        <p className="mt-2">
          Recorded on ledger <code title={trade.ledgerHash ?? ''}>⛓ {shortHash(trade.ledgerHash)}</code>. {mt(settled.listing.quantityMt)} left on{' '}
          {settled.listing.code}.
        </p>
      </DoneModal>
    )
  }

  return (
    <Modal title={`Offers on ${listing.code}`} onClose={onClose} width="w-[640px]">
      <p className="text-[13px] text-[#667085]">
        {listing.commodity} · {listing.grade} · asking {perMt(listing.askingPricePerMt)} · {mt(listing.quantityMt)} left
      </p>
      <div className="mt-3 grid gap-2">
        <ErrorBanner error={bids.error ?? accept.error ?? reject.error} onRetry={bids.error ? bids.reload : undefined} />
        {bids.loading && !bids.data ? <p className="text-[14px] text-[#667085]">Loading offers…</p> : null}
        {bids.data?.length === 0 ? <p className="text-[14px] text-[#667085]">No offers yet.</p> : null}
        {bids.data?.map((bid) => (
          <div key={bid.id} className="rounded-[10px] border border-[#E6E8EC] px-3 py-2 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <span>
                <span className="font-semibold text-[#101828]">{bid.buyerName}</span> · {bid.code}
                <span className="block text-[#667085]">
                  {mt(bid.quantityMt)} at {perMt(bid.pricePerMt)} = {money(bid.totalValue)} · {toUiDate(bid.createdAt)}
                </span>
              </span>
              {bid.status === 'ACTIVE' ? (
                <span className="flex shrink-0 gap-2">
                  <button type="button" disabled={busy} onClick={() => setConfirming(bid)} className={`${primaryBtn} h-8 px-3 text-[13px]`}>
                    Accept
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide(bid, false)} className={`${secondaryBtn} h-8 px-3 text-[13px]`}>
                    Reject
                  </button>
                </span>
              ) : (
                <StatusPill status={statusLabel(bid.status)} />
              )}
            </div>
            {confirming?.id === bid.id ? (
              <div className="mt-2 flex items-center justify-between gap-3 rounded-[8px] bg-[#E7F6EE] px-3 py-2">
                <span>
                  Sell {mt(bid.quantityMt)} to {bid.buyerName} for {money(bid.totalValue)}? This settles the trade.
                </span>
                <span className="flex shrink-0 gap-2">
                  <button type="button" disabled={busy} onClick={() => setConfirming(undefined)} className={`${secondaryBtn} h-8 px-3 text-[13px]`}>
                    Cancel
                  </button>
                  <button type="button" disabled={busy} onClick={() => decide(bid, true)} className={`${primaryBtn} h-8 px-3 text-[13px]`}>
                    {accept.busy ? 'Settling…' : 'Confirm'}
                  </button>
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ---------- bids & trades ----------

export function BidDetailsModal({ id, onClose }: { id: number; onClose: () => void }) {
  const { data: b, loading, error, reload } = useApi(() => api.bids.get(id), [id])
  return (
    <Modal title={b ? `${b.commodity} · ${b.code}` : 'Bid'} onClose={onClose} width="w-[620px]">
      {loading && !b ? <p className="text-[14px] text-[#667085]">Loading…</p> : null}
      <ErrorBanner error={error} onRetry={reload} />
      {b ? (
        <>
          <DetailGrid
            rows={[
              ['Status', pill(b.status)],
              ['Listing', b.listingCode],
              ['Receipt', b.receiptNo],
              ['Warehouse', b.warehouseName],
              ['Quantity', mt(b.quantityMt)],
              ['Bid price', perMt(b.pricePerMt)],
              ['Total value', money(b.totalValue)],
              ['Placed on', toUiDate(b.createdAt)],
              ['Decided on', toUiDate(b.decidedAt)],
              ['Trade', b.tradeId ? <Link key="t" to="/trade/history" className="text-[#1F8955]">View in Trade History</Link> : '-'],
            ]}
          />
          <Section title="Ledger history">
            <LedgerTimeline load={() => api.ledger.entity('BID', id)} />
          </Section>
        </>
      ) : null}
    </Modal>
  )
}

export function TradeLedgerModal({ id, code, onClose }: { id: number; code: string; onClose: () => void }) {
  return (
    <Modal title={`Ledger · ${code}`} onClose={onClose} width="w-[620px]">
      <LedgerTimeline load={() => api.trades.ledger(id)} />
    </Modal>
  )
}
