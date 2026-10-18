export type SavedBooking = {
  id: string
  commodity: string
  grade: string
  warehouse: string
  location: string
  date: string
  quantity: string
  status: 'Pending'
}

const key = 'krsi-bookings'

export function readBookings(): SavedBooking[] {
  try {
    const raw = sessionStorage.getItem(key)
    const parsed = raw ? (JSON.parse(raw) as SavedBooking[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveBooking(booking: Omit<SavedBooking, 'id' | 'status' | 'grade'>) {
  const next: SavedBooking[] = [
    {
      ...booking,
      id: `${Date.now()}`,
      grade: 'Raw',
      status: 'Pending',
    },
    ...readBookings(),
  ]
  sessionStorage.setItem(key, JSON.stringify(next))
}

const images: Record<string, string> = {
  Coffee: '/assets/coffee.png',
  Turmeric: '/assets/turmeric.png',
  Cardamum: '/assets/cardamom.jpg',
  Cardamom: '/assets/cardamom.jpg',
  'Black Pepper': '/assets/pepper.jpg',
  Cumin: '/assets/cumin.jpg',
  Cuminum: '/assets/cumin.jpg',
  Clove: '/assets/clove.png',
  Arecanut: '/assets/arecanut.jpg',
  Wheat: '/assets/cumin.jpg',
  Rice: '/assets/cumin.jpg',
  Maize: '/assets/cumin.jpg',
}

export function commodityImage(name: string) {
  return images[name] ?? '/assets/coffee.png'
}
