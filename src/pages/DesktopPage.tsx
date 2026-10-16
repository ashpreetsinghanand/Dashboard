import { Link } from 'react-router-dom'
import {
  BankIcon,
  BoxIcon,
  DiscordIcon,
  GlobeIcon,
  MailIcon,
  PeopleIcon,
  PhoneIcon,
  PinIcon,
  ShieldIcon,
  TelegramIcon,
  WarehouseIcon,
  XIcon,
  YoutubeIcon,
} from '../components/Icons'

const ticker = [
  { name: 'Coffee', image: '/assets/coffee.png' },
  { name: 'Turmeric', image: '/assets/turmeric.png' },
  { name: 'Cardamom', image: '/assets/cardamom.jpg' },
  { name: 'Arecanut', image: '/assets/arecanut.jpg' },
]

const trending = [
  { name: 'Coffee', image: '/assets/coffee.png' },
  { name: 'Turmeric', image: '/assets/turmeric.png' },
  { name: 'Cardamom', image: '/assets/cardamom.jpg' },
  { name: 'Arecanut', image: '/assets/arecanut.jpg' },
  { name: 'Black Pepper', image: '/assets/pepper.jpg' },
]

const filters = ['All', 'Coffee', 'Black Pepper', 'Turmeric', 'Cardamom', 'Arecanut']

const listings = [
  ['Coffee', '/assets/coffee.png'],
  ['Turmeric', '/assets/turmeric.png'],
  ['Cardamum', '/assets/cardamom.jpg'],
  ['Arecanut', '/assets/arecanut.jpg'],
  ['Black Pepper', '/assets/pepper.jpg'],
  ['Clove', '/assets/clove.png'],
  ['Cuminum', '/assets/cumin.jpg'],
]

const trusts = [
  { title: 'Quality Verified', copy: 'Third party inspection', icon: ShieldIcon },
  { title: 'Warehouse Backed', copy: 'WDRA registered', icon: WarehouseIcon },
  { title: 'Transparent Pricing', copy: 'Live Market Data', icon: PeopleIcon },
  { title: 'Worldwide Reach', copy: 'From farm to global markets', icon: GlobeIcon },
]

const heroPoints = [
  { label: 'Verified Inventory', icon: BoxIcon },
  { label: 'Trusted Warehouses', icon: WarehouseIcon },
  { label: 'Secure Payment', icon: ShieldIcon },
  { label: 'Trade & Finance', icon: GlobeIcon },
]

function CommodityThumb({ src }: { src: string }) {
  return <img src={src} alt="" className="size-[28px] rounded-[6px] object-cover" />
}

export function DesktopPage() {
  return (
    <div className="min-h-screen bg-[#F4F6F5]">
      <div className="mx-auto w-[1440px] bg-[#F4F6F5] pb-16">
        <section className="relative h-[660px] overflow-hidden">
          <img src="/assets/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
          <header className="relative z-10 flex h-[60px] items-center justify-end gap-6 px-[32px] text-white">
            <Link to="/dashboard" className="text-[16px]">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="grid h-10 w-[90px] place-items-center rounded-[6px] bg-[#1F8955] text-[16px] font-medium"
            >
              Sign Up
            </Link>
          </header>
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
              <a
                href="#trending"
                className="grid h-10 w-[180px] place-items-center rounded-[6px] bg-[#1F8955] text-[15px] font-medium text-white"
              >
                Explore Marketplace
              </a>
              <button
                type="button"
                className="h-10 w-[180px] rounded-[6px] border border-white text-[15px] text-white"
              >
                List Commodity
              </button>
            </div>
            <div className="mt-6 flex items-center gap-[15px] text-[15px] leading-[19px] text-white">
              {heroPoints.map((item) => (
                <span key={item.label} className="flex items-center gap-1.5">
                  <span className="grid size-10 place-items-center rounded-full border border-white/80">
                    <item.icon className="size-5" />
                  </span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 mx-[70px] -mt-[48px] grid h-[100px] grid-cols-4 items-center rounded-[12px] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.08)]">
          {[
            ['$ 428 Cr', 'Total marketplace value'],
            ['126,450 MT', 'Available Inventory'],
            ['6,450', 'Active lots'],
            ['6,450', 'Verified Warehouses'],
          ].map(([value, label]) => (
            <div key={label} className="px-8">
              <p className="text-[32px] leading-none font-bold">{value}</p>
              <p className="mt-1 text-[15px] text-[#667085]">{label}</p>
            </div>
          ))}
        </section>

        <section className="mx-[70px] mt-5 grid h-20 grid-cols-4 overflow-hidden rounded-[12px] bg-white">
          {ticker.map((item) => (
            <div key={item.name} className="flex items-center gap-[15px] px-[15px]">
              <img src={item.image} alt="" className="size-[50px] rounded-[8px] object-cover" />
              <div className="leading-none">
                <p className="text-[15px] leading-[17px] font-semibold">{item.name}</p>
                <p className="mt-1.5 text-[13px] leading-[17px] text-[#667085]">$650/QTL</p>
              </div>
              <span className="ml-auto text-[13px] leading-[17px] font-medium text-[#1F8955]">+1.8%</span>
            </div>
          ))}
        </section>

        <section id="trending" className="mx-[70px] mt-8">
          <div className="flex items-end justify-between">
            <h2 className="text-[24px] font-bold">Trending Commodities</h2>
            <button type="button" className="flex items-center gap-2 text-[15px] leading-[19px] text-[#667085]">
              View All <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="mt-2.5 flex gap-2.5">
            {filters.map((filter, index) => (
              <button
                key={filter}
                type="button"
                className={`h-10 rounded-[8px] px-4 text-[15px] leading-[19px] ${
                  index === 0 ? 'bg-[#1F8955] text-white' : 'bg-white text-[#344054]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-5 gap-[19px]">
            {trending.map((item) => (
              <article key={item.name} className="overflow-hidden rounded-[12px] bg-white shadow-[0_6px_16px_rgba(16,24,40,0.05)]">
                <img src={item.image} alt="" className="h-[159px] w-full object-cover" />
                <div className="px-4 py-3">
                  <p className="text-[16px] font-semibold">{item.name}</p>
                  <p className="mt-1 text-[13px] text-[#667085]">$ 359/QTL</p>
                  <p className="text-[13px] text-[#667085]">18450 MT available</p>
                  <p className="text-[13px] text-[#667085]">164 active lots</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-[70px] mt-[50px] grid grid-cols-[773px_507px] gap-5">
          <article className="rounded-[16px] bg-white p-4">
            <h2 className="px-2 text-[24px] font-bold">Recent Listings</h2>
            <div className="mt-3 grid h-10 grid-cols-[1.4fr_1.2fr_0.8fr_0.55fr_0.9fr_0.7fr] items-center rounded-[8px] bg-[#F4F6F8] px-4 text-[14px] leading-[19px] text-[#667085]">
              <span>Commodity</span>
              <span>Location</span>
              <span>Quantity</span>
              <span>Grade</span>
              <span>Price($/QTL)</span>
              <span>Listed</span>
            </div>
            <div className="mt-2">
              {listings.map(([name, image]) => (
                <div
                  key={name}
                  className="grid h-[50px] grid-cols-[1.4fr_1.2fr_0.8fr_0.55fr_0.9fr_0.7fr] items-center px-1 text-[14px] leading-[17px]"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <CommodityThumb src={image} />
                    {name}
                  </span>
                  <span>Chikmagalur,KA</span>
                  <span>650 MT</span>
                  <span>A</span>
                  <span>650</span>
                  <span className="text-[#667085]">2h ago</span>
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-[16px] bg-white p-4">
            <h2 className="px-2 text-[24px] font-bold">Market Insights</h2>
            <div className="mt-3 inline-flex h-10 items-center rounded-[8px] bg-[#1F8955] px-4 text-[14px] leading-[19px] text-white">
              Commodities
            </div>
            <div className="mt-2">
              {listings.map(([name, image]) => (
                <div key={name} className="flex h-[50px] items-center justify-between px-2 text-[14px] leading-[17px]">
                  <span className="flex items-center gap-2 font-medium">
                    <CommodityThumb src={image} />
                    {name}
                  </span>
                  <span className="text-[#667085]">Chikmagalur,KA</span>
                  <span>650 MT</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mx-[70px] mt-[50px] grid grid-cols-[773px_508px] gap-[19px]">
          <article className="relative h-[250px] overflow-hidden rounded-[16px]">
            <img src="/assets/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative px-6 pt-[50px] text-white">
              <h2 className="max-w-[272px] text-[24px] leading-[29px] font-bold">
                From Farm to Global Markets
              </h2>
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
          <article className="flex h-[250px] items-start gap-5 rounded-[16px] bg-[#0E4F38] px-5 pt-[50px] text-white">
            <span className="grid size-[50px] shrink-0 place-items-center rounded-[10px] bg-white/10">
              <BankIcon className="size-7" />
            </span>
            <div>
              <h2 className="text-[24px] leading-[29px] font-bold">Need financing?</h2>
              <p className="mt-4 max-w-[301px] text-[14px] leading-[19px] text-white/85">
                Up to 75% inventory financing available Indicative loan: $1 million.
              </p>
              <button
                type="button"
                className="mt-4 flex h-10 w-[150px] items-center justify-center gap-2 rounded-[8px] border border-white text-[14px] leading-[19px]"
              >
                Get Financing <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        </section>

        <section className="mx-[70px] mt-[50px] grid h-20 grid-cols-4 items-center rounded-[12px] bg-[#E7F6EE] px-5">
          {trusts.map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <item.icon className="size-8 shrink-0 text-[#1E1E1E]" />
              <div>
                <p className="text-[15px] leading-[17px] font-semibold">{item.title}</p>
                <p className="mt-1 text-[13px] leading-[17px] text-[#667085]">{item.copy}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mx-[70px] mt-[50px] rounded-[16px] bg-white px-[30px] pt-[25px] pb-10">
          <span className="block h-[3px] w-9 bg-[#1F8955]" />
          <h2 className="mt-1 text-[24px] leading-[29px] font-bold">Get In Touch</h2>
          <p className="mt-4 text-[15px] leading-[19px] text-[#667085]">Have questions? We&apos;re here to help.</p>
          <p className="mt-4 max-w-[482px] text-[14px] leading-[19px] text-[#667085]">
            Whether you are a farmer, trader, warehouse owner or investor, our team is ready to support you.
          </p>
          <div className="mt-8 grid gap-[15px] text-[14px] leading-[19px]">
            {[
              { icon: PhoneIcon, title: '+91 98737373140', copy: 'Mon - Sat, 9:00 AM - 6:00 PM (IST)' },
              { icon: MailIcon, title: 'support@krsi.com', copy: 'We typically respond within 24 hours' },
              { icon: PinIcon, title: 'Delhi , India', copy: 'Building a global agri marketplace' },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-[15px]">
                <span className="grid size-[50px] shrink-0 place-items-center rounded-full bg-[#1F8955] text-white">
                  <item.icon className="size-5" />
                </span>
                <p>
                  <span className="font-semibold text-[#1E1E1E]">{item.title}</span>
                  <span className="block text-[#667085]">{item.copy}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer className="mx-[70px] mt-8 border-t border-[#E4E7EC] pt-8 text-[14px] leading-[19px] text-[#667085]">
          <div className="grid grid-cols-[346px_1px_230px_205px_186px_1px_1fr] gap-0">
            <div className="pr-8">
              <p className="max-w-[266px]">
                Whether you are a farmer, trader, warehouse owner or investor, our team is ready to support you.
              </p>
              <div className="mt-6 flex items-center gap-4 text-[#1E1E1E]">
                <XIcon className="size-6" />
                <TelegramIcon className="size-7" />
                <DiscordIcon className="size-8" />
                <YoutubeIcon className="size-8" />
              </div>
            </div>
            <div className="bg-[#E4E7EC]" />
            {[
              ['Marketplace', ['Explore', 'Commodities', 'Auctions', 'Warehouses', 'Market Data']],
              ['Company', ['About', 'Careers', 'Blog', 'Contact', 'Partners']],
              ['Resources', ['Help Centre', 'Documentation', 'Market Insights', 'API', 'Terms & Privacy']],
            ].map(([title, links]) => (
              <div key={title as string} className="px-6">
                <p className="mb-2.5 font-semibold text-[#1E1E1E]">{title as string}</p>
                <div className="grid gap-[10px]">
                  {(links as string[]).map((link) => (
                    <span key={link}>{link}</span>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-[#E4E7EC]" />
            <div className="pl-8">
              <p className="mb-2.5 font-semibold text-[#1E1E1E]">Subscribe to updates</p>
              <p className="max-w-[248px]">Get the latest market insights and product updates.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
