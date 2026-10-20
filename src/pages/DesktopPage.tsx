import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../api/endpoints'
import { DiscordIcon, LinkedinIcon, TelegramIcon, XIcon } from '../components/Icons'
import { PublicHeader } from '../components/PublicHeader'
import { money, mt, pct, perKg, perMt } from '../lib/format'
import { useApi } from '../lib/useApi'

const supportEmail = 'support@krsi.com'

const trusts = [
  { title: 'Quality Verified', copy: 'Third party inspection', icon: 'quality-verified' },
  { title: 'Warehouse Backed', copy: 'WDRA registered', icon: 'warehouse-backed' },
  { title: 'Transparent Pricing', copy: 'Live Market Data', icon: 'transparent-pricing' },
  { title: 'Worldwide Reach', copy: 'From farm to global markets', icon: 'worldwide-reach' },
]

const heroPoints = [
  { label: 'Verified Inventory', icon: 'verified-inventory' },
  { label: 'Trusted Warehouses', icon: 'trusted-warehouses' },
  { label: 'Secure Payment', icon: 'secure-payment' },
  { label: 'Trade & Finance', icon: 'trade-finance' },
]

const contacts = [
  { icon: 'phone', title: '+91 98737373140', copy: 'Mon - Sat, 9:00 AM - 6:00 PM (IST)' },
  { icon: 'mail', title: supportEmail, copy: 'We typically respond within 24 hours' },
  { icon: 'location', title: 'Delhi , India', copy: 'Building a global agri marketplace' },
]

const subjects = ['Buying commodities', 'Selling or listing commodities', 'Warehouse storage', 'Financing', 'Partnerships', 'Other']

const footerLinks: [string, string[]][] = [
  ['Marketplace', ['Explore', 'Commodities', 'Auctions', 'Warehouses', 'Market Data']],
  ['Company', ['About', 'Careers', 'Blog', 'Contact', 'Partners']],
  ['Resources', ['Help Centre', 'Documentation', 'Market Insights', 'API', 'Terms & Privacy']],
]

const darkGreen = 'bg-[#0E4F38]'
const field = 'mt-1.5 block h-10 w-full rounded-[8px] border border-[#E4E7EC] px-3 text-[14px] outline-none placeholder:text-[#98A2B3] focus:border-[#1F8955]'

function icon(name: string) {
  return `/assets/icons/${name}.png`
}

/** "₹2.39 Cr" style total for the headline tile. */
function crore(value: number) {
  return value >= 1e7 ? `₹${(value / 1e7).toFixed(2)} Cr` : money(value)
}

function ago(iso: string) {
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 36e5))
  return hours < 1 ? 'just now' : hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
}

const change = (value: number) => (value < 0 ? 'text-[#D92D20]' : 'text-[#1F8955]')

function CommodityThumb({ src }: { src: string }) {
  return <img src={src} alt="" className="size-[28px] rounded-[6px] object-cover" />
}

/** No contact endpoint exists yet, so the form opens a pre-filled mail draft to support; nothing is sent until the visitor sends it. */
function draftMail(event: FormEvent<HTMLFormElement>, subject: string) {
  event.preventDefault()
  const data = new FormData(event.currentTarget)
  const body = [...data.entries()].map(([key, value]) => `${key}: ${String(value)}`).join('\n')
  window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function DesktopPage() {
  const { hash } = useLocation()
  // router links like /#contact change the URL but do not scroll by themselves
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
  }, [hash])

  // all public endpoints, so the page works signed out
  const stats = useApi(() => api.warehouses.stats(), [])
  // shortcut: totals cover the newest 100 lots only; add a marketplace summary endpoint when there are more
  const lots = useApi(() => api.marketplace.search({ sort: 'LATEST', size: 100 }), [])
  const prices = useApi(() => api.market.prices(undefined, 20), [])
  const gainers = useApi(() => api.market.insights('GAINERS', 7), [])
  const [filter, setFilter] = useState('All')

  const listed = lots.data?.items ?? []
  const movers = [...(prices.data ?? [])].sort((x, y) => y.changePct - x.changePct)
  const filters = ['All', ...movers.slice(0, 5).map((price) => price.commodity)]
  const trending = movers.filter((price) => filter === 'All' || price.commodity === filter).slice(0, 5)
  const lotsOf = (commodity: string) => listed.filter((lot) => lot.commodity === commodity)
  // every commodity: the newest live lot where one exists, otherwise its market price; listed ones first
  const rows = (prices.data ?? [])
    .map((price) => ({ price, lot: lotsOf(price.commodity)[0] }))
    .sort((x, y) => Number(!!y.lot) - Number(!!x.lot) || x.price.commodity.localeCompare(y.price.commodity))
  const tiles = [
    [crore(listed.reduce((sum, lot) => sum + lot.totalValue, 0)), 'Total marketplace value'],
    [mt(listed.reduce((sum, lot) => sum + lot.quantityMt, 0)), 'Available Inventory'],
    [String(lots.data?.totalItems ?? '-'), 'Active lots'],
    [String(stats.data?.verifiedWarehouses ?? '-'), 'Verified Warehouses'],
  ]

  return (
    <div className="min-h-screen bg-[#F4F6F5] pb-16">
      <PublicHeader />

      <section className="relative h-[600px] overflow-hidden">
        <img src="/assets/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
        <div className="relative z-10 px-[70px] pt-[60px]">
          <h1 className="max-w-[681px] text-[48px] leading-[58px] font-bold text-white">
            The Global Marketplace
            <br />
            For Agricultural commodities
          </h1>
          <p className="mt-5 max-w-[319px] text-[14px] leading-[19px] text-white/90">
            Buy, Sell and Finance verified agricultural commodities from trusted warehouses.
          </p>
          <div className="mt-5 flex gap-[25px]">
            <a href="#trending" className="grid h-10 w-[180px] place-items-center rounded-[6px] bg-[#1F8955] text-[15px] font-medium text-white">
              Explore Marketplace
            </a>
            <Link to="/trade/listing" className="grid h-10 w-[180px] place-items-center rounded-[6px] border border-white text-[15px] text-white">
              List Commodity
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-[15px] text-[15px] leading-[19px] text-white">
            {heroPoints.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span className="grid size-10 place-items-center rounded-full border border-white/80">
                  <img src={icon(item.icon)} alt="" className="size-5" />
                </span>
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="px-[70px]">
        <section className="relative z-10 -mt-[48px] grid h-[100px] grid-cols-4 items-center rounded-[12px] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
          {tiles.map(([value, label]) => (
            <div key={label} className="px-8">
              <p className="text-[32px] leading-none font-bold">{value}</p>
              <p className="mt-1 text-[15px] text-[#667085]">{label}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 grid h-20 grid-cols-4 overflow-hidden rounded-[12px] bg-white">
          {movers.slice(0, 4).map((price) => (
            <div key={price.commodity} className="flex items-center gap-[15px] px-[15px]">
              <img src={price.imageUrl} alt="" className="size-[50px] rounded-[8px] object-cover" />
              <div className="leading-none">
                <p className="text-[15px] leading-[17px] font-semibold">{price.commodity}</p>
                <p className="mt-1.5 text-[13px] leading-[17px] text-[#667085]">{perKg(price.pricePerKg)}</p>
              </div>
              <span className={`ml-auto text-[13px] leading-[17px] font-medium ${change(price.changePct)}`}>{pct(price.changePct)}</span>
            </div>
          ))}
        </section>

        <section id="trending" className="mt-8">
          <div className="flex items-end justify-between">
            <h2 className="text-[24px] font-bold">Trending Commodities</h2>
            <Link to="/marketplace" className="flex items-center gap-2 text-[15px] leading-[19px] text-[#0E4F38]">
              View All <span aria-hidden="true">⟶</span>
            </Link>
          </div>
          <div className="mt-2.5 flex gap-2.5">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={filter === item}
                onClick={() => setFilter(item)}
                className={`h-9 rounded-full px-5 text-[14px] leading-[19px] ${filter === item ? `${darkGreen} text-white` : 'bg-[#EAECF0] text-[#98A2B3]'}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-5 gap-[19px]">
            {trending.map((price) => {
              const open = lotsOf(price.commodity)
              return (
                <Link
                  key={price.commodity}
                  to={`/marketplace?q=${encodeURIComponent(price.commodity)}`}
                  className="overflow-hidden rounded-[12px] bg-white shadow-[0_6px_16px_rgba(16,24,40,0.05)]"
                >
                  <img src={price.imageUrl} alt="" className="h-[159px] w-full object-cover" />
                  <div className="px-4 py-3">
                    <p className="text-[16px] font-semibold">{price.commodity}</p>
                    <p className="mt-1 text-[13px] text-[#667085]">{perKg(price.pricePerKg)}</p>
                    <p className="text-[13px] text-[#667085]">{mt(open.reduce((sum, lot) => sum + lot.quantityMt, 0))} available</p>
                    <p className="text-[13px] text-[#667085]">{open.length} active lots</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mt-[50px] grid grid-cols-[1.52fr_1fr] gap-5">
          <article className="rounded-[16px] bg-white p-4">
            <h2 className="px-2 text-[24px] font-bold">Recent Listings</h2>
            <div className="mt-3 grid h-10 grid-cols-[1.4fr_1.2fr_0.8fr_0.55fr_0.9fr_0.7fr] items-center rounded-[8px] bg-[#F4F6F8] px-4 text-[14px] leading-[19px] text-[#667085]">
              <span>Commodity</span>
              <span>Location</span>
              <span>Quantity</span>
              <span>Grade</span>
              <span>Price (₹/MT)</span>
              <span>Listed</span>
            </div>
            <div className="mt-2">
              {prices.loading && !prices.data ? <p className="px-4 py-6 text-[14px] text-[#667085]">Loading listings…</p> : null}
              {rows.map(({ price, lot }) => (
                <Link
                  key={price.commodity}
                  to={`/marketplace?q=${encodeURIComponent(price.commodity)}`}
                  className="grid h-[50px] grid-cols-[1.4fr_1.2fr_0.8fr_0.55fr_0.9fr_0.7fr] items-center rounded-[8px] px-4 text-[14px] leading-[17px] hover:bg-[#F9FAFB]"
                >
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <CommodityThumb src={price.imageUrl} />
                    <span className="truncate">{price.commodity}</span>
                  </span>
                  <span className="truncate">{lot ? lot.region : price.bestMarket}</span>
                  <span className={lot ? '' : 'text-[#98A2B3]'}>{lot ? mt(lot.quantityMt) : 'No lots'}</span>
                  <span>{lot ? lot.grade : price.grade}</span>
                  <span>{perMt(lot ? lot.askingPricePerMt : price.pricePerMt).replace('/MT', '')}</span>
                  <span className="text-[#667085]">{ago(lot ? lot.createdAt : price.updatedAt)}</span>
                </Link>
              ))}
            </div>
          </article>
          <article className="rounded-[16px] bg-white p-4">
            <h2 className="px-2 text-[24px] font-bold">Market Insights</h2>
            <div className={`mt-3 inline-flex h-9 items-center rounded-full ${darkGreen} px-5 text-[14px] leading-[19px] text-white`}>Commodities</div>
            <div className="mt-2">
              {gainers.data?.map((price) => (
                <div key={price.commodity} className="grid h-[50px] grid-cols-[1.2fr_1.2fr_auto] items-center gap-2 px-2 text-[14px] leading-[17px]">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <CommodityThumb src={price.imageUrl} />
                    <span className="truncate">{price.commodity}</span>
                  </span>
                  <span className="truncate text-[#667085]">{price.bestMarket}</span>
                  <span>
                    {perKg(price.pricePerKg)} <span className={change(price.changePct)}>{pct(price.changePct)}</span>
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section id="about" className="mt-[50px] grid grid-cols-[1.52fr_1fr] gap-5">
          <article className="relative h-[250px] overflow-hidden rounded-[16px]">
            <img src="/assets/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative px-6 pt-[50px] text-white">
              <h2 className="max-w-[272px] text-[24px] leading-[29px] font-bold">From Farm to Global Markets</h2>
              <p className="mt-4 max-w-[358px] text-[14px] leading-[19px] text-white/90">
                Empowering farmers, traders and businesses with transparent and efficient agriculture trade.
              </p>
              <button type="button" className="mt-4 flex items-center gap-3 text-left text-[15px] leading-[19px] font-medium">
                <span className="grid size-[50px] shrink-0 place-items-center rounded-full border border-white">
                  <span className="ml-0.5 border-y-[6px] border-l-[10px] border-y-transparent border-l-white" />
                </span>
                <span>
                  Watch Our Story
                  <span className="block text-[13px] leading-[17px] font-normal text-white/80">2 min</span>
                </span>
              </button>
            </div>
          </article>
          <article className={`flex h-[250px] items-start gap-5 rounded-[16px] ${darkGreen} px-6 pt-[50px] text-white`}>
            <img src={icon('bank')} alt="" className="size-[42px] shrink-0" />
            <div>
              <h2 className="text-[24px] leading-[29px] font-bold">Need financing?</h2>
              <p className="mt-4 max-w-[301px] text-[14px] leading-[19px] text-white/85">
                Up to 75% inventory financing available Indicative loan: $1 million.
              </p>
              <Link
                to="/trade/loans"
                className="mt-4 flex h-10 w-[150px] items-center justify-center gap-2 rounded-[8px] border border-white text-[14px] leading-[19px]"
              >
                Get Financing <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        </section>

        <section className="mt-[50px] grid h-20 grid-cols-4 items-center rounded-[12px] bg-[#E7F6EE] px-5">
          {trusts.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <img src={icon(item.icon)} alt="" className="size-9 shrink-0" />
              <div>
                <p className="text-[15px] leading-[17px] font-semibold">{item.title}</p>
                <p className="mt-1 text-[13px] leading-[17px] text-[#667085]">{item.copy}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="contact" className="mt-[50px] grid grid-cols-2 gap-8 rounded-[16px] bg-white p-[30px]">
          <div>
            <span className="block h-[3px] w-9 bg-[#1F8955]" />
            <h2 className="mt-6 text-[18px] leading-[24px] font-bold text-[#1E1E1E]">Have questions? We&apos;re here to help.</h2>
            <p className="mt-3 max-w-[482px] text-[14px] leading-[19px] text-[#667085]">
              Whether you are a farmer, trader, warehouse owner or investor, our team is ready to support you.
            </p>
            <div className="mt-8 grid gap-[15px] text-[14px] leading-[19px]">
              {contacts.map((item) => (
                <div key={item.title} className="flex items-center gap-[15px]">
                  <span className={`grid size-[50px] shrink-0 place-items-center rounded-full ${darkGreen}`}>
                    <img src={icon(item.icon)} alt="" className="size-5" />
                  </span>
                  <p>
                    <span className="font-semibold text-[#1E1E1E]">{item.title}</span>
                    <span className="block text-[#667085]">{item.copy}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <form
            onSubmit={(event) => draftMail(event, 'Website enquiry')}
            className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-[12px] border border-[#E4E7EC] p-5 text-[14px] text-[#344054] shadow-[0_6px_16px_rgba(16,24,40,0.05)]"
          >
            <label>
              Full Name*
              <input required name="name" placeholder="Enter your name" className={field} />
            </label>
            <label>
              Email Address*
              <input required name="email" type="email" placeholder="you@company.com" className={field} />
            </label>
            <label>
              Phone Number
              <input name="phone" type="tel" placeholder="+91 9810101010" className={field} />
            </label>
            <label>
              Subject*
              <select required name="subject" defaultValue="" className={`${field} bg-white`}>
                <option value="" disabled>
                  Select a subject
                </option>
                {subjects.map((subject) => (
                  <option key={subject}>{subject}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2">
              Message*
              <textarea required name="message" rows={3} placeholder="Tell us how we can help..." className={`${field} h-auto resize-none py-2`} />
            </label>
            <button type="submit" className={`col-span-2 h-10 rounded-[6px] ${darkGreen} font-medium text-white`}>
              Send Message
            </button>
          </form>
        </section>

        <footer className="mt-10 border-y border-[#E4E7EC] py-8 text-[14px] leading-[19px] text-[#667085]">
          <div className="grid grid-cols-[1.4fr_1px_1fr_1fr_1fr_1px_1.3fr]">
            <div className="flex flex-col justify-end pr-8">
              <p className="max-w-[266px]">Whether you are a farmer, trader, warehouse owner or investor, our team is ready to support you.</p>
              <div className="mt-4 flex items-center gap-3 text-[#1E1E1E]">
                <XIcon className="size-5" />
                <TelegramIcon className="size-5" />
                <LinkedinIcon className="size-5" />
                <DiscordIcon className="size-6" />
                <img src={icon('youtube')} alt="" className="size-6" />
              </div>
            </div>
            <div className="bg-[#E4E7EC]" />
            {footerLinks.map(([title, links]) => (
              <div key={title} className="px-8">
                <p className="mb-2.5 font-semibold text-[#1E1E1E]">{title}</p>
                <div className="grid gap-[10px]">
                  {links.map((link) => (
                    <span key={link}>{link}</span>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-[#E4E7EC]" />
            <div className="pl-8">
              <p className="mb-2.5 font-semibold text-[#1E1E1E]">Subscribe to updates</p>
              <p className="max-w-[248px]">Get the latest market insights and product updates.</p>
              <form onSubmit={(event) => draftMail(event, 'Subscribe to updates')} className="mt-4 flex gap-2">
                <input required name="email" type="email" placeholder="Enter your email" aria-label="Email for updates" className={`${field} mt-0 min-w-0 flex-1`} />
                <button type="submit" aria-label="Subscribe" className={`grid h-10 w-14 shrink-0 place-items-center rounded-[6px] ${darkGreen} text-[18px] text-white`}>
                  ⟶
                </button>
              </form>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
