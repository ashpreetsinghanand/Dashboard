import { useState, type FormEvent } from 'react'
import { api } from '../../api/endpoints'
import type { AuditResult, WarehouseAudit, WarehouseAuditRequest, WarehouseSummary } from '../../api/types'
import { RequestLayout } from '../../components/RequestLayout'
import { ErrorBanner, FieldError, Modal } from '../../components/ui'
import { mt, shortHash, toUiDate } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'

const dueCols = 'grid-cols-[250fr_150fr_170fr_110fr_110fr]'
const recentCols = 'grid-cols-[120fr_180fr_150fr_70fr_200fr_130fr]'
const input = 'h-9 w-full rounded-[8px] border border-[#E6E8EC] bg-white px-2.5 text-[13px] outline-none focus:border-[#1F8955]'

const results: Record<AuditResult, { label: string; tone: string }> = {
  PASSED: { label: 'Passed', tone: 'bg-[#E7F6EE] text-[#1F8955]' },
  PASSED_WITH_OBSERVATIONS: { label: 'Passed w/ notes', tone: 'bg-[#FFF6DE] text-[#B54708]' },
  FAILED: { label: 'Failed', tone: 'bg-[#FEE4E2] text-[#D92D20]' },
}

function ResultPill({ result }: { result: AuditResult }) {
  return (
    <span className={`inline-grid h-[25px] w-[120px] place-items-center rounded-full text-[12px] font-medium ${results[result].tone}`}>
      {results[result].label}
    </span>
  )
}

export function WarehouseAuditsPage() {
  const due = useApi(() => api.audits.due(90), [])
  const recent = useApi(() => api.audits.recent(), [])
  const [auditing, setAuditing] = useState<{ id: string; name: string }>()

  return (
    <RequestLayout
      section="audit"
      auditPage="Warehouse Audits"
      crumb="Warehouse Audits"
      title="Warehouse Audits"
      subtitle="Visit warehouses, count the stock and rate them. A pass gives the warehouse its Verified badge."
    >
      <h2 className="text-[16px] font-bold text-[#101828]">Due for audit (not audited in 90 days)</h2>
      <ErrorBanner error={due.error} onRetry={due.reload} />
      <div className="mt-2 overflow-hidden rounded-[12px] bg-white">
        <div className={`grid h-[50px] ${dueCols} items-center pl-[15px] text-[13px] text-[#667085]`}>
          <span>Warehouse</span>
          <span>Location</span>
          <span>Capacity (free / total)</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {due.loading && !due.data ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">Loading warehouses…</p>
        ) : due.data && due.data.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">Every warehouse has been audited in the last 90 days.</p>
        ) : (
          due.data?.map((w: WarehouseSummary) => (
            <div key={w.id} className={`grid h-[70px] ${dueCols} items-center border-t border-[#F2F4F7] pl-[15px] text-[13px]`}>
              <span className="flex items-center gap-2">
                <img src={w.imageUrl} alt="" className="size-10 shrink-0 rounded-[8px] object-cover" />
                <span className="font-medium">{w.name}</span>
              </span>
              <span>{w.district}</span>
              <span>
                {mt(w.availableCapacityMt)} / {mt(w.totalCapacityMt)}
              </span>
              <span className={`text-[12px] font-medium ${w.verified ? 'text-[#1F8955]' : 'text-[#B54708]'}`}>
                {w.verified ? '✓ Verified' : 'Unverified'}
              </span>
              <button
                type="button"
                onClick={() => setAuditing({ id: w.id, name: w.name })}
                className="h-[30px] w-[90px] rounded-[8px] bg-[#1F8955] text-[13px] font-medium text-white"
              >
                Audit
              </button>
            </div>
          ))
        )}
      </div>

      <h2 className="mt-6 text-[16px] font-bold text-[#101828]">Recent audits</h2>
      <ErrorBanner error={recent.error} onRetry={recent.reload} />
      <div className="mt-2 overflow-hidden rounded-[12px] bg-white">
        <div className={`grid h-[50px] ${recentCols} items-center pl-[15px] text-[13px] text-[#667085]`}>
          <span>Audit</span>
          <span>Warehouse</span>
          <span>Result</span>
          <span>Rating</span>
          <span>Stock (verified / recorded)</span>
          <span>Auditor</span>
        </div>
        {recent.loading && !recent.data ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">Loading audits…</p>
        ) : recent.data && recent.data.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">No audits recorded yet.</p>
        ) : (
          recent.data?.map((a) => (
            <div key={a.id} className={`grid min-h-[70px] ${recentCols} items-center border-t border-[#F2F4F7] py-2 pl-[15px] text-[13px]`}>
              <span className="leading-[15px]">
                <span className="block font-medium">{a.code}</span>
                <span className="block text-[11px] text-[#98A2B3]">{toUiDate(a.auditedOn)}</span>
                <code title={a.ledgerHash ?? undefined} className="text-[10px] text-[#1F8955]">
                  ⛓ {shortHash(a.ledgerHash)}
                </code>
              </span>
              <span className="leading-[15px]" title={a.findings}>
                {a.warehouseName}
                <span className="line-clamp-2 block text-[11px] text-[#98A2B3]">{a.findings}</span>
              </span>
              <ResultPill result={a.result} />
              <span>{a.rating}/5</span>
              <span className="leading-[15px]">
                {mt(a.stockVerifiedMt)} / {mt(a.stockRecordedMt)}
                <Variance value={a.varianceMt} />
              </span>
              <span>{a.auditorName}</span>
            </div>
          ))
        )}
      </div>

      {auditing && (
        <Modal title={`Audit ${auditing.name}`} onClose={() => setAuditing(undefined)}>
          <AuditForm
            warehouseId={auditing.id}
            onClose={() => setAuditing(undefined)}
            onChanged={() => {
              due.reload()
              recent.reload()
            }}
          />
        </Modal>
      )}
    </RequestLayout>
  )
}

function Variance({ value }: { value: number }) {
  return (
    <span className={`block text-[11px] ${value === 0 ? 'text-[#98A2B3]' : 'text-[#D92D20]'}`}>
      Variance {value > 0 ? '+' : ''}
      {mt(value)}
    </span>
  )
}

function AuditForm({ warehouseId, onClose, onChanged }: { warehouseId: string; onClose: () => void; onChanged: () => void }) {
  const [result, setResult] = useState<AuditResult>('PASSED')
  const [rating, setRating] = useState('')
  const [stock, setStock] = useState('')
  const [findings, setFindings] = useState('')
  const [auditedOn, setAuditedOn] = useState('')
  const [saved, setSaved] = useState<WarehouseAudit>()
  const audit = useAction((body: WarehouseAuditRequest) => api.warehouses.audit(warehouseId, body))
  const err = (field: string) => audit.error?.fieldMessage(field)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const done = await audit.run({
      result,
      // empty required numbers go out as missing; the server answers with a field message
      rating: (rating.trim() === '' ? undefined : Number(rating)) as number,
      stockVerifiedMt: (stock.trim() === '' ? undefined : Number(stock)) as number,
      findings: findings.trim(),
      auditedOn: auditedOn || undefined,
    })
    if (done) setSaved(done)
    onChanged()
  }

  if (saved) {
    return (
      <div className="grid gap-3 text-[13px]">
        <p className="text-[14px] font-semibold text-[#1F8955]">
          {saved.code} recorded on {toUiDate(saved.auditedOn)}
        </p>
        <div className="flex items-center gap-2">
          <ResultPill result={saved.result} />
          <span>Rating {saved.rating}/5</span>
        </div>
        <dl className="grid grid-cols-3 gap-3 rounded-[10px] bg-[#F9FAFB] p-3">
          <div>
            <dt className="text-[#667085]">Stock on record</dt>
            <dd className="text-[16px] font-semibold">{mt(saved.stockRecordedMt)}</dd>
          </div>
          <div>
            <dt className="text-[#667085]">Stock verified</dt>
            <dd className="text-[16px] font-semibold">{mt(saved.stockVerifiedMt)}</dd>
          </div>
          <div>
            <dt className="text-[#667085]">Variance</dt>
            <dd className={`text-[16px] font-semibold ${saved.varianceMt === 0 ? '' : 'text-[#D92D20]'}`}>
              {saved.varianceMt > 0 ? '+' : ''}
              {mt(saved.varianceMt)}
            </dd>
          </div>
        </dl>
        <p className="text-[#667085]">
          Ledger <code title={saved.ledgerHash ?? undefined}>{shortHash(saved.ledgerHash)}</code>
        </p>
        <button type="button" onClick={onClose} className="h-10 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white">
          Done
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-3 text-[13px]">
      <p className="rounded-[8px] bg-[#F9FAFB] px-3 py-2 text-[#667085]">
        Passed (with or without observations) gives the warehouse its Verified badge; Failed removes it. The stock you count is
        compared with the receipts on record.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[#344054]">Result *</span>
          <select className={input} value={result} onChange={(e) => setResult(e.target.value as AuditResult)}>
            <option value="PASSED">Passed</option>
            <option value="PASSED_WITH_OBSERVATIONS">Passed with observations</option>
            <option value="FAILED">Failed</option>
          </select>
          <FieldError message={err('result')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[#344054]">Rating (0–5) *</span>
          <input className={input} type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
          <FieldError message={err('rating')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[#344054]">Stock counted on site (MT) *</span>
          <input className={input} type="number" step="any" min="0" value={stock} onChange={(e) => setStock(e.target.value)} />
          <FieldError message={err('stockVerifiedMt')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[#344054]">Audited on (default today)</span>
          <input className={input} type="date" value={auditedOn} onChange={(e) => setAuditedOn(e.target.value)} />
          <FieldError message={err('auditedOn')} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[#344054]">Findings *</span>
        <textarea className={`${input} h-24 py-2`} value={findings} onChange={(e) => setFindings(e.target.value)} />
        <FieldError message={err('findings')} />
      </label>
      <ErrorBanner error={audit.error} />
      <button type="submit" disabled={audit.busy} className="h-10 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white disabled:opacity-60">
        {audit.busy ? 'Saving…' : 'Record audit'}
      </button>
    </form>
  )
}
