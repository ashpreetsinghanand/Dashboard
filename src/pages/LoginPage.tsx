import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { OtpSent } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { FieldError } from '../components/ui'
import { useAction } from '../lib/useApi'
import { OtpFields } from './OtpPage'

function IndiaFlag() {
  return (
    <svg viewBox="0 0 36 24" className="h-[22px] w-[32px] rounded-[2px]" aria-hidden="true">
      <rect width="36" height="8" fill="#FF9933" />
      <rect y="8" width="36" height="8" fill="#FFFFFF" />
      <rect y="16" width="36" height="8" fill="#138808" />
      <circle cx="18" cy="12" r="3" fill="none" stroke="#000080" strokeWidth="0.7" />
    </svg>
  )
}

const EMPTY_OTP = ['', '', '', '', '', '']

/** signin, or one of the forgot-password steps: phone -> otp -> password */
type Step = 'signin' | 'phone' | 'otp' | 'password'

const copy: Record<Step, { title: string; subtitle: string; button: string }> = {
  signin: { title: 'Sign In', subtitle: 'Enter your phone number and password to continue with KRSI.', button: 'Sign In' },
  phone: { title: 'Forgot Password', subtitle: 'Enter your registered phone number and we will send you a code.', button: 'Send Code' },
  otp: { title: 'Verify OTP', subtitle: 'Enter the code sent to your phone to reset your password.', button: 'Confirm' },
  password: { title: 'Reset Password', subtitle: 'Choose a new password for your KRSI account.', button: 'Reset Password' },
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, acceptSession } = useAuth()
  // captured once: a failed sign-in (401) re-navigates to /login and drops location.state
  const [from] = useState(() => (location.state as { from?: string } | null)?.from ?? '/dashboard')
  const [step, setStep] = useState<Step>('signin')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [digits, setDigits] = useState(EMPTY_OTP)
  const [challenge, setChallenge] = useState<OtpSent>()
  const [verificationToken, setVerificationToken] = useState('')
  const signIn = useAction(login)
  const send = useAction(api.auth.sendOtp)
  const verify = useAction(api.auth.verifyOtp)
  const reset = useAction(api.auth.resetPassword)

  const error = { signin: signIn.error, phone: send.error, otp: verify.error ?? send.error, password: reset.error }[step]
  const busy = signIn.busy || send.busy || verify.busy || reset.busy

  async function sendCode() {
    const sent = await send.run(phone, 'RESET_PASSWORD')
    if (!sent) return
    setChallenge(sent)
    setDigits(EMPTY_OTP)
    setStep('otp')
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (step === 'signin') {
      if (await signIn.run(phone, password)) navigate(from, { replace: true })
    } else if (step === 'phone') {
      await sendCode()
    } else if (step === 'otp') {
      const ok = await verify.run(challenge?.challengeId ?? '', digits.join(''))
      if (!ok) return
      setVerificationToken(ok.verificationToken)
      setPassword('')
      setConfirm('')
      setStep('password')
    } else {
      const session = await reset.run(verificationToken, password, confirm)
      if (!session) return
      acceptSession(session)
      navigate('/dashboard', { replace: true })
    }
  }

  function goTo(next: Step) {
    setPassword('')
    setStep(next)
  }

  return (
    <div className="min-h-screen bg-[#f6f9fc]">
      <div className="mx-auto min-h-screen w-[1440px] bg-[#f6f9fc]">
        <header className="flex h-[60px] items-center justify-end gap-[45px] bg-white pr-[30px] text-[16px] leading-[19px] text-[#1E1E1E]">
          <Link to="/store">Find Warehouse</Link>
          <button type="button">About</button>
          <button type="button">Contact Us</button>
          <span className="font-semibold text-[#1F8955]">Sign In</span>
          <Link
            to="/signup"
            className="grid h-10 w-[90px] place-items-center rounded-[6px] bg-[#1F8955] font-medium text-white"
          >
            Sign Up
          </Link>
        </header>

        <div className="flex flex-col items-center">
          <h1 className="mt-[170px] text-center text-[48px] leading-[58px] font-bold tracking-[-0.5px] text-black">
            Powering Agriculture Markets
          </h1>
          <p className="mt-5 text-center text-[16px] leading-[19px] font-medium text-[#979797]">
            Buy, sell and trade commodities with verified partners.
          </p>

          <form
            onSubmit={submit}
            className="mt-[30px] w-[350px] rounded-[16px] bg-white px-[15px] pt-[15px] pb-4 shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
          >
            <h2 className="text-center text-[24px] leading-[29px] font-bold">{copy[step].title}</h2>
            <p className="mx-auto mt-3 w-[320px] text-center text-[14px] leading-[19px] text-[#9AA0A6]">
              {copy[step].subtitle}
            </p>

            {step === 'signin' || step === 'phone' ? (
              <>
                <label className="mt-[18px] block text-[15px] font-semibold">Phone Number</label>
                <div className="mt-2.5 flex gap-2.5">
                  <div className="flex h-12 w-20 items-center justify-center gap-1 rounded-[10px] border border-[#E4E7EC] bg-white">
                    <IndiaFlag />
                    <span className="text-[10px] text-[#667085]">▾</span>
                  </div>
                  <div className="flex h-12 flex-1 items-center rounded-[10px] border border-[#E4E7EC] px-2.5">
                    <span className="text-[14px] text-[#667085]">+91</span>
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                      placeholder="Mobile number"
                      aria-label="Mobile number"
                      className="ml-2 w-full bg-transparent text-[14px] text-[#1E1E1E] outline-none placeholder:text-[#B0B6BE]"
                    />
                  </div>
                </div>
              </>
            ) : null}

            {step === 'otp' && challenge ? (
              <>
                <OtpFields digits={digits} onChange={setDigits} />
                {challenge.devOtp ? (
                  <p className="mt-2 text-center text-[12px] text-[#98A2B3]">Dev code: {challenge.devOtp}</p>
                ) : null}
                <p className="mt-[18px] text-center text-[14px] text-[#98A2B3]">
                  A code has been sent to {challenge.phoneMasked}
                </p>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={busy}
                  className="mx-auto mt-1 block text-[14px] font-semibold text-[#1F8955] disabled:opacity-60"
                >
                  Resend code
                </button>
              </>
            ) : null}

            {step === 'signin' || step === 'password' ? (
              <>
                <label className="mt-4 block text-[15px] font-semibold">{step === 'password' ? 'New password' : 'Password'}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Text your password"
                  aria-label={step === 'password' ? 'New password' : 'Password'}
                  autoComplete={step === 'password' ? 'new-password' : 'current-password'}
                  className="mt-2 h-12 w-full rounded-[10px] border border-[#E6E8EC] bg-white px-4 text-[14px] outline-none placeholder:text-[#C5CAD1]"
                />
              </>
            ) : null}
            {step === 'password' ? (
              <>
                <FieldError message={error?.fieldMessage('password')} />
                <label className="mt-4 block text-[15px] font-semibold">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  placeholder="Text your password"
                  aria-label="Confirm password"
                  autoComplete="new-password"
                  className="mt-2 h-12 w-full rounded-[10px] border border-[#E6E8EC] bg-white px-4 text-[14px] outline-none placeholder:text-[#C5CAD1]"
                />
              </>
            ) : null}
            {step === 'signin' ? (
              <button
                type="button"
                onClick={() => goTo('phone')}
                className="mt-2 ml-auto block text-[13px] font-medium text-[#2F6BFF]"
              >
                Forgot password?
              </button>
            ) : null}

            <FieldError
              message={error && !error.fieldMessage('password') ? (error.fieldMessage('phone') ?? error.message) : undefined}
            />

            <button
              type="submit"
              disabled={busy}
              className="mt-4 h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-medium text-white disabled:opacity-60"
            >
              {busy ? 'Please wait…' : copy[step].button}
            </button>

            {step === 'signin' ? (
              <>
                <div className="mt-7 flex items-center gap-3 text-[14px] text-[#98A2B3]">
                  <span className="h-px flex-1 bg-[#E6E8EC]" />
                  Or
                  <span className="h-px flex-1 bg-[#E6E8EC]" />
                </div>
                <p className="mt-6 text-center text-[14px] text-[#667085]">
                  Don&apos;t have an account?{' '}
                  <Link to="/signup" className="font-medium text-[#2F6BFF]">
                    Register
                  </Link>
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => goTo('signin')}
                className="mx-auto mt-6 block text-[14px] font-medium text-[#2F6BFF]"
              >
                Back to Sign In
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
