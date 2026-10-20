import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { extraTones } from '../lib/format'
import { DashboardShell, type AuditPage, type OwnerPage, type ShellSection, type StorePage, type TradePage } from './DashboardShell'

export function RequestLayout({
  section,
  storePage,
  tradePage,
  ownerPage,
  auditPage,
  crumb,
  title,
  subtitle,
  toolbar,
  children,
}: {
  section: ShellSection
  storePage?: StorePage
  tradePage?: TradePage
  ownerPage?: OwnerPage
  auditPage?: AuditPage
  crumb: string
  title: string
  subtitle: string
  toolbar?: ReactNode
  children: ReactNode
}) {
  return (
    <DashboardShell section={section} storePage={storePage} tradePage={tradePage} ownerPage={ownerPage} auditPage={auditPage}>
      <main className="min-w-0 flex-1 px-5 pt-[15px] pb-8">
        <div className="flex items-center gap-2 text-[14px] leading-[15px]">
          <Link to={crumbRoot[section]?.to ?? '/store'} className="text-[#667085]">
            {crumbRoot[section]?.label ?? 'Store'}
          </Link>
          <span className="text-[#98A2B3]">&gt;</span>
          <span className="font-semibold text-[#1F8955]">{crumb}</span>
        </div>
        <section className="relative mt-3 h-[150px] overflow-hidden rounded-[12px]">
          <img src="/assets/warehouse-card.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E4F38]/80 via-[#0E4F38]/55 to-[#0E4F38]/20" />
          <div className="relative px-[15px] pt-[15px] text-white">
            <h1 className="text-[24px] leading-[29px] font-bold">{title}</h1>
            <p className="mt-[10px] max-w-[520px] text-[14px] leading-[19px]">{subtitle}</p>
          </div>
        </section>
        {toolbar ? <div className="mt-[15px]">{toolbar}</div> : null}
        <div className={`${toolbar ? 'mt-3' : 'mt-[15px]'} grid grid-cols-[880px_300px] items-start gap-5`}>
          <div>{children}</div>
          <aside className="grid gap-4">
            <article className="rounded-[16px] bg-white px-4 pt-4 pb-4">
              <h2 className="text-[20px] leading-[29px] font-bold">Need Storage?</h2>
              <img src="/assets/warehouse.png" alt="" className="mt-2 size-[66px] rounded-[10px] object-cover" />
              <p className="mt-3 text-[13px] leading-[17px] text-[#667085]">
                Find verified warehouses across India and book storage fo your commodities.
              </p>
              <Link
                to="/store"
                className="mt-4 grid h-12 w-full place-items-center rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white"
              >
                Find Warehouse
              </Link>
            </article>
            <article className="relative h-[217px] overflow-hidden rounded-[16px]">
              <img src="/assets/warehouse-card.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <p className="relative max-w-[205px] px-[15px] pt-[23px] text-[18px] leading-6 font-semibold text-white">
                Verified Warehouses. Trusted Financing.
              </p>
            </article>
          </aside>
        </div>
      </main>
    </DashboardShell>
  )
}

const crumbRoot: Partial<Record<ShellSection, { label: string; to: string }>> = {
  store: { label: 'Store', to: '/store' },
  trade: { label: 'Trade', to: '/trade/enwr' },
  owner: { label: 'My Warehouses', to: '/owner/warehouses' },
  audit: { label: 'Audit', to: '/audit/inspections' },
}

const tones: Record<string, string> = {
  ...extraTones,
  Pending: 'bg-[#FFF6DE] text-[#B54708]',
  Accepted: 'bg-[#E7F6EE] text-[#1F8955]',
  Rejected: 'bg-[#FEE4E2] text-[#D92D20]',
  Paid: 'bg-[#E7F6EE] text-[#1F8955]',
  Active: 'bg-[#E7F6EE] text-[#1F8955]',
  Overdue: 'bg-[#FEE4E2] text-[#D92D20]',
  Draft: 'bg-[#F2F4F7] text-[#667085]',
  Cancelled: 'bg-[#F2F4F7] text-[#667085]',
}

export function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span className={`inline-grid h-[25px] min-w-[60px] place-items-center rounded-full px-2 text-[12px] leading-none font-medium ${tones[status] ?? 'bg-[#F2F4F7] text-[#667085]'} ${className}`}>
      {status}
    </span>
  )
}
