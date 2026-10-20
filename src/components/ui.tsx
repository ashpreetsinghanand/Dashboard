import { useEffect, useState, type ReactNode } from 'react'
import type { ApiRequestError } from '../api/client'
import type { EntityProof } from '../api/types'
import { useApi } from '../lib/useApi'
import { shortHash } from '../lib/format'

/** Centered dialog; closes on Escape and backdrop click. */
export function Modal({ title, onClose, children, width = 'w-[520px]' }: { title: string; onClose: () => void; children: ReactNode; width?: string }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`${width} max-h-[90vh] max-w-full overflow-auto rounded-[16px] bg-white p-6`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[20px] leading-[26px] font-bold text-[#101828]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[20px] leading-none text-[#667085]">
            ×
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

/**
 * In-app replacement for window.confirm (which embedded browsers block and which looks unlike the app).
 * Usage: const [ask, confirmDialog] = useConfirm(); if (!(await ask('Pay ₹1,440?', 'Pay'))) return; ... render {confirmDialog}
 */
export function useConfirm(): [(message: string, confirmLabel?: string) => Promise<boolean>, ReactNode] {
  const [pending, setPending] = useState<{ message: string; label: string; resolve: (ok: boolean) => void }>()
  const ask = (message: string, label = 'Confirm') => new Promise<boolean>((resolve) => setPending({ message, label, resolve }))
  const close = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(undefined)
  }
  const dialog = pending ? (
    <Modal title="Please confirm" onClose={() => close(false)} width="w-[420px]">
      <p className="text-[14px] leading-5 text-[#344054]">{pending.message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={() => close(false)} className="h-10 rounded-[8px] border border-[#D0D5DD] px-4 text-[14px]">
          Go back
        </button>
        <button type="button" autoFocus onClick={() => close(true)} className="h-10 rounded-[8px] bg-[#1F8955] px-4 text-[14px] font-medium text-white">
          {pending.label}
        </button>
      </div>
    </Modal>
  ) : null
  return [ask, dialog]
}

/** API error with its trace id (quote it in bug reports) and an optional retry. */
export function ErrorBanner({ error, onRetry }: { error: ApiRequestError | undefined; onRetry?: () => void }) {
  if (!error) return null
  return (
    <div role="alert" className="flex items-center justify-between gap-3 rounded-[10px] border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-[14px] text-[#B42318]">
      <span>
        {error.message}
        {error.traceId ? <span className="ml-2 text-[12px] text-[#D92D20]/70">Ref {error.traceId.slice(0, 8)}</span> : null}
      </span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline">
          Retry
        </button>
      ) : null}
    </div>
  )
}

/** Inline form error under a field or button. */
export function FieldError({ message }: { message: string | undefined }) {
  return message ? <p className="mt-1 text-[12px] text-[#D92D20]">{message}</p> : null
}

/** Provenance timeline for one record: every ledger block that touched it, and whether the chain is intact. */
export function LedgerTimeline({ load }: { load: () => Promise<EntityProof> }) {
  const { data, loading, error, reload } = useApi(load, [])
  if (loading && !data) return <p className="text-[14px] text-[#667085]">Loading ledger…</p>
  if (error) return <ErrorBanner error={error} onRetry={reload} />
  if (!data) return null
  return (
    <div>
      <p className={`text-[14px] font-semibold ${data.intact ? 'text-[#1F8955]' : 'text-[#D92D20]'}`}>
        {data.intact ? '✓ Untampered' : '⚠ Record altered outside the app'}
      </p>
      <ol className="mt-3 grid gap-2">
        {data.blocks.map((block) => (
          <li key={block.height} className="rounded-[10px] border border-[#E6E8EC] px-3 py-2 text-[13px]">
            <p className="font-semibold capitalize text-[#101828]">{block.eventType.replaceAll('_', ' ').toLowerCase()}</p>
            <p className="mt-0.5 text-[#667085]">
              {new Date(block.timestamp).toLocaleString('en-IN')} · <code title={block.hash}>#{block.height} {shortHash(block.hash)}</code> · by{' '}
              <code title={block.actorAddress}>{shortHash(block.actorAddress)}</code>
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
