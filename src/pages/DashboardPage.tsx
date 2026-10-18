import { Link } from 'react-router-dom'
import { DashboardShell } from '../components/DashboardShell'
import { AlertIcon, CloudMiniIcon, DocIcon, GrainIcon, PinIcon, RepayIcon, TrendIcon } from '../components/Icons'

const activity = [
  { label: 'Stored Produce', value: '24.5 MT', icon: GrainIcon },
  { label: 'Active Loan', value: '$10000', icon: DocIcon },
  { label: 'Total Sales', value: '$100000', icon: TrendIcon },
  { label: 'Pending Repayment', value: '$500', icon: RepayIcon },
]

const actions: { title: string; copy: string; image: string; bg: string; to?: string }[] = [
  {
    title: 'Store',
    copy: 'Store your produce, access finance, and get better prices.',
    image: '/assets/icon-store.png',
    bg: '#E7F6EE',
    to: '/store',
  },
  {
    title: 'Get Loan',
    copy: 'Access quick and flexible financing.',
    image: '/assets/icon-getloan.png',
    bg: '#EAF3FF',
  },
  {
    title: 'Buy Or Sell',
    copy: 'Trade directly with verified buyers and sellers.',
    image: '/assets/icon-trade.png',
    bg: '#FFF6DE',
    to: '/trade/enwr',
  },
  {
    title: 'Repay Loan',
    copy: 'Manage and repay your loans easily.',
    image: '/assets/icon-repay.png',
    bg: '#F3E8FF',
  },
]

const prices = [
  ['Coffee', 'Cherry', '$25.00/KG', 'Chikmangalur', '/assets/coffee.png'],
  ['Turmeric', 'Raw', '$30.00/KG', 'Panniyur', '/assets/turmeric.png'],
  ['Cumin', 'Raw', '$14.00/KG', 'Jaipur', '/assets/cumin.jpg'],
  ['Cardamum', 'Raw', '$120.00/KG', 'Mudigere', '/assets/cardamom.jpg'],
] as const

const insights = [
  ['Coffee', '$25.00', '+2.4%', '/assets/coffee.png'],
  ['Turmeric', '$30.00', '+1.8%', '/assets/turmeric.png'],
  ['Cardamum', '$120.00', '+0.1%', '/assets/cardamom.jpg'],
  ['Black Pepper', '$14.63', '+2.5%', '/assets/pepper.jpg'],
  ['Clove', '$95.00', '+0.5%', '/assets/clove.png'],
] as const

export function DashboardPage() {
  return (
    <DashboardShell section="home">
        <main className="min-w-0 flex-1 px-5 pt-5 pb-8">
          <div className="grid w-[1200px] grid-cols-[880px_300px] gap-5">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-[24px] leading-[29px] font-bold">Good Morning, Suraj</h1>
                  <p className="mt-[10px] text-[14px] leading-[19px] text-[#667085]">
                    Here&apos;s what&apos;s happening with your farm today.
                  </p>
                </div>
                <button type="button" className="mt-1 flex items-center gap-1.5 text-[14px] leading-[17px] text-[#344054]">
                  <PinIcon className="size-3.5 text-[#1F8955]" />
                  Dichaon Kalan
                  <span className="text-[10px] text-[#667085]">▾</span>
                </button>
              </div>

              <div className="mt-5 grid grid-cols-[250px_250px_340px] gap-5">
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
                  <div className="relative max-w-[196px] px-[15px] pt-[59px]">
                    <p className="text-[20px] leading-6 font-semibold text-white">
                      Better Storage Better Prices A Brighter Tomorrow
                    </p>
                    <span className="mt-2 block h-px w-14 bg-white" />
                  </div>
                </article>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-5">
                {actions.map((action) => {
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
                  return action.to ? (
                    <Link key={action.title} to={action.to} className={className} style={{ background: action.bg }}>
                      {inner}
                    </Link>
                  ) : (
                    <article key={action.title} className={className} style={{ background: action.bg }}>
                      {inner}
                    </article>
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
                {prices.map(([name, grade, price, market, image]) => (
                  <article key={name} className="overflow-hidden rounded-[14px] bg-white shadow-[0_6px_16px_rgba(16,24,40,0.05)]">
                    <div className="h-[159px] overflow-hidden">
                      <img src={image} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-[15px] font-semibold">{name}</p>
                      <p className="text-[12px] text-[#98A2B3]">{grade}</p>
                      <p className="mt-1 text-[15px] font-semibold text-[#1F8955]">{price}</p>
                      <p className="text-[11px] text-[#98A2B3]">Best Market</p>
                      <p className="text-[14px]">{market}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="grid content-start gap-5">
              <article className="h-[278px] rounded-[16px] bg-white px-[15px] pt-[15px]">
                <div className="flex items-center justify-between border-b border-[#F2F4F7] pb-2.5">
                  <h2 className="text-[20px] leading-[29px] font-bold">Your Activity</h2>
                  <button type="button" className="flex items-center gap-1 text-[13px] leading-[15px] text-[#1F8955]">
                    View All <span aria-hidden="true">→</span>
                  </button>
                </div>
                {activity.map((item) => (
                  <div
                    key={item.label}
                    className="flex h-[50px] items-center justify-between border-b border-[#F2F4F7] text-[14px] last:border-0"
                  >
                    <span className="flex items-center gap-2.5 text-[#667085]">
                      <span className="grid size-[30px] place-items-center rounded-[8px] bg-[#F4F7FB] text-[#667085]">
                        <item.icon className="size-4" />
                      </span>
                      {item.label}
                    </span>
                    <span className="font-semibold text-[#1E1E1E]">{item.value}</span>
                  </div>
                ))}
              </article>

              <article className="rounded-[16px] bg-white p-4">
                <h2 className="text-[20px] font-bold">Market Insights</h2>
                <div className="mt-3 flex gap-2 text-[12px]">
                  <span className="rounded-full bg-[#1F8955] px-3 py-1 text-white">Top Gainers</span>
                  <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-[#667085]">Top Loser</span>
                  <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-[#667085]">Watchlist</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {insights.map(([name, price, change, image]) => (
                    <div key={name} className="flex items-center gap-2 text-[13px]">
                      <img src={image} alt="" className="size-[30px] rounded-[6px] object-cover" />
                      <span className="flex-1">{name}</span>
                      <span>{price}</span>
                      <span className="w-12 text-right text-[#1F8955]">{change}</span>
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
