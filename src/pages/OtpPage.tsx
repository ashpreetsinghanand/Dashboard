import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/endpoints'
import { signupDraft } from '../auth/AuthContext'
import { AuthScreen } from '../components/AuthScreen'
import { FieldError } from '../components/ui'
import { useAction } from '../lib/useApi'

const EMPTY_OTP = ['', '', '', '', '', '']

/** Six single-digit boxes; also used by the forgot-password flow on the Sign In page. */
export function OtpFields({ digits, onChange }: { digits: string[]; onChange: (digits: string[]) => void }) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  function update(index: number, value: string) {
    const clean = value.replace(/\D/g, '')
    // pasting the whole code into any box fills all six
    if (clean.length === 6) {
      onChange(clean.split(''))
      inputs.current[5]?.focus()
      return
    }
    const next = clean.slice(-1)
    onChange(digits.map((digit, digitIndex) => (digitIndex === index ? next : digit)))
    if (next && index < 5) inputs.current[index + 1]?.focus()
  }

  return (
    <div className="mt-4 flex justify-between">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(node) => {
            inputs.current[index] = node
          }}
          value={digit}
          onChange={(event) => update(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digits[index] && index > 0) {
              inputs.current[index - 1]?.focus()
            }
          }}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-label={`Digit ${index + 1}`}
          className="size-[50px] rounded-[8px] border border-[#E4E7EC] text-center text-[18px] outline-none focus:border-[#1F8955]"
        />
      ))}
    </div>
  )
}

export function OtpPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [draft] = useState(signupDraft.read)
  const [digits, setDigits] = useState(EMPTY_OTP)
  const [seconds, setSeconds] = useState(draft.resendAfterSeconds ?? 60)
  const [devOtp, setDevOtp] = useState<string | null>((location.state as { devOtp?: string | null } | null)?.devOtp ?? null)
  const verify = useAction(api.auth.verifyOtp)
  const resend = useAction(api.auth.sendOtp)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (!draft.phone || !draft.challengeId) return <Navigate to="/signup/phone" replace />
  const phone = draft.phone

  async function submit(event: FormEvent) {
    event.preventDefault()
    // read at submit time: Resend replaces the challenge
    const ok = await verify.run(signupDraft.read().challengeId ?? '', digits.join(''))
    if (!ok) return
    signupDraft.merge({ verificationToken: ok.verificationToken })
    navigate('/signup/password')
  }

  async function sendAgain() {
    const sent = await resend.run(phone, 'SIGNUP')
    if (!sent) return
    signupDraft.merge({ challengeId: sent.challengeId, resendAfterSeconds: sent.resendAfterSeconds })
    setSeconds(sent.resendAfterSeconds)
    setDevOtp(sent.devOtp)
    setDigits(EMPTY_OTP)
  }

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const error = verify.error ?? resend.error

  return (
    <AuthScreen
      filled={3}
      title="Powering Agriculture Markets"
      subtitle="Buy, sell and trade commodities with verified partners."
    >
      <form
        onSubmit={submit}
        className="mt-[30px] flex min-h-[400px] w-[350px] flex-col rounded-[16px] bg-white px-[15px] pt-[15px] pb-4 shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
      >
        <h2 className="text-center text-[24px] leading-none font-bold">Verify OTP</h2>
        <p className="mx-auto mt-3 w-[320px] text-center text-[14px] leading-[19px] text-[#9AA0A6]">
          Enter your OTP which has been sent to your Phone No. and completely verify your account.
        </p>
        <OtpFields digits={digits} onChange={setDigits} />
        {devOtp ? <p className="mt-2 text-center text-[12px] text-[#98A2B3]">Demo code: {devOtp}</p> : null}
        <p className="mt-[18px] text-center text-[14px] text-[#98A2B3]">
          A code has been sent to ******{phone.slice(-4)}
        </p>
        {seconds > 0 ? (
          <p className="mt-1 text-center text-[16px] font-semibold">Resend in {clock}</p>
        ) : (
          <button
            type="button"
            onClick={sendAgain}
            disabled={resend.busy}
            className="mt-1 text-center text-[16px] font-semibold text-[#1F8955] disabled:opacity-60"
          >
            {resend.busy ? 'Sending…' : 'Resend code'}
          </button>
        )}
        <FieldError message={error?.message} />
        <button
          type="submit"
          disabled={verify.busy || digits.join('').length !== 6}
          className="mt-3 h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-medium text-white disabled:opacity-60"
        >
          {verify.busy ? 'Verifying…' : 'Confirm'}
        </button>
      </form>
    </AuthScreen>
  )
}
