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
  { label: 'Trade', icon: TradeIcon, to: '' },
  { label: 'Marketplace', icon: MarketIcon, to: '' },
]

const storeLinks = [
  { label: 'Find Warehouse', to: '/store' },
  { label: 'Booking Request', to: '' },
  { label: 'Storage Invoice', to: '' },
]

const navLower = [
  { label: 'My Loans', icon: SackIcon },
  { label: 'Price Alerts', icon: BellIcon },
  { label: 'Analytics', icon: ChartIcon },
  { label: 'Message', icon: MailIcon },
  { label: 'Setting', icon: GearIcon },
]

export function DashboardShell({
  section,
  children,
}: {
  section: 'home' | 'store'
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F4F7FB]">
      <div className="mx-auto flex min-h-screen w-[1440px] bg-[#F4F7FB]">
        <aside className="sticky top-0 flex h-screen w-[200px] shrink-0 flex-col overflow-y-auto bg-white px-5 pt-5 pb-[19px]">
          <nav className="grid">
            {nav.map((item) => {
              const active = section === 'home' ? item.label === 'Home' : item.label === 'Store'
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
                    <div className="grid py-1 pl-8">
                      {storeLinks.map((link) => {
                        const current = link.label === 'Find Warehouse'
                        const linkClass = `flex h-[26px] items-center rounded-[8px] px-2 text-left text-[13px] leading-[15px] ${
                          current ? 'font-semibold text-[#1F8955]' : 'text-[#667085]'
                        }`
                        return link.to ? (
                          <Link key={link.label} to={link.to} className={linkClass}>
                            {link.label}
                          </Link>
                        ) : (
                          <button key={link.label} type="button" className={linkClass}>
                            {link.label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </Fragment>
              )
            })}
          </nav>
          <nav className={`${section === 'store' ? 'mt-8' : 'mt-[121px]'} grid`}>
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
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
