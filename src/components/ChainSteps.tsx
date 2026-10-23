import { useEffect, useState } from 'react'
import { api } from '../api/endpoints'
import type { Enwr } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { hasMetaMask } from '../chain/metamask'
import { useApi } from '../lib/useApi'
import { useToast } from './Toast'

// The chain code (viem) loads only when one of these is used, so it never weighs on the dashboard's first load.
const chain = () => Promise.all([import('../chain/onchain'), import('../chain/wallet')])

/** Runs one MetaMask step, tracking busy and turning failures into a readable message. */
async function attempt(setBusy: (b: boolean) => void, setError: (m?: string) => void, action: () => Promise<void>) {
  setBusy(true)
  setError(undefined)
  try {
    await action()
  } catch (e) {
    setError(await chain().then(([, w]) => w.chainErrorMessage(e), () => String(e)))
  } finally {
    setBusy(false)
  }
}

const btn = 'h-9 rounded-[8px] px-3.5 text-[13px] font-medium disabled:opacity-50'
const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`

/**
 * KYC on chain (handoff step 1): the user connects their own wallet, then the presenter switches MetaMask to the
 * KRSI issuer account, which signs EAS.attest. Shown only with MetaMask, to a KYC-verified farmer, merchant or owner.
 */
export function KycOnChainCard() {
  const { user } = useAuth()
  const kyc = useApi(() => api.kyc.status(), [])
  const [onChain, setOnChain] = useState<string | null>()
  const [wallet, setWallet] = useState<`0x${string}`>()
  const [hash, setHash] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const eligible = hasMetaMask() && !!user && user.role !== 'AUDITOR' && kyc.data?.status === 'VERIFIED'

  useEffect(() => {
    if (!eligible || !user) return
    chain()
      .then(([, w]) => w.kycWalletOnChain(user.id))
      .then(setOnChain)
      .catch(() => setOnChain(null)) // unreadable counts as "not on chain"; signing again is harmless to try
  }, [eligible, user])

  if (!eligible || !user || !kyc.data) return null

  const step = (action: () => Promise<void>) => attempt(setBusy, setError, action)
  const connect = () => step(async () => setWallet(await (await chain())[1].connectWallet()))
  const sign = () =>
    step(async () => {
      const [onchain] = await chain()
      setHash(await onchain.putKycOnChain(user, kyc.data!, wallet!))
      setOnChain(wallet!)
    })

  return (
    <section className="mt-5 max-w-[520px] rounded-[16px] bg-white p-6 text-[14px]">
      <h2 className="text-[16px] font-bold">KYC on blockchain</h2>
      <p className="mt-1 text-[13px] text-[#667085]">A verifiable KYC credential for your wallet on Arbitrum Sepolia. No personal data goes on chain.</p>
      {onChain === undefined ? (
        <p className="mt-3 text-[13px] text-[#667085]">Checking the chain…</p>
      ) : onChain ? (
        <p className="mt-3 font-medium text-[#1F8955]">
          On chain ✓ wallet {short(onChain)}
          {hash && (
            <>
              {' · '}
              <a href={`https://sepolia.arbiscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="underline">
                View transaction
              </a>
            </>
          )}
        </p>
      ) : (
        <ol className="mt-3 grid gap-3">
          <li className="flex items-center justify-between gap-3">
            <span>1. Connect your wallet{wallet && <span className="ml-1 text-[#1F8955]">✓ {short(wallet)}</span>}</span>
            <button type="button" disabled={busy} onClick={connect} className={`${btn} border border-[#D0D5DD]`}>
              {wallet ? 'Change' : 'Connect wallet'}
            </button>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>2. Switch MetaMask to the KRSI issuer account, then sign</span>
            <button type="button" disabled={busy || !wallet} onClick={sign} className={`${btn} bg-[#1F8955] text-white`}>
              {busy && wallet ? 'Waiting for MetaMask…' : 'Sign as issuer'}
            </button>
          </li>
        </ol>
      )}
      {error && <p role="alert" className="mt-3 text-[13px] text-[#D92D20]">{error}</p>}
    </section>
  )
}

/** eNWR on chain (handoff step 2): right after the auditor approves, the auditor account signs KrsiReceipt.issue. */
export function EnwrOnChainStep({ enwr, onDone }: { enwr: Enwr; onDone: () => void }) {
  const toast = useToast()
  const [hash, setHash] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const sign = () =>
    attempt(setBusy, setError, async () => {
      const [onchain] = await chain()
      setHash(await onchain.putEnwrOnChain(enwr))
      toast(`${enwr.receiptNo} is on chain.`)
    })

  return (
    <div className="grid gap-3 text-[13px]">
      <p className="font-medium text-[#1F8955]">{enwr.receiptNo} is approved and saved.</p>
      {hash ? (
        <p>
          On chain ✓{' '}
          <a href={`https://sepolia.arbiscan.io/tx/${hash}`} target="_blank" rel="noreferrer" className="font-medium text-[#1F8955] underline">
            View transaction
          </a>
        </p>
      ) : (
        <p className="text-[#667085]">Put it on chain: switch MetaMask to the auditor account, then sign. You can skip this and the approval still stands.</p>
      )}
      {error && <p role="alert" className="text-[#D92D20]">{error}</p>}
      <div className="flex gap-3">
        {!hash && (
          <button type="button" disabled={busy} onClick={sign} className={`${btn} h-10 flex-1 bg-[#1F8955] text-white`}>
            {busy ? 'Waiting for MetaMask…' : error ? 'Try again' : 'Sign as auditor'}
          </button>
        )}
        <button type="button" disabled={busy} onClick={onDone} className={`${btn} h-10 border border-[#D0D5DD] ${hash ? 'flex-1' : ''}`}>
          {hash ? 'Done' : 'Skip'}
        </button>
      </div>
    </div>
  )
}
