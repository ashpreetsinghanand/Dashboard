import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
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
} from './Icons'

const nav = [
  { label: 'Home', icon: HomeIcon, to: '/dashboard' },
  { label: 'Store', icon: StoreIcon, to: '/store' },
  { label: 'Get Loan', icon: LoanIcon, to: '' },
  { label: 'Trade', icon: TradeIcon, to: '/trade/enwr' },
  { label: 'Marketplace', icon: MarketIcon, to: '/marketplace' },
]

const storeLinks = [
  { label: 'Find Warehouse', to: '/store' },
  { label: 'Booking Request', to: '/store/booking' },
  { label: 'Storage Invoice', to: '/store/invoice' },
]

const tradeLinks = [
  { label: 'My eNWR', to: '/trade/enwr', icon: <SearchMini /> },
  { label: 'My Listing', to: '/trade/listing', icon: <RowsMini /> },
  { label: 'My Bid', to: '/trade/bid', icon: <DocMini /> },
  { label: 'Trade History', to: '/trade/history', icon: <ClockMini /> },
]

export type ShellSection = 'home' | 'store' | 'marketplace' | 'trade'
export type StorePage = 'Find Warehouse' | 'Booking Request' | 'Storage Invoice'
export type TradePage = 'My eNWR' | 'My Listing' | 'My Bid' | 'Trade History'

const navLower = [
  { label: 'My Loans', icon: SackIcon },
  { label: 'Price Alerts', icon: BellIcon },
  { label: 'Analytics', icon: ChartIcon },
  { label: 'Message', icon: MailIcon },
  { label: 'Setting', icon: GearIcon },
]

export function DashboardShell({
  section,
  storePage = 'Find Warehouse',
  tradePage = 'My eNWR',
  children,
}: {
  section: ShellSection
  storePage?: StorePage
  tradePage?: TradePage
  children: ReactNode
}) {
  const aside = (
        <aside className="sticky top-[60px] flex h-[calc(100vh-60px)] w-[200px] shrink-0 flex-col overflow-y-auto bg-white px-5 pt-5 pb-[19px]">
          <nav className="grid">
            {nav.map((item) => {
              const active =
                (section === 'home' && item.label === 'Home') ||
                (section === 'store' && item.label === 'Store') ||
                (section === 'marketplace' && item.label === 'Marketplace') ||
                (section === 'trade' && item.label === 'Trade')
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
                    <Submenu links={tradeLinks} current={tradePage} />
                  )}
                </Fragment>
              )
            })}
          </nav>
          <nav className={`${section === 'store' || section === 'trade' ? 'mt-8' : 'mt-[121px]'} grid`}>
            {navLower.map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex h-10 items-center gap-[15px] rounded-[8px] px-2.5 text-left text-[14px] leading-[17px] text-[#344054]"
              >
                <item.icon className="size-5 shrink-0 text-[#667085]" />
                {item.label}
              </button>
            ))}
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
      <div className="mx-auto min-h-screen w-[1440px] bg-[#F4F7FB]">
        <AppTopBar />
        <div className="flex min-h-[calc(100vh-60px)]">
          {aside}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

function AppTopBar() {
  const links = [
    { label: 'Store', to: '/store' },
    { label: 'Get Loan', to: '' },
    { label: 'Trade', to: '/trade/enwr' },
    { label: 'Marketplace', to: '/marketplace' },
  ]
  return (
    <header className="sticky top-0 z-20 flex h-[60px] items-center bg-white pr-5">
      <div className="w-[200px] shrink-0" />
      <label className="ml-5 flex h-[35px] w-[520px] items-center gap-2 rounded-[8px] border border-[#E6E8EC] bg-white px-2.5">
        <SearchMini className="size-5 text-[#98A2B3]" />
        <input
          aria-label="Search Commodities, markets, warehouses"
          placeholder="Search Commodities, markets, warehouses..."
          className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#98A2B3]"
        />
      </label>
      <nav className="ml-[30px] flex items-center gap-[30px]">
        {links.map((link) =>
          link.to ? (
            <Link key={link.label} to={link.to} className="text-[14px] leading-[17px] font-medium text-[#344054]">
              {link.label}
            </Link>
          ) : (
            <button key={link.label} type="button" className="text-[14px] leading-[17px] font-medium text-[#344054]">
              {link.label}
            </button>
          ),
        )}
      </nav>
      <div className="ml-auto flex items-center gap-2.5">
        <img src="/assets/suraj.png" alt="" className="size-10 rounded-full object-cover" />
        <span>
          <span className="block text-[14px] leading-[19px] font-semibold">Suraj Kumar</span>
          <span className="block text-[12px] leading-[15px] text-[#667085]">Farmer</span>
        </span>
        <svg viewBox="0 0 20 20" className="size-4 text-[#667085]" aria-hidden="true">
          <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
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
