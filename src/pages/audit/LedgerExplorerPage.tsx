import { useState, type FormEvent } from 'react'
import { api } from '../../api/endpoints'
import type { LedgerBlock, LedgerEntityType } from '../../api/types'
import { RequestLayout } from '../../components/RequestLayout'
import { ErrorBanner, LedgerTimeline } from '../../components/ui'
import { shortHash } from '../../lib/format'
import { useAction, useApi } from '../../lib/useApi'

const PAGE = 50
const entityTypes: LedgerEntityType[] = ['ENWR', 'BOOKING', 'WAREHOUSE', 'LISTING', 'BID', 'TRADE', 'INVOICE', 'LOAN', 'AUDIT', 'USER']
const cols = 'grid-cols-[70fr_220fr_170fr_150fr_250fr]'
const field = 'h-[30px] rounded-[8px] border border-[#E6E8EC] bg-white px-2.5 text-[13px] outline-none'

export function LedgerExplorerPage() {
  const verify = useAction(api.ledger.verify)
  const [check, setCheck] = useState<Awaited<ReturnType<typeof api.ledger.verify>>>()

  const first = useApi(() => api.ledger.blocks(PAGE), [])
  const [older, setOlder] = useState<LedgerBlock[]>([])
  const loadMore = useAction(api.ledger.blocks)
  const blocks = [...(first.data ?? []), ...older]
  const last = blocks.at(-1)
  const [exhausted, setExhausted] = useState(false)

  const [type, setType] = useState<LedgerEntityType>('ENWR')
  const [entityId, setEntityId] = useState('')
  const [lookup, setLookup] = useState<{ type: LedgerEntityType; id: string }>()

  async function runVerify() {
    setCheck(await verify.run())
  }

  async function more() {
    if (!last) return
    const page = await loadMore.run(PAGE, last.height)
    if (!page) return
    setOlder((cur) => [...cur, ...page])
    if (page.length < PAGE) setExhausted(true)
  }

  function refresh() {
    setOlder([])
    setExhausted(false)
    first.reload()
  }

  function submitLookup(event: FormEvent) {
    event.preventDefault()
    if (entityId.trim()) setLookup({ type, id: entityId.trim() })
  }

  return (
    <RequestLayout
      section="audit"
      auditPage="Ledger"
      crumb="Ledger"
      title="Ledger"
      subtitle="Every change is chained into a tamper-evident ledger. Verify the chain, browse blocks or trace one record."
      toolbar={
        <div className="flex items-center gap-[15px]">
          <button
            type="button"
            onClick={runVerify}
            disabled={verify.busy}
            className="h-[30px] w-[150px] shrink-0 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white disabled:opacity-60"
          >
            {verify.busy ? 'Verifying…' : 'Verify chain'}
          </button>
          {check &&
            (check.valid ? (
              <span className="text-[14px] font-semibold text-[#1F8955]" title={check.headHash ?? undefined}>
                ✓ Chain intact · {check.blocksChecked} blocks
                <span className="ml-2 text-[12px] font-normal text-[#667085]">
                  head #{check.headHeight} {shortHash(check.headHash)} · {check.durationMs} ms
                </span>
              </span>
            ) : (
              <span className="text-[14px] font-semibold text-[#D92D20]">
                ⚠ Altered at block {check.firstInvalidHeight}: {check.problem}
              </span>
            ))}
        </div>
      }
    >
      <ErrorBanner error={verify.error} />

      <section className="rounded-[12px] bg-white p-4">
        <h2 className="text-[16px] font-bold text-[#101828]">Trace a record</h2>
        <form onSubmit={submitLookup} className="mt-2 flex items-center gap-[10px]">
          <select aria-label="Entity type" value={type} onChange={(e) => setType(e.target.value as LedgerEntityType)} className={`${field} w-[150px]`}>
            {entityTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input
            aria-label="Record id"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="Record id, e.g. 4 or nayak"
            className={`${field} min-w-0 flex-1`}
          />
          <button type="submit" className="h-[30px] w-[150px] shrink-0 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white">
            Look up
          </button>
        </form>
        {lookup && (
          <div className="mt-3">
            <p className="mb-2 text-[13px] text-[#667085]">
              {lookup.type} {lookup.id}
            </p>
            <LookupResult key={`${lookup.type}/${lookup.id}`} type={lookup.type} id={lookup.id} />
          </div>
        )}
      </section>

      <div className="mt-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#101828]">Blocks</h2>
        <button type="button" onClick={refresh} disabled={first.loading} className="text-[13px] font-medium text-[#1F8955] disabled:opacity-50">
          Refresh
        </button>
      </div>
      <ErrorBanner error={first.error} onRetry={refresh} />
      <div className="mt-2 overflow-hidden rounded-[12px] bg-white">
        <div className={`grid h-[50px] ${cols} items-center pl-[15px] text-[13px] text-[#667085]`}>
          <span>Height</span>
          <span>Event</span>
          <span>Record</span>
          <span>Time</span>
          <span>Hash / Actor</span>
        </div>
        {first.loading && !first.data ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">Loading blocks…</p>
        ) : blocks.length === 0 && !first.error ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">The ledger has no blocks yet.</p>
        ) : (
          blocks.map((b) => (
            <details key={b.height} className="border-t border-[#F2F4F7] text-[13px]">
              <summary className={`grid min-h-[56px] cursor-pointer ${cols} items-center py-2 pl-[15px] [&::-webkit-details-marker]:hidden`}>
                <span className="font-medium">#{b.height}</span>
                <span className="capitalize">{b.eventType.replaceAll('_', ' ').toLowerCase()}</span>
                <span>
                  {b.entityType} {b.entityId}
                </span>
                <span>{new Date(b.timestamp).toLocaleString('en-IN')}</span>
                <span className="leading-[15px]">
                  <code title={b.hash}>{shortHash(b.hash)}</code>
                  <span className="block text-[11px] text-[#98A2B3]">
                    by <code title={b.actorAddress}>{shortHash(b.actorAddress)}</code> · prev{' '}
                    <code title={b.prevHash}>{shortHash(b.prevHash)}</code>
                  </span>
                </span>
              </summary>
              <pre className="mx-[15px] mb-3 overflow-auto rounded-[8px] bg-[#F9FAFB] p-3 text-[12px] text-[#344054]">
                {JSON.stringify(b.payload, null, 2)}
              </pre>
            </details>
          ))
        )}
      </div>
      <ErrorBanner error={loadMore.error} onRetry={more} />
      {last && !exhausted && (first.data?.length ?? 0) >= PAGE && last.height > 0 && (
        <button
          type="button"
          onClick={more}
          disabled={loadMore.busy}
          className="mt-3 h-[30px] w-full rounded-[8px] border border-[#1F8955] bg-white text-[14px] font-medium text-[#1F8955] disabled:opacity-60"
        >
          {loadMore.busy ? 'Loading…' : `Load blocks before #${last.height}`}
        </button>
      )}
    </RequestLayout>
  )
}

function LookupResult({ type, id }: { type: LedgerEntityType; id: string }) {
  // endpoints.ts puts the id into the path as-is
  const { data, loading, error, reload } = useApi(() => api.ledger.entity(type, encodeURIComponent(id)), [type, id])
  if (loading && !data) return <p className="text-[14px] text-[#667085]">Loading ledger…</p>
  if (error) return <ErrorBanner error={error} onRetry={reload} />
  if (!data) return null
  // the API answers an unknown id with an empty, "intact" proof rather than 404
  if (data.blocks.length === 0) return <p className="text-[14px] text-[#667085]">No ledger blocks for this record.</p>
  return <LedgerTimeline load={() => Promise.resolve(data)} />
}
