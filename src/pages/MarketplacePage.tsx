import { useMemo, useState, type ReactNode } from 'react'
import { DashboardShell } from '../components/DashboardShell'
import { DocIcon, GrainIcon, PinIcon, RepayIcon, TrendIcon } from '../components/Icons'

const chips = ['All', 'Grain', 'Pulses', 'Oilseeds', 'Spices', 'Coffee & Tea', 'Coffee & Tea']

const lots = [
  { id: 'c1', name: 'Coffee', image: '/assets/coffee.png', category: 'Coffee & Tea' },
  { id: 't1', name: 'Turmeric', image: '/assets/turmeric.png', category: 'Spices' },
  { id: 'g1', name: 'Turmeric', image: '/assets/cumin.jpg', category: 'Grain' },
  { id: 's1', name: 'Turmeric', image: '/assets/cardamom.jpg', category: 'Spices' },
  { id: 'c2', name: 'Coffee', image: '/assets/coffee.png', category: 'Coffee & Tea' },
  { id: 't2', name: 'Turmeric', image: '/assets/turmeric.png', category: 'Spices' },
  { id: 'g2', name: 'Turmeric', image: '/assets/cumin.jpg', category: 'Grain' },
  { id: 's2', name: 'Turmeric', image: '/assets/cardamom.jpg', category: 'Spices' },
]

const insights = [
  ['Coffee', '$25.00', '+2.4%', '/assets/coffee.png'],
  ['Turmeric', '$30.00', '+1.8%', '/assets/turmeric.png'],
  ['Cardamum', '$120.00', '+0.1%', '/assets/cardamom.jpg'],
  ['Black Pepper', '$14.63', '+2.5%', '/assets/pepper.jpg'],
  ['Clove', '$95.00', '+0.5%', '/assets/clove.png'],
] as const

const activity = [
  { label: 'Stored Produce', value: '24.5 MT', icon: GrainIcon },
  { label: 'Active Loan', value: '$10000', icon: DocIcon },
  { label: 'Total Sales', value: '$100000', icon: TrendIcon },
  { label: 'Pending Repayment', value: '$500', icon: RepayIcon },
]

const regions = ['All Region', 'Chikmagalur']
const grades = ['All Grades', 'Grade A']
const quantities = ['Any Quantity', '2500 MT', 'Under 1000 MT']
const sorts = ['Latest', 'Name', 'Price']

export function MarketplacePage() {
  const [query, setQuery] = useState('')
  const [chip, setChip] = useState(0)
  const [region, setRegion] = useState(regions[0])
  const [grade, setGrade] = useState(grades[0])
  const [quantity, setQuantity] = useState(quantities[0])
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [sort, setSort] = useState(sorts[0])
  const [layout, setLayout] = useState<'grid' | 'list'>('grid')
  const [insight, setInsight] = useState('Top Gainers')

  const results = useMemo(() => {
    const category = chips[chip]
    const text = query.trim().toLowerCase()
    const filtered = lots.filter((lot) => {
      const categoryOk = category === 'All' || lot.category === category
      const textOk = text === '' || `${lot.name} chikmagalur`.includes(text)
      const regionOk = region === 'All Region' || region === 'Chikmagalur'
      const gradeOk = grade === 'All Grades' || grade === 'Grade A'
      const quantityOk = quantity === 'Any Quantity' || quantity === '2500 MT'
      return categoryOk && textOk && regionOk && gradeOk && quantityOk
    })
    return filtered.sort((a, b) => (sort === 'Name' ? a.name.localeCompare(b.name) : 0))
  }, [chip, grade, quantity, query, region, sort])

  return (
    <DashboardShell section="marketplace">
      <main className="min-w-0 flex-1 px-5 pt-5 pb-5">
        <div className="grid grid-cols-[880px_300px] items-start gap-5">
          <section>
            <h1 className="text-[24px] leading-[29px] font-bold">Global Marketplace For Agricultural commodities</h1>
            <p className="mt-[10px] text-[14px] leading-[19px] text-[#98A2B3]">
              Discover verified produce from trusted sellers and warehouses.
            </p>

            <div className="relative mt-[15px] h-[150px] overflow-hidden rounded-[12px]">
              <img src="/assets/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
              <p className="relative max-w-[280px] px-4 pt-6 text-[18px] leading-[22px] font-semibold text-white">
                Trade with confidence
                <br />
                from farm to maket.
              </p>
            </div>

            <form
              className="mt-[15px] flex items-center gap-[10px]"
              onSubmit={(event) => {
                event.preventDefault()
              }}
            >
              <label className="flex h-[30px] min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-[#E6E8EC] bg-white px-3">
                <SearchIcon />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by commodity..."
                  aria-label="Search by commodity"
                  className="w-full bg-transparent text-[13px] text-[#1E1E1E] outline-none placeholder:text-[#98A2B3]"
                />
              </label>
              <button type="submit" className="h-[30px] w-[150px] shrink-0 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white">
                Search
              </button>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((label, index) => (
                <button
                  key={`${label}-${index}`}
                  type="button"
                  onClick={() => setChip(index)}
                  className={`h-[30px] rounded-full px-3.5 text-[13px] leading-none ${
                    chip === index
                      ? 'bg-[#E7F6EE] font-medium text-[#1F8955]'
                      : 'border border-[#E6E8EC] bg-white text-[#344054]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-2.5 flex items-center gap-2">
              <FilterSelect label="Region" value={region} options={regions} onChange={setRegion} icon={<PinIcon className="size-4 text-[#667085]" />} />
              <FilterSelect label="Quality Grade" value={grade} options={grades} onChange={setGrade} icon={<BadgeIcon />} />
              <FilterSelect label="Quantity" value={quantity} options={quantities} onChange={setQuantity} icon={<BoxesIcon />} />
              <button
                type="button"
                onClick={() => setVerifiedOnly((open) => !open)}
                className="flex h-10 items-center gap-2 rounded-[10px] border border-[#E6E8EC] bg-white px-2.5"
              >
                <span className={`relative h-4 w-7 shrink-0 rounded-full ${verifiedOnly ? 'bg-[#1F8955]' : 'bg-[#D0D5DD]'}`}>
                  <span className={`absolute top-0.5 size-3 rounded-full bg-white ${verifiedOnly ? 'right-0.5' : 'left-0.5'}`} />
                </span>
                <span className="text-left leading-none">
                  <span className="block text-[10px] text-[#98A2B3]">Warehouse Verified</span>
                  <span className="text-[12px] font-medium">{verifiedOnly ? 'Only' : 'Any'}</span>
                </span>
              </button>
              <FilterSelect label="Sort By" value={sort} options={sorts} onChange={setSort} icon={<SortIcon />} />
              <div className="ml-auto flex h-9 overflow-hidden rounded-[8px] border border-[#E6E8EC] bg-white">
                <button
                  type="button"
                  aria-label="Grid"
                  onClick={() => setLayout('grid')}
                  className={`grid w-9 place-items-center ${layout === 'grid' ? 'bg-[#1F8955] text-white' : 'text-[#667085]'}`}
                >
                  <GridIcon />
                </button>
                <button
                  type="button"
                  aria-label="List"
                  onClick={() => setLayout('list')}
                  className={`grid w-9 place-items-center ${layout === 'list' ? 'bg-[#1F8955] text-white' : 'text-[#667085]'}`}
                >
                  <ListIcon />
                </button>
              </div>
            </div>

            {results.length === 0 ? (
              <p className="mt-4 rounded-[12px] bg-white px-4 py-8 text-center text-[14px] text-[#667085]">
                No commodities match these filters.
              </p>
            ) : (
              <div className={layout === 'grid' ? 'mt-3 grid grid-cols-4 gap-3' : 'mt-3 grid gap-3'}>
                {results.map((lot) => (
                  <LotCard key={lot.id} lot={lot} layout={layout} />
                ))}
              </div>
            )}
          </section>

          <aside className="grid content-start gap-4">
            <article className="rounded-[16px] bg-white px-3.5 pt-3.5 pb-3">
              <h2 className="text-[18px] leading-6 font-bold">Market Insights</h2>
              <div className="mt-2 flex items-center gap-1 text-[12px]">
                {['Top Gainers', 'Top Loser', 'Watchlist'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setInsight(tab)}
                    className={
                      insight === tab
                        ? 'rounded-full bg-[#1F8955] px-2.5 py-1 text-white'
                        : 'px-2 py-1 text-[#667085]'
                    }
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid">
                {insights.map(([name, price, change, image]) => (
                  <div key={name} className="flex h-8 items-center gap-2 text-[13px]">
                    <img src={image} alt="" className="size-[26px] rounded-[6px] object-cover" />
                    <span className="flex-1 truncate">{name}</span>
                    <span>{price}</span>
                    <span className="w-12 text-right text-[#1F8955]">{change}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[16px] bg-white px-3.5 pt-3.5 pb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] leading-6 font-bold">Your Activity</h2>
                <button type="button" className="text-[12px] text-[#1F8955]">
                  View All <span aria-hidden="true">→</span>
                </button>
              </div>
              {activity.map((item) => (
                <div key={item.label} className="flex h-[42px] items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 text-[#667085]">
                    <span className="grid size-7 place-items-center rounded-[8px] bg-[#F4F7FB]">
                      <item.icon className="size-3.5" />
                    </span>
                    {item.label}
                  </span>
                  <span className="font-semibold">{item.value}</span>
                </div>
              ))}
            </article>

            <article className="relative h-[148px] overflow-hidden rounded-[16px]">
              <img src="/assets/warehouse-card.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
              <p className="relative max-w-[170px] px-4 pt-4 text-[16px] leading-5 font-semibold text-white">
                Verified Warehouses. Trusted Financing.
              </p>
            </article>
          </aside>
        </div>
      </main>
    </DashboardShell>
  )
}

function LotCard({
  lot,
  layout,
}: {
  lot: (typeof lots)[number]
  layout: 'grid' | 'list'
}) {
  const horizontal = layout === 'list'
  return (
    <article className={`overflow-hidden rounded-[12px] bg-white shadow-[0_4px_14px_rgba(16,24,40,0.05)] ${horizontal ? 'flex' : ''}`}>
      <div className={horizontal ? 'relative h-[124px] w-[180px] shrink-0 overflow-hidden' : 'relative h-[96px] overflow-hidden'}>
        <img src={lot.image} alt="" className="h-full w-full object-cover" />
      </div>
      <div className={`min-w-0 ${horizontal ? 'flex flex-1 flex-col justify-center px-4 py-3' : 'px-2.5 pt-1.5 pb-2.5'}`}>
        <p className="flex items-center gap-1 text-[10px] leading-3 text-[#98A2B3]">
          <PinIcon className="size-2.5 text-[#98A2B3]" />
          Chikmagalur
        </p>
        <p className="text-[14px] leading-4 font-semibold">{lot.name}</p>
        <p className="text-[13px] leading-4 font-semibold text-[#1F8955]">
          $250.00<span className="text-[11px] font-medium">/MT</span>
        </p>
        <div className="mt-1 grid grid-cols-3 text-[9px] leading-3 text-[#98A2B3]">
          <span>
            Available
            <span className="mt-0.5 block text-[10px] text-[#344054]">2500 MT</span>
          </span>
          <span>
            Quality
            <span className="mt-0.5 block text-[10px] text-[#344054]">Grade A</span>
          </span>
          <span>
            Min. Order
            <span className="mt-0.5 block text-[10px] text-[#344054]">100 MT</span>
          </span>
        </div>
        <div className={`flex gap-1 ${horizontal ? 'mt-2 max-w-[280px]' : 'mt-2'}`}>
          <button type="button" className="h-[22px] shrink-0 rounded-[6px] border border-[#D0D5DD] px-1.5 text-[9px] leading-none whitespace-nowrap">
            View Details
          </button>
          <button type="button" className="h-[22px] min-w-0 flex-1 rounded-[6px] bg-[#1F8955] px-1 text-[9px] leading-none whitespace-nowrap text-white">
            Buy / Request Quote
          </button>
        </div>
      </div>
    </article>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  icon: ReactNode
}) {
  return (
    <label className="relative flex h-10 min-w-0 items-center gap-1.5 rounded-[10px] border border-[#E6E8EC] bg-white px-2">
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 leading-none">
        <span className="block text-[10px] text-[#98A2B3]">{label}</span>
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none bg-transparent pr-3 text-[12px] font-medium outline-none"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </span>
      <span className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[9px] text-[#667085]">▾</span>
    </label>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-[#98A2B3]" aria-hidden="true">
      <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function BadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-[#667085]" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function BoxesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-[#667085]" aria-hidden="true">
      <path d="M4 8h7v7H4zM13 8h7v7h-7zM8.5 4h7v4h-7z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 text-[#667085]" aria-hidden="true">
      <path d="M8 6v12M8 6 5 9M8 6l3 3M16 18V6M16 18l-3-3M16 18l3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" fill="currentColor" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
