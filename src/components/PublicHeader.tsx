import { Link } from 'react-router-dom'

/** Green K mark with the dark "Krsi" wordmark, for white bars. */
export function KrsiLogo({ to }: { to: string }) {
  return (
    <Link to={to} aria-label="Krsi home" className="flex items-center gap-1.5">
      <img src="/assets/krsi-mark.png" alt="" className="size-6" />
      <span className="text-[22px] leading-none font-extrabold text-[#1E1E1E] italic">Krsi</span>
    </Link>
  )
}

/** White top bar of the signed-out pages (landing, sign in, sign up). */
export function PublicHeader({ active }: { active?: 'signin' | 'signup' }) {
  return (
    <header className="flex h-[60px] items-center justify-between bg-white px-10">
      <KrsiLogo to="/" />
      <nav className="flex items-center gap-10 text-[15px] text-[#1E1E1E]">
        <Link to="/store">Find Warehouse</Link>
        <Link to="/#about">About</Link>
        <Link to="/#contact">Contact Us</Link>
        <Link to="/login" className={active === 'signin' ? 'font-semibold text-[#0E4F38]' : ''}>
          Sign In
        </Link>
        <Link to="/signup" className="grid h-10 w-[90px] place-items-center rounded-[6px] bg-[#0E4F38] font-medium text-white">
          Sign Up
        </Link>
      </nav>
    </header>
  )
}
