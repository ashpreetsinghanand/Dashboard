import { useState } from 'react'
import { api } from '../api/endpoints'
import type { InsightType } from '../api/types'
import { money, pct } from '../lib/format'
import { useApi } from '../lib/useApi'
import { ErrorBanner } from './ui'

const insightTabs: [InsightType, string][] = [['GAINERS', 'Top Gainers'], ['LOSERS', 'Top Loser'], ['WATCHLIST', 'Watchlist']]

/** Right-hand column of the store pages: live Market Insights and the trusted-financing banner. */
export function MarketRail() {
  const [insight, setInsight] = useState<InsightType>('GAINERS')
  const insights = useApi(() => api.market.insights(insight), [insight])
  return (
    <aside className="grid grid-cols-1 content-start gap-4">
      <article className="rounded-[16px] bg-white px-[15px] pt-[15px] pb-4">
        <h2 className="text-[20px] leading-[29px] font-bold">Market Insights</h2>
        <div className="mt-3 flex gap-2 text-[12px]">
          {insightTabs.map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => setInsight(type)}
              className={`rounded-full px-3 py-1 ${insight === type ? 'bg-[#1F8955] text-white' : 'bg-[#F2F4F7] text-[#667085]'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2.5">
          {insights.error ? <ErrorBanner error={insights.error} onRetry={insights.reload} /> : null}
          {insights.loading && !insights.data ? <p className="text-[13px] text-[#667085]">Loading…</p> : null}
          {insights.data?.length === 0 ? <p className="text-[13px] text-[#667085]">Nothing to show yet.</p> : null}
          {insights.data?.map((item) => (
            <div key={item.commodity} className="flex items-center gap-2 text-[13px]">
              <img src={item.imageUrl} alt="" className="size-[30px] rounded-[6px] object-cover" />
              <span className="min-w-0 flex-1 truncate">{item.commodity}</span>
              <span>{money(item.pricePerKg)}</span>
              <span className={`w-12 text-right ${item.changePct < 0 ? 'text-[#D92D20]' : 'text-[#1F8955]'}`}>{pct(item.changePct)}</span>
            </div>
          ))}
        </div>
      </article>
      <article className="relative h-[217px] overflow-hidden rounded-[16px]">
        <img src="/assets/warehouse-card.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
        <p className="relative max-w-[205px] px-[15px] pt-[23px] text-[18px] leading-6 font-semibold text-white">
          Verified Warehouses. Trusted Financing.
        </p>
      </article>
    </aside>
  )
}
