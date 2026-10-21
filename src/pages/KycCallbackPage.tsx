import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import { DashboardShell } from '../components/DashboardShell'
import { KYC_KEY } from '../components/KycGate'
import { useToast } from '../components/Toast'
import { ErrorBanner } from '../components/ui'
import { useApi } from '../lib/useApi'

function readSaved(): { requestId?: string; next?: string } {
  try {
    return JSON.parse(sessionStorage.getItem(KYC_KEY) ?? '{}')
  } catch {
    return {}
  }
}

/** DigiLocker (or the mock) sends the user here with ?id=; finish verification and go back to the booking. */
export function KycCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [saved] = useState(readSaved)
  const requestId = params.get('id') ?? saved.requestId
  // only same-app paths, never "//other.site"
  const next = saved.next?.startsWith('/') && !saved.next.startsWith('//') ? saved.next : '/store'
  const result = useApi(
    () => (requestId ? api.kyc.complete(requestId) : Promise.reject(new Error('No DigiLocker verification is in progress.'))),
    [requestId],
  )

  useEffect(() => {
    if (result.data?.status !== 'VERIFIED') return
    try {
      sessionStorage.removeItem(KYC_KEY)
    } catch {
      /* ignore */
    }
    toast('Identity verified with DigiLocker.')
    navigate(next, { replace: true })
  }, [result.data, next, navigate, toast])

  return (
    <DashboardShell section="store">
      <main className="min-w-0 flex-1 px-5 pt-[15px] pb-10">
        <section className="mt-10 max-w-[520px] rounded-[16px] bg-white p-6">
          <h1 className="text-[20px] font-bold">DigiLocker verification</h1>
          {result.loading && !result.data ? <p className="mt-3 text-[14px] text-[#667085]">Checking your verification…</p> : null}
          {result.error ? (
            <div className="mt-3">
              <ErrorBanner error={result.error} onRetry={requestId ? result.reload : undefined} />
            </div>
          ) : null}
          {result.data && result.data.status !== 'VERIFIED' ? (
            <>
              <p className="mt-3 text-[14px] leading-5 text-[#344054]">
                Verification isn&apos;t finished yet. If you closed DigiLocker before giving consent, start again from Book Now.
              </p>
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={result.reload} className="h-10 rounded-[8px] border border-[#D0D5DD] px-4 text-[14px]">
                  Check again
                </button>
                <Link to={next} className="grid h-10 place-items-center rounded-[8px] bg-[#1F8955] px-4 text-[14px] font-medium text-white">
                  Back to booking
                </Link>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </DashboardShell>
  )
}
