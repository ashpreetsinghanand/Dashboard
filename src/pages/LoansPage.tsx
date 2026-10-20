import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { Loan, LoanStatus } from '../api/types'
import { RequestLayout, StatusPill } from '../components/RequestLayout'
import { DetailGrid, NumberField, Pager } from '../components/trade/shared'
import { num, primaryBtn, secondaryBtn } from '../components/trade/styles'
import { ErrorBanner, LedgerTimeline, Modal } from '../components/ui'
import { money, mt, statusLabel, toUiDate } from '../lib/format'
import { useAction, useApi } from '../lib/useApi'

const statusChips: Record<string, LoanStatus | undefined> = { 'All Loans': undefined, Active: 'ACTIVE', Closed: 'CLOSED' }
const cols = 'grid-cols-[140px_130px_120px_120px_70px_95px_85px_105px]'

export function LoansPage() {
  const [chip, setChip] = useState('All Loans')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState<{ kind: 'details' | 'repay'; loan: Loan }>()
  const { data, loading, error, reload } = useApi(() => api.loans.mine({ status: statusChips[chip], page }), [chip, page])
  const close = () => setModal(undefined)

  return (
    <RequestLayout
      section="trade"
      tradePage="My Loans"
      crumb="My Loans"
      title="My Loans"
      subtitle="Loans taken against your eNWRs. Repay to release the pledged receipt."
      toolbar={
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(statusChips).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setChip(item)
                  setPage(0)
                }}
                className={`h-[30px] rounded-full border px-3 text-[13px] ${
                  chip === item ? 'border-[#1F8955] bg-[#E7F6EE] font-medium text-[#1F8955]' : 'border-[#E6E8EC] bg-white text-[#344054]'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <Link to="/trade/enwr" className="text-[13px] font-medium text-[#1F8955]">
            Apply for a loan from My eNWR →
          </Link>
        </div>
      }
    >
      <div className={`grid h-[50px] ${cols} items-center bg-white pl-[15px] text-[12px] text-[#98A2B3]`}>
        <span>Loan</span>
        <span>Commodity</span>
        <span>Principal</span>
        <span>Outstanding</span>
        <span>Interest</span>
        <span>Sanctioned</span>
        <span>Status</span>
        <span>Actions</span>
      </div>
      {error ? (
        <div className="mt-2">
          <ErrorBanner error={error} onRetry={reload} />
        </div>
      ) : loading && !data ? (
        <Note>Loading loans…</Note>
      ) : !data?.items.length ? (
        <Note>{chip === 'All Loans' ? 'No loans yet. Apply for one from My eNWR.' : 'No loans match these filters.'}</Note>
      ) : (
        <div className={loading ? 'opacity-60' : ''}>
          {data.items.map((loan) => (
            <div key={loan.id} className={`mt-2 grid h-[70px] ${cols} items-center rounded-[12px] bg-white pl-[15px] text-[13px]`}>
              <span className="leading-[15px]">
                <span className="block font-medium">{loan.code}</span>
                <span className="mt-0.5 inline-block rounded-[4px] bg-[#F2F4F7] px-1 text-[10px] leading-4 text-[#98A2B3]">{loan.receiptNo}</span>
              </span>
              <span className="leading-[15px]">
                {loan.commodity}
                <span className="block text-[11px] text-[#98A2B3]">{mt(loan.quantityMt)}</span>
              </span>
              <span>{money(loan.principal, loan.currency)}</span>
              <span className="font-semibold">{money(loan.outstanding, loan.currency)}</span>
              <span>{loan.interestRatePct}%</span>
              <span>{toUiDate(loan.sanctionedAt)}</span>
              <StatusPill status={statusLabel(loan.status)} className="justify-self-start" />
              <span className="grid justify-items-start gap-1 text-[12px] leading-4 font-medium whitespace-nowrap text-[#1F8955]">
                <button type="button" onClick={() => setModal({ kind: 'details', loan })}>
                  View Details
                </button>
                {loan.status === 'ACTIVE' ? (
                  <button type="button" onClick={() => setModal({ kind: 'repay', loan })}>
                    Repay
                  </button>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      )}
      <Pager page={page} totalPages={data?.totalPages ?? 0} onPage={setPage} />

      {modal?.kind === 'details' ? <LoanDetailsModal loan={modal.loan} onClose={close} /> : null}
      {modal?.kind === 'repay' ? <RepayModal loan={modal.loan} onClose={close} onDone={reload} /> : null}
    </RequestLayout>
  )
}

function Note({ children }: { children: string }) {
  return <p className="mt-2 rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">{children}</p>
}

function LoanDetailsModal({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  return (
    <Modal title={`${loan.code} · ${loan.commodity}`} onClose={onClose} width="w-[620px]">
      <DetailGrid
        rows={[
          ['Status', <StatusPill key="s" status={statusLabel(loan.status)} />],
          ['Pledged receipt', loan.receiptNo],
          ['Quantity', mt(loan.quantityMt)],
          ['Interest rate', `${loan.interestRatePct}% p.a.`],
          ['Principal', money(loan.principal, loan.currency)],
          ['Outstanding', money(loan.outstanding, loan.currency)],
          ['Sanctioned on', toUiDate(loan.sanctionedAt)],
          ['Closed on', toUiDate(loan.closedAt)],
        ]}
      />
      <h3 className="mt-5 mb-2 text-[14px] font-semibold text-[#101828]">Ledger history</h3>
      <LedgerTimeline load={() => api.ledger.entity('LOAN', loan.id)} />
    </Modal>
  )
}

function RepayModal({ loan, onClose, onDone }: { loan: Loan; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(loan.outstanding))
  const [formError, setFormError] = useState<string>()
  const [result, setResult] = useState<Loan>()
  const repay = useAction(api.loans.repay)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = num(amount)
    if (!(value > 0 && value <= loan.outstanding)) return setFormError(`Enter an amount up to ${money(loan.outstanding, loan.currency)}`)
    setFormError(undefined)
    const updated = await repay.run(loan.id, value)
    onDone() // reload either way: INVALID_STATE means the loan changed elsewhere
    if (updated) setResult(updated)
  }

  if (result) {
    return (
      <Modal title="Repayment recorded" onClose={onClose}>
        <p className="text-[14px] text-[#344054]">
          {result.status === 'CLOSED'
            ? `${result.code} is fully repaid and closed; ${result.receiptNo} is released from the pledge.`
            : `${result.code}: ${money(result.outstanding, result.currency)} still outstanding.`}
        </p>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className={primaryBtn}>
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={`Repay ${loan.code}`} onClose={onClose}>
      <p className="text-[13px] text-[#667085]">
        Outstanding {money(loan.outstanding, loan.currency)} on {loan.receiptNo} ({loan.commodity})
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3">
        <NumberField label="Amount (INR)" value={amount} onChange={setAmount} error={formError ?? repay.error?.fieldMessage('amount')} />
        <ErrorBanner error={repay.error} />
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Cancel
          </button>
          <button type="submit" disabled={repay.busy} className={primaryBtn}>
            {repay.busy ? 'Please wait…' : 'Repay'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
