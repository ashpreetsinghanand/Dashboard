import { useNavigate } from 'react-router-dom'
import type { Category } from '../api/types'
import { signupDraft } from '../auth/AuthContext'
import { AuthScreen } from '../components/AuthScreen'

const categories: { id: Category; title: string; color: string; image: string; copy: string }[] = [
  {
    id: 'farmer',
    title: 'Farmer',
    color: '#2F80ED',
    image: '/assets/farmer.png',
    copy: 'Store your produce securely, access financing, and sell at better prices.',
  },
  {
    id: 'trader',
    title: 'Trader',
    color: '#E24B4B',
    image: '/assets/trader.png',
    copy: 'Buy, sell, and trade commodities with verified partners.',
  },
  {
    id: 'fpo',
    title: 'Farmer Producer Organization',
    color: '#1F8955',
    image: '/assets/fpo.png',
    copy: 'Sell collectively, get better prices, and access more market opportunities.',
  },
  {
    id: 'fpu',
    title: 'Food Processing Unit',
    color: '#1E1E1E',
    image: '/assets/plant.png',
    copy: 'Source quality commodities, secure reliable supply, and streamline procurement.',
  },
  {
    id: 'warehouse_owner',
    title: 'Warehouse Owner',
    color: '#B54708',
    image: '/assets/warehouse.png',
    copy: 'List your warehouses, accept bookings, and issue verified receipts.',
  },
]

export function CategoryPage() {
  const navigate = useNavigate()

  function choose(id: Category) {
    signupDraft.merge({ category: id })
    navigate('/signup/phone')
  }

  return (
    <AuthScreen
      filled={2}
      title="Select Your Category"
      subtitle="Choose the option that best describes you to personalize your experience"
    >
      <div className="mt-[30px] flex gap-5">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => choose(category.id)}
            className="flex h-[300px] w-[250px] flex-col items-center rounded-[16px] bg-white px-2 pt-[30px] text-center shadow-[0_8px_24px_rgba(16,24,40,0.06)]"
          >
            <img
              src={category.image}
              alt=""
              className="size-[150px] rounded-full object-cover"
            />
            <span
              className="mt-5 w-full text-[16px] leading-[19px] font-semibold whitespace-nowrap"
              style={{ color: category.color }}
            >
              {category.title}
            </span>
            <span className="mt-[11px] w-[220px] text-[13px] leading-[19px] text-[#8A8F98]">
              {category.copy}
            </span>
          </button>
        ))}
      </div>
    </AuthScreen>
  )
}
