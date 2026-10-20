import { Fragment, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import {
  BellIcon,
  ChartIcon,
  GearIcon,
  HeadsetIcon,
  HomeIcon,
  LoanIcon,
  MailIcon,
  MarketIcon,
  SackIcon,
  StoreIcon,
  TradeIcon,
  WarehouseIcon,
  ShieldIcon,
} from './Icons'

const TRADERS: Role[] = ['FARMER', 'MERCHANT']

// `roles` limits who sees an item (section 5 of the backend UI guide); no `roles` means everyone.
const nav: { label: string; icon: typeof HomeIcon; to: string; roles?: Role[] }[] = [
  { label: 'Home', icon: HomeIcon, to: '/dashboard' },
  { label: 'Store', icon: StoreIcon, to: '/store' },
  { label: 'Get Loan', icon: LoanIcon, to: '/trade/enwr', roles: TRADERS },
  { label: 'Trade', icon: TradeIcon, to: '/trade/enwr', roles: TRADERS },
  { label: 'My Warehouses', icon: WarehouseIcon, to: '/owner/warehouses', roles: ['WAREHOUSE_OWNER'] },
  { label: 'Audit', icon: ShieldIcon, to: '/audit/inspections', roles: ['AUDITOR'] },
  { label: 'Marketplace', icon: MarketIcon, to: '/marketplace' },
]

const storeLinks = [
  { label: 'Find Warehouse', to: '/store' },
  { label: 'Booking Request', to: '/store/booking' },
  { label: 'Storage Invoice', to: '/store/invoice' },
]

const tradeLinks: { label: string; to: string; icon: ReactNode; roles?: Role[] }[] = [
  { label: 'My eNWR', to: '/trade/enwr', icon: <SearchMini /> },
  { label: 'My Listing', to: '/trade/listing', icon: <RowsMini /> },
  { label: 'My Bid', to: '/trade/bid', icon: <DocMini />, roles: ['MERCHANT'] },
  { label: 'Trade History', to: '/trade/history', icon: <ClockMini /> },
]

const ownerLinks = [
  { label: 'My Warehouses', to: '/owner/warehouses' },
  { label: 'Stored Receipts', to: '/owner/receipts' },
]

const auditLinks = [
  { label: 'Inspections', to: '/audit/inspections' },
  { label: 'Warehouse Audits', to: '/audit/warehouses' },
  { label: 'Ledger', to: '/audit/ledger' },
]

export type ShellSection = 'home' | 'store' | 'marketplace' | 'trade' | 'owner' | 'audit'
export type StorePage = 'Find Warehouse' | 'Booking Request' | 'Storage Invoice'
export type TradePage = 'My eNWR' | 'My Listing' | 'My Bid' | 'Trade History' | 'My Loans'
export type OwnerPage = 'My Warehouses' | 'Stored Receipts'
export type AuditPage = 'Inspections' | 'Warehouse Audits' | 'Ledger'

const navLower: { label: string; icon: typeof HomeIcon; to?: string; roles?: Role[] }[] = [
  { label: 'My Loans', icon: SackIcon, to: '/trade/loans', roles: TRADERS },
  { label: 'Price Alerts', icon: BellIcon },
  { label: 'Analytics', icon: ChartIcon },
  { label: 'Message', icon: MailIcon },
  { label: 'Setting', icon: GearIcon },
]

export function DashboardShell({
  section,
  storePage = 'Find Warehouse',
  tradePage = 'My eNWR',
  ownerPage = 'My Warehouses',
  auditPage = 'Inspections',
  children,
}: {
  section: ShellSection
  storePage?: StorePage
  tradePage?: TradePage
  ownerPage?: OwnerPage
  auditPage?: AuditPage
  children: ReactNode
}) {
  const { user } = useAuth()
  const can = (roles?: Role[]) => !roles || (!!user && roles.includes(user.role))
  const aside = (
        <aside className="sticky top-[60px] flex h-[calc(100vh-60px)] w-[200px] shrink-0 flex-col overflow-y-auto bg-white px-5 pt-5 pb-[19px]">
          <nav className="grid">
            {nav.filter((item) => can(item.roles)).map((item) => {
              const active =
                (section === 'home' && item.label === 'Home') ||
                (section === 'store' && item.label === 'Store') ||
                (section === 'marketplace' && item.label === 'Marketplace') ||
                (section === 'trade' && item.label === 'Trade') ||
                (section === 'owner' && item.label === 'My Warehouses') ||
                (section === 'audit' && item.label === 'Audit')
              const className = `relative flex h-10 items-center gap-[15px] rounded-[8px] px-2.5 text-left text-[14px] leading-[17px] ${
                active ? 'bg-[#E7F6EE] font-semibold text-[#1F8955]' : 'text-[#344054]'
              }`
              const body = (
                <>
                  {active && <span className="absolute top-1 left-0 h-8 w-0.5 bg-[#1F8955]" />}
                  <item.icon className="size-5 shrink-0" />
                  {item.label}
                </>
              )
              return (
                <Fragment key={item.label}>
                  {item.to ? (
                    <Link to={item.to} className={className}>
                      {body}
                    </Link>
                  ) : (
                    <button type="button" className={className}>
                      {body}
                    </button>
                  )}
                  {section === 'store' && item.label === 'Store' && (
                    <Submenu links={storeLinks} current={storePage} />
                  )}
                  {section === 'trade' && item.label === 'Trade' && (
                    <Submenu links={tradeLinks.filter((link) => can(link.roles))} current={tradePage} />
                  )}
                  {section === 'owner' && item.label === 'My Warehouses' && <Submenu links={ownerLinks} current={ownerPage} />}
                  {section === 'audit' && item.label === 'Audit' && <Submenu links={auditLinks} current={auditPage} />}
                </Fragment>
              )
            })}
          </nav>
          <nav className={`${section === 'home' || section === 'marketplace' ? 'mt-[121px]' : 'mt-8'} grid`}>
            {navLower.filter((item) => can(item.roles)).map((item) => {
              const className = `flex h-10 items-center gap-[15px] rounded-[8px] px-2.5 text-left text-[14px] leading-[17px] ${
                section === 'trade' && tradePage === item.label ? 'bg-[#E7F6EE] font-semibold text-[#1F8955]' : 'text-[#344054]'
              }`
              const body = (
                <>
                  <item.icon className="size-5 shrink-0 text-[#667085]" />
                  {item.label}
                </>
              )
              return item.to ? (
                <Link key={item.label} to={item.to} className={className}>
                  {body}
                </Link>
              ) : (
                <button key={item.label} type="button" className={className}>
                  {body}
                </button>
              )
            })}
          </nav>
          <div className="mx-0 mt-auto h-[150px] rounded-[12px] border border-[#E6E8EC] px-2.5 pt-[15px]">
            <div className="flex items-start gap-2">
              <HeadsetIcon className="mt-0.5 size-[22px] shrink-0 text-[#344054]" />
              <div>
                <p className="text-[14px] leading-[17px] font-semibold">Need Help?</p>
                <p className="mt-2 w-[102px] text-[12px] leading-[15px] text-[#667085]">
                  Our team in here to support you.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="mt-3 h-[30px] w-full rounded-[8px] border border-[#D0D5DD] text-[13px] leading-[17px]"
            >
              Contact Support
            </button>
          </div>
        </aside>
  )

  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <AppTopBar />
      <div className="flex min-h-[calc(100vh-60px)]">
        {aside}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}

function AppTopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const links: { label: string; to: string; roles?: Role[] }[] = [
    { label: 'Store', to: '/store' },
    { label: 'Get Loan', to: '/trade/enwr', roles: TRADERS },
    { label: 'Trade', to: '/trade/enwr', roles: TRADERS },
    { label: 'Marketplace', to: '/marketplace' },
  ]
  const visible = links.filter((link) => !link.roles || (!!user && link.roles.includes(user.role)))

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    navigate(q ? `/marketplace?q=${encodeURIComponent(q)}` : '/marketplace')
  }

  const initials = (user?.displayName ?? '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center bg-white pr-5">
      <div className="w-[200px] shrink-0" />
      <form onSubmit={search} className="ml-5 flex h-[35px] w-[520px] items-center gap-2 rounded-[8px] border border-[#E6E8EC] bg-white px-2.5">
        <SearchMini className="size-5 text-[#98A2B3]" />
        <input
          name="q"
          aria-label="Search Commodities, markets, warehouses"
          placeholder="Search Commodities, markets, warehouses..."
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#98A2B3]"
        />
      </form>
      <nav className="ml-[30px] flex items-center gap-[30px]">
        {visible.map((link) => (
          <Link key={link.label} to={link.to} className="text-[14px] leading-[17px] font-medium text-[#344054]">
            {link.label}
          </Link>
        ))}
      </nav>
      {user ? (
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className="flex items-center gap-2.5 text-left"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[#E7F6EE] text-[14px] font-semibold text-[#1F8955]">{initials}</span>
            <span>
              <span className="block text-[14px] leading-[19px] font-semibold">{user.displayName}</span>
              <span className="block text-[12px] leading-[15px] text-[#667085]">{user.categoryLabel}</span>
            </span>
            <svg viewBox="0 0 20 20" className="size-4 text-[#667085]" aria-hidden="true">
              <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-[180px] rounded-[10px] border border-[#E6E8EC] bg-white p-1 shadow-lg">
              <button
                type="button"
                onClick={logout}
                className="h-9 w-full rounded-[8px] px-3 text-left text-[14px] text-[#D92D20] hover:bg-[#FEF3F2]"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link to="/login" className="ml-auto rounded-[8px] bg-[#1F8955] px-4 py-2 text-[14px] font-medium text-white">
          Sign in
        </Link>
      )}
    </header>
  )
}

function Submenu({
  links,
  current,
}: {
  links: { label: string; to: string; icon?: ReactNode }[]
  current: string
}) {
  return (
    <div className="grid py-1 pl-6">
      {links.map((link) => {
        const active = link.label === current
        const className = link.icon
          ? `flex h-8 items-center gap-2 rounded-[8px] px-2 text-[13px] leading-[15px] ${
              active ? 'bg-[#E7F6EE] font-semibold text-[#1F8955]' : 'text-[#667085]'
            }`
          : `flex h-[26px] items-center rounded-[8px] px-2 text-left text-[13px] leading-[15px] ${
              active ? 'font-semibold text-[#1F8955]' : 'text-[#667085]'
            }`
        return (
          <Link key={link.label} to={link.to} className={className}>
            {link.icon}
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}

function SearchMini({ className = 'size-3.5 shrink-0' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function RowsMini() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function DocMini() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-hidden="true">
      <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 3.5V8h4M8.5 13h7M8.5 16.5h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function ClockMini() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8.5V12l2.5 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}
