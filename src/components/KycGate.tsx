import { useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/endpoints'
import { useAction, useApi } from '../lib/useApi'
import { ErrorBanner, Modal } from './ui'

/** Where the KYC callback page finds the request it is finishing and the page to return to. */
export const KYC_KEY = 'krsi-kyc'

/** Shows children (the Book Now form) once the user is KYC-verified; otherwise a one-time DigiLocker step first. */
export function KycGate({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const kyc = useApi(() => api.kyc.status(), [])
  const start = useAction(api.kyc.start)
  const location = useLocation()
  const [skipped, setSkipped] = useState(false)

  // while KYC is optional, nobody is blocked: a Setu outage or a user without DigiLocker can still book
  if (kyc.data?.status === 'VERIFIED' || skipped) return <>{children}</>

  async function verify() {
    const started = await start.run(`${window.location.origin}/kyc/callback`)
    if (!started) return
    try {
      sessionStorage.setItem(KYC_KEY, JSON.stringify({ requestId: started.requestId, next: location.pathname + location.search }))
    } catch {
      /* private mode: the callback still has ?id= from DigiLocker */
    }
    window.location.assign(started.url)
  }

  return (
    <Modal title="Verify your identity" onClose={onClose} width="w-[440px]">
      {kyc.loading && !kyc.data ? (
        <p className="text-[14px] text-[#667085]">Checking your KYC…</p>
      ) : kyc.error ? (
        <ErrorBanner error={kyc.error} onRetry={kyc.reload} />
      ) : (
        <>
          <p className="text-[14px] leading-5 text-[#344054]">
            Before your first booking we verify your identity once with your Aadhaar through <strong>DigiLocker</strong>. It takes about a
            minute.
          </p>
          <p className="mt-2 text-[13px] leading-5 text-[#667085]">We keep only your name and the last 4 digits of your Aadhaar.</p>
          <div className="mt-3">
            <ErrorBanner error={start.error} />
          </div>
          <div className="mt-5 flex justify-end gap-3">
            {kyc.data?.requiredForBooking ? (
              <button type="button" onClick={onClose} className="h-10 rounded-[8px] border border-[#D0D5DD] px-4 text-[14px]">
                Not now
              </button>
            ) : (
              <button type="button" onClick={() => setSkipped(true)} className="h-10 rounded-[8px] border border-[#D0D5DD] px-4 text-[14px]">
                Continue without KYC
              </button>
            )}
            <button
              type="button"
              onClick={() => void verify()}
              disabled={start.busy}
              className="h-10 rounded-[8px] bg-[#1F8955] px-4 text-[14px] font-medium text-white disabled:opacity-60"
            >
              {start.busy ? 'Opening DigiLocker…' : 'Verify with DigiLocker'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
