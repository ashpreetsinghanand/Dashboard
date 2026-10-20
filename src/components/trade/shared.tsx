import type { ReactNode } from 'react'
import { useAction } from '../../lib/useApi'
import { ErrorBanner, FieldError, Modal } from '../ui'
import { primaryBtn, secondaryBtn } from './styles'

/** Label/value rows for detail modals. */
export function DetailGrid({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[#98A2B3]">{label}</dt>
          <dd className="font-medium text-[#101828]">{value ?? '-'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  error,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
  error?: string
}) {
  return (
    <label className="block text-[13px]">
      <span className="text-[#344054]">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-[8px] border border-[#E6E8EC] px-3 text-[14px] outline-none focus:border-[#1F8955]"
      />
      {hint ? <span className="mt-1 block text-[12px] text-[#98A2B3]">{hint}</span> : null}
      <FieldError message={error} />
    </label>
  )
}

/** Previous / next paging for zero-based API pages. Hidden when there is only one page. */
export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-3 flex items-center justify-end gap-3 text-[13px] text-[#667085]">
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className="h-8 rounded-[8px] border border-[#E6E8EC] bg-white px-3 disabled:opacity-50">
        Previous
      </button>
      <span>
        Page {page + 1} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page + 1 >= totalPages}
        onClick={() => onPage(page + 1)}
        className="h-8 rounded-[8px] border border-[#E6E8EC] bg-white px-3 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  )
}

/** Yes/no dialog for an irreversible action. Reloads the caller's data whether the action succeeds or not. */
export function ConfirmModal({
  title,
  message,
  confirmLabel,
  action,
  onClose,
  onDone,
}: {
  title: string
  message: ReactNode
  confirmLabel: string
  action: () => Promise<unknown>
  onClose: () => void
  onDone: () => void
}) {
  const act = useAction(action)
  async function confirm() {
    const ok = await act.run()
    onDone() // reload either way: after INVALID_STATE someone else probably changed the record
    if (ok !== undefined) onClose()
  }
  return (
    <Modal title={title} onClose={onClose}>
      <div className="text-[14px] text-[#344054]">{message}</div>
      <div className="mt-3">
        <ErrorBanner error={act.error} />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={secondaryBtn}>
          Cancel
        </button>
        <button type="button" disabled={act.busy} onClick={confirm} className={primaryBtn}>
          {act.busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
