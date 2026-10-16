import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthScreen } from '../components/AuthScreen'

export function OtpPage() {
  const navigate = useNavigate()
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [seconds, setSeconds] = useState(57)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  function update(index: number, value: string) {
    const next = value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((digit, digitIndex) => (digitIndex === index ? next : digit)))
    if (next && index < 5) inputs.current[index + 1]?.focus()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    navigate('/signup/password')
  }

  const clock = `00:${String(seconds).padStart(2, '0')}`

  return (
    <AuthScreen
      filled={3}
      title="Powering Agriculture Markets"
      subtitle="Buy, sell and trade commodities with verified partners."
    >
      <form
        onSubmit={submit}
        className="mt-[30px] flex h-[400px] w-[350px] flex-col rounded-[16px] bg-white px-[15px] pt-[15px] shadow-[0_10px_30px_rgba(16,24,40,0.06)]"
      >
        <h2 className="text-center text-[24px] leading-none font-bold">Verify OTP</h2>
        <p className="mx-auto mt-3 w-[320px] text-center text-[14px] leading-[19px] text-[#9AA0A6]">
          Enter your OTP which has been sent to your Phone No. and completely verify your account.
        </p>
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
              maxLength={1}
              className="size-[50px] rounded-[8px] border border-[#E4E7EC] text-center text-[18px] outline-none focus:border-[#1F8955]"
            />
          ))}
        </div>
        <p className="mt-[18px] text-center text-[14px] text-[#98A2B3]">
          A code has been sent to your phone
        </p>
        <p className="mt-1 text-center text-[16px] font-semibold">Resend in {clock}</p>
        <button
          type="submit"
          className="mt-3 h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-medium text-white"
        >
          Confirm
        </button>
      </form>
    </AuthScreen>
  )
}
