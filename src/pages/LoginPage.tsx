import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

export function LoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (phone) sessionStorage.setItem('krsi-phone', phone)
    navigate('/dashboard')
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
            <h2 className="text-center text-[24px] leading-[29px] font-bold">Sign In</h2>
            <p className="mx-auto mt-3 w-[320px] text-center text-[14px] leading-[19px] text-[#9AA0A6]">
              Enter your phone number and password to continue with KRSI.
            </p>

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

            <label className="mt-4 block text-[15px] font-semibold">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Text your password"
              aria-label="Password"
              className="mt-2 h-12 w-full rounded-[10px] border border-[#E6E8EC] bg-white px-4 text-[14px] outline-none placeholder:text-[#C5CAD1]"
            />

            <button
              type="submit"
              className="mt-4 h-12 w-full rounded-[8px] bg-[#1F8955] text-[16px] font-medium text-white"
            >
              Sign In
            </button>

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
          </form>
        </div>
      </div>
    </div>
  )
}
