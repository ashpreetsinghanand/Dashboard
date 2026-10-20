import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { InsightType, Role } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { DashboardShell } from '../components/DashboardShell'
import { AlertIcon, CloudMiniIcon, DocIcon, GrainIcon, PinIcon, RepayIcon, TrendIcon } from '../components/Icons'
import { ErrorBanner } from '../components/ui'
import { money, pct, perKg, statValue } from '../lib/format'
import { useApi } from '../lib/useApi'

const activityIcons: Record<string, typeof GrainIcon> = {
  storedProduce: GrainIcon,
  holdings: GrainIcon,
  totalCapacity: GrainIcon,
  occupancy: GrainIcon,
  activeLoan: DocIcon,
  pendingInspections: DocIcon,
  totalSales: TrendIcon,
  totalPurchases: TrendIcon,
  collected: TrendIcon,
  pendingRepayment: RepayIcon,
  unpaidStorage: RepayIcon,
  outstanding: RepayIcon,
}

const TRADERS: Role[] = ['FARMER', 'MERCHANT']

const actions: { title: string; copy: string; image: string; bg: string; to: string; roles: Role[] }[] = [
  {
    title: 'Store',
    copy: 'Store your produce, access finance, and get better prices.',
    image: '/assets/icon-store.png',
    bg: '#E7F6EE',
    to: '/store',
    roles: TRADERS,
  },
  {
    title: 'Get Loan',
    copy: 'Access quick and flexible financing.',
    image: '/assets/icon-getloan.png',
    bg: '#EAF3FF',
    to: '/trade/enwr',
    roles: TRADERS,
  },
  {
    title: 'Buy Or Sell',
    copy: 'Trade directly with verified buyers and sellers.',
    image: '/assets/icon-trade.png',
    bg: '#FFF6DE',
    to: '/trade/enwr',
    roles: TRADERS,
  },
  {
    title: 'Repay Loan',
    copy: 'Manage and repay your loans easily.',
    image: '/assets/icon-repay.png',
    bg: '#F3E8FF',
    to: '/trade/loans',
    roles: TRADERS,
  },
  {
    title: 'My Warehouses',
    copy: 'Manage capacity, bookings and stored receipts.',
    image: '/assets/icon-store.png',
    bg: '#E7F6EE',
    to: '/owner/warehouses',
    roles: ['WAREHOUSE_OWNER'],
  },
  {
    title: 'Inspections',
    copy: 'Inspect receipts and audit warehouses.',
    image: '/assets/shield.png',
    bg: '#EAF3FF',
    to: '/audit/inspections',
    roles: ['AUDITOR'],
  },
  {
    title: 'Marketplace',
    copy: 'See listed lots and live commodity prices.',
    image: '/assets/icon-trade.png',
    bg: '#FFF6DE',
    to: '/marketplace',
    roles: ['WAREHOUSE_OWNER', 'AUDITOR'],
  },
]

const insightTabs: { type: InsightType; label: string; empty: string }[] = [
  { type: 'GAINERS', label: 'Top Gainers', empty: 'No gainers today.' },
  { type: 'LOSERS', label: 'Top Loser', empty: 'No losers today.' },
  { type: 'WATCHLIST', label: 'Watchlist', empty: 'Your watchlist is empty.' },
]

export function DashboardPage() {
  const { user } = useAuth()
  const { data, loading, error, reload } = useApi(() => api.dashboard(), [])
  const [tab, setTab] = useState<InsightType>('GAINERS')
  const insights = useApi(() => api.market.insights(tab), [tab])
  const currency = data?.currency ?? 'INR'
  const visibleActions = actions.filter((action) => user && action.roles.includes(user.role))

  return (
    <DashboardShell section="home">
        <main className="min-w-0 flex-1 px-5 pt-5 pb-8">
          <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-5">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-[24px] leading-[29px] font-bold">
                    Good Morning{data ? `, ${data.displayName}` : ''}
                  </h1>
                  <p className="mt-[10px] text-[14px] leading-[19px] text-[#667085]">
                    Here&apos;s what&apos;s happening with your farm today.
                  </p>
                </div>
                {data?.location ? (
                  <button type="button" className="mt-1 flex items-center gap-1.5 text-[14px] leading-[17px] text-[#344054]">
                    <PinIcon className="size-3.5 text-[#1F8955]" />
                    {data.location}
                    <span className="text-[10px] text-[#667085]">▾</span>
                  </button>
                ) : null}
              </div>
              {error ? (
                <div className="mt-4">
                  <ErrorBanner error={error} onRetry={reload} />
                </div>
              ) : null}

              <div className="mt-5 grid grid-cols-[1fr_1fr_1.36fr] gap-5">
                <article className="flex h-[200px] flex-col rounded-[16px] bg-white px-[15px] pt-[15px] pb-4">
                  <p className="flex items-center gap-2 text-[15px] leading-[19px] font-semibold">
                    <CloudMiniIcon className="size-[15px] text-[#7CC4F0]" />
                    Weather In Delhi
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <img src="/assets/cloud.png" alt="" className="size-[50px] object-contain" />
                    <div>
                      <p className="text-[28px] leading-none font-bold">23°C</p>
                      <p className="mt-2 text-[13px] leading-[15px] text-[#667085]">Partly Cloud</p>
                    </div>
                  </div>
                  <p className="mt-auto text-[13px] leading-[15px] text-[#667085]">
                    Humidity 78% <span className="mx-1 text-[#D0D5DD]">|</span> Wind 8 Km/h
                  </p>
                </article>
                <article className="flex h-[200px] flex-col rounded-[16px] bg-[#FFF4EC] px-[15px] pt-[15px] pb-4">
                  <p className="flex items-center gap-2 text-[15px] leading-[19px] font-semibold text-[#F97316]">
                    <AlertIcon className="size-[15px]" />
                    Weather Alert
                  </p>
                  <p className="mt-4 text-[14px] leading-5 text-[#667085]">
                    Light rain expected in your area tomorrow. Consider covering stored produce.
                  </p>
                  <button type="button" className="mt-auto flex items-center gap-2 text-[13px] leading-[15px] font-medium text-[#1F8955]">
                    View Details <span aria-hidden="true">→</span>
                  </button>
                </article>
                <article className="relative h-[200px] overflow-hidden rounded-[16px]">
                  <img src="/assets/farmer-field.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />
                  <div className="relative px-[15px] pt-[59px]">
                    <p className="text-[17px] leading-[21px] font-medium text-white">
                      Better Storage
                      <br />
                      Better Prices
                      <br />
                      A Brighter Tomorrow
                    </p>
                    <span className="mt-2 block h-px w-14 bg-white" />
                  </div>
                </article>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-5">
                {visibleActions.map((action) => {
                  const className = 'flex h-[205px] flex-col items-center rounded-[16px] px-4 pt-3 text-center'
                  const inner = (
                    <>
                      <img src={action.image} alt="" className="size-[100px] object-contain" />
                      <p className="text-[15px] font-semibold">{action.title}</p>
                      <p className="mt-1 text-[12px] leading-4 text-[#667085]">{action.copy}</p>
                      <span className="mt-auto mb-3 grid size-5 place-items-center rounded-full bg-white text-[12px] text-[#1F8955]">
                        →
                      </span>
                    </>
                  )
                  return (
                    <Link key={action.title} to={action.to} className={className} style={{ background: action.bg }}>
                      {inner}
                    </Link>
                  )
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <h2 className="text-[24px] font-bold">Market Prices</h2>
                <Link to="/marketplace" className="text-[13px] font-medium text-[#1F8955]">
                  View Details →
                </Link>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-5">
                {data?.marketPrices.map((price) => (
                  <article key={price.commodity} className="overflow-hidden rounded-[14px] bg-white shadow-[0_6px_16px_rgba(16,24,40,0.05)]">
                    <div className="h-[159px] overflow-hidden">
                      <img src={price.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[15px] font-semibold">{price.commodity}</p>
                      <p className="text-[12px] text-[#98A2B3]">{price.grade}</p>
                      <p className="mt-1 text-[15px] font-semibold text-[#1F8955]">{perKg(price.pricePerKg, currency)}</p>
                      <p className="text-[11px] text-[#98A2B3]">Best Market</p>
                      <p className="text-[14px]">{price.bestMarket}</p>
                    </div>
                  </article>
                ))}
              </div>
              {loading && !data ? <p className="mt-3 text-[14px] text-[#667085]">Loading prices…</p> : null}
              {data && data.marketPrices.length === 0 ? (
                <p className="mt-3 text-[14px] text-[#667085]">No market prices available.</p>
              ) : null}
            </div>

            <aside className="grid grid-cols-1 content-start gap-5">
              <article className="min-h-[278px] rounded-[16px] bg-white px-[15px] pt-[15px]">
                <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-2.5">
                  <h2 className="text-[20px] leading-[29px] font-bold">Your Activity</h2>
                  <button type="button" className="flex items-center gap-1 text-[13px] leading-[15px] text-[#1F8955]">
                    View All <span aria-hidden="true">→</span>
                  </button>
                </div>
                {loading && !data ? <p className="py-4 text-[14px] text-[#667085]">Loading…</p> : null}
                {data && data.activity.length === 0 ? <p className="py-4 text-[14px] text-[#667085]">No activity yet.</p> : null}
                {data?.activity.map((tile) => {
                  const Icon = activityIcons[tile.key] ?? DocIcon
                  return (
                    <div
                      key={tile.key}
                      title={tile.note ?? undefined}
                      className="flex min-h-[50px] items-center justify-between gap-2 border-b border-[#F2F4F7] py-1.5 text-[14px] last:border-0"
                    >
                      <span className="flex min-w-0 items-center gap-2.5 leading-[17px] text-[#667085]">
                        <span className="grid size-[30px] shrink-0 place-items-center rounded-[8px] bg-[#F4F7FB] text-[#667085]">
                          <Icon className="size-4" />
                        </span>
                        {tile.label}
                      </span>
                      <span className="shrink-0 font-semibold text-[#1E1E1E]">{statValue(tile, currency)}</span>
                    </div>
                  )
                })}
              </article>

              <article className="rounded-[16px] bg-white px-[15px] pt-[15px] pb-2">
                <h2 className="border-b border-[#F2F4F7] pb-2.5 text-[20px] leading-[29px] font-bold">To-do</h2>
                {loading && !data ? <p className="py-4 text-[14px] text-[#667085]">Loading…</p> : null}
                {data && data.tasks.length === 0 ? (
                  <p className="py-4 text-[14px] text-[#667085]">You&apos;re all caught up.</p>
                ) : null}
                {data?.tasks.map((task, index) => (
                  // ids are 0 for aggregate tasks, so the index keeps keys unique
                  <Link
                    key={`${task.type}-${task.id}-${index}`}
                    to={task.route}
                    className="flex items-center justify-between gap-2 border-b border-[#F2F4F7] py-2.5 text-[14px] last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#1E1E1E]">{task.title}</span>
                      <span className="block truncate text-[12px] text-[#667085]">{task.subtitle}</span>
                    </span>
                    <span aria-hidden="true" className="text-[#1F8955]">→</span>
                  </Link>
                ))}
              </article>

              <article className="rounded-[16px] bg-white p-4">
                <h2 className="text-[20px] font-bold">Market Insights</h2>
                <div className="mt-3 flex gap-2 text-[12px]" role="tablist">
                  {insightTabs.map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      role="tab"
                      aria-selected={tab === item.type}
                      onClick={() => setTab(item.type)}
                      className={`rounded-full px-3 py-1 ${
                        tab === item.type ? 'bg-[#1F8955] text-white' : 'bg-[#F2F4F7] text-[#667085]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid gap-2">
                  {insights.error ? <ErrorBanner error={insights.error} onRetry={insights.reload} /> : null}
                  {insights.loading && !insights.data ? <p className="text-[13px] text-[#667085]">Loading…</p> : null}
                  {insights.data && insights.data.length === 0 ? (
                    <p className="text-[13px] text-[#667085]">{insightTabs.find((item) => item.type === tab)?.empty}</p>
                  ) : null}
                  {insights.data?.map((price) => (
                    <div key={price.commodity} className="flex items-center gap-2 text-[13px]">
                      <img src={price.imageUrl} alt="" className="size-[30px] rounded-[6px] object-cover" />
                      <span className="min-w-0 flex-1 truncate">{price.commodity}</span>
                      <span>{money(price.pricePerKg, currency)}</span>
                      <span className={`w-14 text-right ${price.changePct < 0 ? 'text-[#D92D20]' : 'text-[#1F8955]'}`}>
                        {pct(price.changePct)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="relative h-[217px] overflow-hidden rounded-[16px]">
                <img src="/assets/warehouse-card.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />
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
