import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../api/endpoints'
import type { Bid, Listing } from '../../api/types'
import { money, mt, perMt, statusLabel, toUiDate } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'
import { StatusPill } from '../RequestLayout'
import { ErrorBanner, Modal } from '../ui'
import { DetailGrid, NumberField } from './shared'
import { num, primaryBtn, secondaryBtn } from './styles'

/** Marketplace "View Details": the public lot view. */
export function LotDetailsModal({ id, onClose, onBuy }: { id: number; onClose: () => void; onBuy: (lot: Listing) => void }) {
  const { data: lot, loading, error, reload } = useApi(() => api.marketplace.lot(id), [id])
  return (
    <Modal title={lot ? `${lot.commodity} · ${lot.grade}` : 'Lot details'} onClose={onClose}>
      {loading && !lot ? <p className="text-[14px] text-[#667085]">Loading…</p> : null}
      <ErrorBanner error={error} onRetry={reload} />
      {lot ? (
        <>
          <img src={lot.imageUrl} alt="" className="h-[140px] w-full rounded-[10px] object-cover" />
          <div className="mt-4">
            <DetailGrid
              rows={[
                ['Listing', lot.code],
                ['Status', <StatusPill key="s" status={statusLabel(lot.status)} />],
                ['Asking price', perMt(lot.askingPricePerMt)],
                ['Best bid', lot.bestBidPerMt === null ? 'No bids yet' : perMt(lot.bestBidPerMt)],
                ['Available', `${mt(lot.quantityMt)} of ${mt(lot.originalQuantityMt)}`],
                ['Min. order', mt(lot.minQuantityMt)],
                ['Warehouse', `${lot.warehouseName}${lot.warehouseVerified ? ' ✓' : ''}`],
                ['Region', lot.region],
                ['Seller', lot.sellerName],
                ['Offers', lot.offers],
                ['Listing valid until', toUiDate(lot.validUntil)],
                ['Receipt valid till', `${toUiDate(lot.validTill)} (${lot.receiptDaysRemaining} days)`],
              ]}
            />
          </div>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={() => onBuy(lot)} className={primaryBtn}>
              Buy / Request Quote
            </button>
          </div>
        </>
      ) : null}
    </Modal>
  )
}

/** Shown to visitors and non-merchant accounts: only merchants can bid. */
export function BuyerOnlyModal({ signedIn, onClose }: { signedIn: boolean; onClose: () => void }) {
  return (
    <Modal title="Sign in as a buyer" onClose={onClose}>
      <p className="text-[14px] text-[#344054]">
        {signedIn
          ? 'Only merchant (buyer) accounts can place bids. Sign in with a merchant account to buy this lot.'
          : 'Sign in with a merchant (buyer) account to place a bid on this lot.'}
      </p>
      <div className="mt-5 flex justify-end">
        <Link to="/login" className={`${primaryBtn} grid place-items-center`}>
          Sign in as a buyer
        </Link>
      </div>
    </Modal>
  )
}

/** Merchant bid on a lot: quantity between the lot's minimum and what is left, price per MT. */
export function BidModal({ lot, onClose, onPlaced }: { lot: Listing; onClose: () => void; onPlaced: () => void }) {
  const minQty = Math.min(lot.minQuantityMt, lot.quantityMt)
  const [qty, setQty] = useState(String(minQty))
  const [price, setPrice] = useState(String(lot.askingPricePerMt))
  const [formError, setFormError] = useState<{ qty?: string; price?: string }>({})
  const [placed, setPlaced] = useState<Bid>()
  const place = useAction(api.listings.placeBid)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const quantityMt = num(qty)
    const pricePerMt = num(price)
    const errors = {
      qty: quantityMt >= minQty && quantityMt <= lot.quantityMt ? undefined : `Enter between ${mt(minQty)} and ${mt(lot.quantityMt)}`,
      price: pricePerMt > 0 ? undefined : 'Enter a price above 0',
    }
    setFormError(errors)
    if (errors.qty || errors.price) return
    const bid = await place.run(lot.id, { quantityMt, pricePerMt })
    if (bid) {
      setPlaced(bid)
      onPlaced()
    }
  }

  if (placed) {
    return (
      <Modal title="Bid placed" onClose={onClose}>
        <p className="text-[14px] text-[#344054]">
          {placed.code}: {mt(placed.quantityMt)} of {placed.commodity} at {perMt(placed.pricePerMt)} ({money(placed.totalValue)}). The seller
          will accept or reject it; follow it under <Link to="/trade/bid" className="font-medium text-[#1F8955]">My Bid</Link>.
        </p>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className={primaryBtn}>
            Done
          </button>
        </div>
      </Modal>
    )
  }

  const conflict = place.error?.error.code === 'CONFLICT'
  return (
    <Modal title={`Bid on ${lot.commodity} · ${lot.grade}`} onClose={onClose}>
      <p className="text-[13px] text-[#667085]">
        {lot.code} · {lot.warehouseName}, {lot.region} · asking {perMt(lot.askingPricePerMt)}
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <NumberField
          label="Quantity (MT)"
          value={qty}
          onChange={setQty}
          hint={`Min. ${mt(minQty)}, available ${mt(lot.quantityMt)}`}
          error={formError.qty ?? place.error?.fieldMessage('quantityMt')}
        />
        <NumberField
          label="Price per MT (INR)"
          value={price}
          onChange={setPrice}
          hint={Number.isFinite(num(qty) * num(price)) ? `Total ${money(num(qty) * num(price))}` : undefined}
          error={formError.price ?? place.error?.fieldMessage('pricePerMt')}
        />
        {place.error ? (
          <div>
            <ErrorBanner error={place.error} />
            {conflict ? (
              <p className="mt-1 text-[12px] text-[#667085]">
                Withdraw your existing bid under <Link to="/trade/bid" className="text-[#1F8955]">My Bid</Link> to bid again.
              </p>
            ) : null}
          </div>
        ) : null}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Cancel
          </button>
          <button type="submit" disabled={place.busy} className={primaryBtn}>
            {place.busy ? 'Placing…' : 'Place Bid'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
