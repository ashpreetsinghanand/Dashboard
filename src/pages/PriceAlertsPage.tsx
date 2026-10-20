import { useState } from 'react'
import { api } from '../api/endpoints'
import { DashboardShell } from '../components/DashboardShell'
import { ErrorBanner } from '../components/ui'
import { pct, perKg } from '../lib/format'
import { useAction, useApi } from '../lib/useApi'

/** Watchlist (PUT/DELETE /api/market/watchlist/{commodity}); watched commodities show under Market Insights > Watchlist. */
export function PriceAlertsPage() {
  const prices = useApi(() => api.market.prices(undefined, 50), [])
  const toggle = useAction((commodity: string, watched: boolean) => (watched ? api.market.unwatch(commodity) : api.market.watch(commodity)))
  const [category, setCategory] = useState('All')
  const all = prices.data ?? []
  const watched = all.filter((price) => price.watched)
  const categories = ['All', ...new Set(all.map((price) => price.category))]
  const shown = all.filter((price) => category === 'All' || price.category === category)

  async function flip(commodity: string, isWatched: boolean) {
    if (await toggle.run(commodity, isWatched)) prices.reload()
  }

  return (
    <DashboardShell section="alerts">
      <main className="min-w-0 flex-1 px-5 pt-[15px] pb-10">
        <h1 className="text-[24px] leading-[29px] font-bold">Price Alerts</h1>
        <p className="mt-2 text-[14px] text-[#667085]">Watch the commodities you trade. Their price moves appear in your Watchlist across the app.</p>

        {prices.error ? (
          <div className="mt-4">
            <ErrorBanner error={prices.error} onRetry={prices.reload} />
          </div>
        ) : null}
        {toggle.error ? (
          <div className="mt-4">
            <ErrorBanner error={toggle.error} />
          </div>
        ) : null}

        <section className="mt-5 rounded-[16px] bg-white p-5">
          <h2 className="text-[18px] font-bold">Your watchlist</h2>
          {prices.loading && !prices.data ? <p className="mt-3 text-[14px] text-[#667085]">Loading…</p> : null}
          {prices.data && watched.length === 0 ? (
            <p className="mt-3 text-[14px] text-[#667085]">You are not watching any commodity yet. Pick some below.</p>
          ) : null}
          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
            {watched.map((price) => (
              <article key={price.commodity} className="flex items-center gap-3 rounded-[12px] border border-[#E6E8EC] p-3">
                <img src={price.imageUrl} alt="" className="size-10 rounded-[8px] object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold">{price.commodity}</p>
                  <p className="text-[13px] text-[#667085]">
                    {perKg(price.pricePerKg)}{' '}
                    <span className={price.changePct < 0 ? 'text-[#D92D20]' : 'text-[#1F8955]'}>{pct(price.changePct)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={toggle.busy}
                  onClick={() => void flip(price.commodity, true)}
                  className="text-[12px] text-[#D92D20] disabled:opacity-50"
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-[16px] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[18px] font-bold">All commodities</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                  className={`h-8 rounded-full px-3 text-[13px] ${category === item ? 'bg-[#1F8955] text-white' : 'bg-[#F2F4F7] text-[#667085]'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr_auto] items-center gap-x-3 rounded-[8px] bg-[#F4F6F8] px-3 py-2.5 text-[13px] text-[#667085]">
            <span>Commodity</span>
            <span>Price</span>
            <span>Change</span>
            <span>Grade</span>
            <span>Best market</span>
            <span className="w-[90px]" />
          </div>
          {shown.map((price) => (
            <div key={price.commodity} className="grid grid-cols-[2fr_1fr_1fr_1fr_1.4fr_auto] items-center gap-x-3 border-b border-[#F2F4F7] px-3 py-2.5 text-[14px] last:border-0">
              <span className="flex min-w-0 items-center gap-2 font-medium">
                <img src={price.imageUrl} alt="" className="size-8 rounded-[6px] object-cover" />
                <span className="truncate">{price.commodity}</span>
              </span>
              <span>{perKg(price.pricePerKg)}</span>
              <span className={price.changePct < 0 ? 'text-[#D92D20]' : 'text-[#1F8955]'}>{pct(price.changePct)}</span>
              <span>{price.grade}</span>
              <span className="truncate text-[#667085]">{price.bestMarket}</span>
              <button
                type="button"
                disabled={toggle.busy}
                aria-pressed={price.watched}
                onClick={() => void flip(price.commodity, price.watched)}
                className={`h-8 w-[90px] rounded-[8px] text-[13px] font-medium disabled:opacity-50 ${
                  price.watched ? 'border border-[#1F8955] text-[#1F8955]' : 'bg-[#1F8955] text-white'
                }`}
              >
                {price.watched ? '★ Watching' : '☆ Watch'}
              </button>
            </div>
          ))}
        </section>
      </main>
    </DashboardShell>
  )
}
