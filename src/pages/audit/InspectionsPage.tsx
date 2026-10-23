import { useState, type FormEvent } from 'react'
import { api } from '../../api/endpoints'
import type { Enwr, InspectionRequest } from '../../api/types'
import { hasMetaMask } from '../../chain/metamask'
import { EnwrOnChainStep } from '../../components/ChainSteps'
import { RequestLayout, StatusPill } from '../../components/RequestLayout'
import { ErrorBanner, FieldError, Modal } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { mt, statusLabel, toUiDate } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'

const cols = 'grid-cols-[200fr_170fr_100fr_110fr_130fr_110fr]'
const input = 'h-9 w-full rounded-[8px] border border-[#E6E8EC] bg-white px-2.5 text-[13px] outline-none focus:border-[#1F8955]'

export function InspectionsPage() {
  const { data, loading, error, reload } = useApi(() => api.enwrs.pendingInspection(), [])
  const [inspecting, setInspecting] = useState<Enwr>()
  const toast = useToast()

  return (
    <RequestLayout
      section="audit"
      auditPage="Inspections"
      crumb="Inspections"
      title="Inspections"
      subtitle="Receipts awaiting a quality check. Approve to make them tradable, or reject them."
    >
      <ErrorBanner error={error} onRetry={reload} />
      <div className="mt-3 overflow-hidden rounded-[12px] bg-white">
        <div className={`grid h-[50px] ${cols} items-center pl-[15px] text-[13px] text-[#667085]`}>
          <span>Commodity</span>
          <span>Warehouse</span>
          <span>Quantity</span>
          <span>Stored On</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {loading && !data ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">Loading receipts…</p>
        ) : data && data.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">No receipts are waiting for inspection.</p>
        ) : (
          data?.map((row) => (
            <div key={row.id} className={`grid h-[70px] ${cols} items-center border-t border-[#F2F4F7] pl-[15px] text-[13px]`}>
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
                <span className="block text-[11px] text-[#98A2B3]">{row.warehouseLocation}</span>
              </span>
              <span>{mt(row.quantityMt)}</span>
              <span>{toUiDate(row.storedOn)}</span>
              <StatusPill status={statusLabel(row.status)} className="w-[110px] justify-self-start" />
              <button
                type="button"
                onClick={() => {
                  setInspecting(row)
                }}
                className="h-[30px] w-[90px] rounded-[8px] bg-[#1F8955] text-[13px] font-medium text-white"
              >
                Inspect
              </button>
            </div>
          ))
        )}
      </div>
      {inspecting && (
        <Modal title={`Inspect ${inspecting.receiptNo}`} onClose={() => setInspecting(undefined)}>
          <InspectForm
            receipt={inspecting}
            onDone={(message) => {
              setInspecting(undefined)
              toast(message)
              reload()
            }}
            onFailed={reload}
          />
        </Modal>
      )}
    </RequestLayout>
  )
}

function InspectForm({ receipt, onDone, onFailed }: { receipt: Enwr; onDone: (message: string) => void; onFailed: () => void }) {
  const [decision, setDecision] = useState<InspectionRequest['decision']>('APPROVE')
  const [grade, setGrade] = useState(receipt.grade)
  const [moisture, setMoisture] = useState(receipt.moisturePct?.toString() ?? '')
  const [foreign, setForeign] = useState(receipt.foreignMatterPct?.toString() ?? '')
  const [remarks, setRemarks] = useState('')
  const [approved, setApproved] = useState<Enwr>()
  const inspect = useAction((body: InspectionRequest) => api.enwrs.inspect(receipt.id, body))
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v))

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = await inspect.run({
      decision,
      grade: grade.trim(),
      moisturePct: num(moisture),
      foreignMatterPct: num(foreign),
      remarks: remarks.trim() || undefined,
    })
    if (!result) return onFailed()
    // the approval is saved; with MetaMask the auditor can now put the receipt on chain
    if (decision === 'APPROVE' && hasMetaMask()) setApproved(result)
    else onDone(`${result.receiptNo} is now ${statusLabel(result.status)}.`)
  }

  if (approved) return <EnwrOnChainStep enwr={approved} onDone={() => onDone(`${approved.receiptNo} is now ${statusLabel(approved.status)}.`)} />

  return (
    <form onSubmit={submit} className="grid gap-3 text-[13px]">
      <p className="text-[#667085]">
        {receipt.commodity} · {mt(receipt.quantityMt)} at {receipt.warehouseName} · held by {receipt.ownerName}
      </p>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[#344054]">Decision</legend>
        {(
          [
            ['APPROVE', 'Approve', 'The receipt becomes Active: the holder can list it on the market or pledge it for a loan.'],
            ['REJECT', 'Reject', 'The receipt is rejected, its warehouse capacity is freed and its unpaid storage invoices are cancelled.'],
          ] as const
        ).map(([value, label, help]) => (
          <label
            key={value}
            className={`flex cursor-pointer gap-2 rounded-[10px] border px-3 py-2 ${decision === value ? 'border-[#1F8955] bg-[#E7F6EE]' : 'border-[#E6E8EC]'}`}
          >
            <input type="radio" name="decision" value={value} checked={decision === value} onChange={() => setDecision(value)} className="accent-[#1F8955]" />
            <span>
              <span className="block font-medium">{label}</span>
              <span className="text-[#667085]">{help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="block">
        <span className="mb-1 block text-[#344054]">Grade *</span>
        <input className={input} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. Grade A" />
        <FieldError message={inspect.error?.fieldMessage('grade')} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[#344054]">Moisture %</span>
          <input className={input} type="number" step="any" min="0" max="100" value={moisture} onChange={(e) => setMoisture(e.target.value)} />
          <FieldError message={inspect.error?.fieldMessage('moisturePct')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[#344054]">Foreign matter %</span>
          <input className={input} type="number" step="any" min="0" max="100" value={foreign} onChange={(e) => setForeign(e.target.value)} />
          <FieldError message={inspect.error?.fieldMessage('foreignMatterPct')} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[#344054]">Remarks</span>
        <textarea className={`${input} h-20 py-2`} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        <FieldError message={inspect.error?.fieldMessage('remarks')} />
      </label>
      <ErrorBanner error={inspect.error} />
      <button
        type="submit"
        disabled={inspect.busy}
        className={`h-10 rounded-[8px] text-[14px] font-medium text-white disabled:opacity-60 ${decision === 'APPROVE' ? 'bg-[#1F8955]' : 'bg-[#D92D20]'}`}
      >
        {inspect.busy ? 'Saving…' : decision === 'APPROVE' ? 'Approve receipt' : 'Reject receipt'}
      </button>
    </form>
  )
}
