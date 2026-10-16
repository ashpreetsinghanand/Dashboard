import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthScreen } from '../components/AuthScreen'

export function PasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    navigate('/dashboard')
  }

  return (
    <AuthScreen
      filled={3}
      title="Powering Agriculture Markets"
      subtitle="Buy, sell and trade commodities with verified partners."
    >
      <form
        onSubmit={submit}
        className="mt-[30px] h-[400px] w-[350px] rounded-[16px] bg-white px-[15px] pt-[54px] shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
      >
        <h2 className="text-center text-[24px] leading-none font-bold">Create Password</h2>
        <label className="mt-6 block text-[15px] font-semibold">Password</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Text your password"
          className="mt-2 h-12 w-full rounded-[10px] border border-[#E6E8EC] bg-[#F7F8FA] px-4 text-[14px] outline-none placeholder:text-[#C5CAD1]"
        />
        <label className="mt-4 block text-[16px] font-semibold">Confirm password</label>
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Text your password"
          className="mt-2 h-12 w-full rounded-[10px] border border-[#E6E8EC] bg-white px-4 text-[14px] outline-none placeholder:text-[#C5CAD1]"
        />
        <button
          type="submit"
          className="mt-8 h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-medium text-white"
        >
          Continue
        </button>
      </form>
    </AuthScreen>
  )
}
