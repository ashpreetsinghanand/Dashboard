import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/endpoints'
import { signupDraft, useAuth } from '../auth/AuthContext'
import { AuthScreen } from '../components/AuthScreen'
import { FieldError } from '../components/ui'
import { useAction } from '../lib/useApi'

export function PasswordPage() {
  const navigate = useNavigate()
  const { acceptSession } = useAuth()
  const [draft] = useState(signupDraft.read)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const signup = useAction(api.auth.signup)

  if (!draft.verificationToken || !draft.category) return <Navigate to="/signup" replace />
  const { verificationToken, category, language } = draft

  async function submit(event: FormEvent) {
    event.preventDefault()
    const session = await signup.run({ verificationToken, password, confirmPassword: confirm, category, language, fullName: fullName.trim() || undefined })
    if (!session) return
    acceptSession(session)
    signupDraft.clear()
    navigate('/dashboard')
  }

  const passwordError = signup.error?.fieldMessage('password')

  return (
    <AuthScreen
      filled={3}
      title="Powering Agriculture Markets"
      subtitle="Buy, sell and trade commodities with verified partners."
    >
      <form
        onSubmit={submit}
        className="mt-[30px] min-h-[400px] w-[350px] rounded-[16px] bg-white px-[15px] pt-[30px] pb-4 shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
      >
        <h2 className="text-center text-[24px] leading-none font-bold">Create Password</h2>
        <label htmlFor="signup-name" className="mt-6 block text-[15px] font-semibold">Full name</label>
        <input
          id="signup-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Your name or organisation"
          autoComplete="name"
          className="mt-2 h-12 w-full rounded-[10px] border border-[#E6E8EC] bg-white px-4 text-[14px] outline-none placeholder:text-[#C5CAD1]"
        />
        <FieldError message={signup.error?.fieldMessage('fullName')} />
        <label htmlFor="signup-password" className="mt-4 block text-[15px] font-semibold">Password</label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-4 text-[14px] outline-none placeholder:text-[#C5CAD1]"
        />
        <FieldError message={passwordError} />
        <label htmlFor="signup-confirm" className="mt-4 block text-[15px] font-semibold">Confirm password</label>
        <input
          id="signup-confirm"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Enter your password"
          autoComplete="new-password"
          className="mt-2 h-12 w-full rounded-[10px] border border-[#E6E8EC] bg-white px-4 text-[14px] outline-none placeholder:text-[#C5CAD1]"
        />
        <FieldError message={signup.error && !passwordError ? signup.error.message : undefined} />
        {/* the verification token is single-use and expires 15 minutes after the OTP step */}
        {signup.error?.error.code === 'OTP_INVALID' || signup.error?.error.code === 'OTP_EXPIRED' ? (
          <Link to="/signup/phone" className="mt-1 block text-[12px] font-medium text-[#2F6BFF]">
            Verify your phone again
          </Link>
        ) : null}
        <button
          type="submit"
          disabled={signup.busy || !password || !confirm}
          className="mt-8 h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-medium text-white disabled:opacity-60"
        >
          {signup.busy ? 'Creating account…' : 'Continue'}
        </button>
      </form>
    </AuthScreen>
  )
}
