export type Warehouse = {
  id: string
  name: string
  location: string
  shortLocation: string
  distance: string
  capacity: string
  crops: string[]
  image: string
}

export const warehouses: Warehouse[] = [
  {
    id: 'nayak',
    name: 'Nayak Warehouse',
    location: 'Lalitpur, Uttar Pradesh',
    shortLocation: 'Lalitpur, UP',
    distance: '12 Km',
    capacity: '3,000 MT',
    crops: ['Coffee', 'Clove', 'Arecanut', 'Wheat', 'Rice'],
    image: '/assets/warehouse-card.png',
  },
  {
    id: 'shree-agro',
    name: 'Shree Agro Storage',
    location: 'Jhansi, Uttar Pradesh',
    shortLocation: 'Jhansi, UP',
    distance: '28 Km',
    capacity: '3,000 MT',
    crops: ['Coffee', 'Cumin', 'Turmeric', 'Wheat', 'Rice'],
    image: '/assets/warehouse.png',
  },
  {
    id: 'bundelkhand',
    name: 'Bundelkhand Warehouse',
    location: 'Tikamgarh, Madhya Pradesh',
    shortLocation: 'Tikamgarh, MP',
    distance: '12 Km',
    capacity: '5,000 MT',
    crops: ['Coffee', 'Cumin', 'Clove', 'Rice', 'Maize'],
    image: '/assets/farmer-field.png',
  },
  {
    id: 'krishi',
    name: 'Krishi Storage Solutions',
    location: 'Mahoba, Uttar Pradesh',
    shortLocation: 'Mahoba, UP',
    distance: '12 Km',
    capacity: '3,500 MT',
    crops: ['Wheat', 'Rice', 'Maize', 'Cumin', 'Clove'],
    image: '/assets/hero.jpg',
  },
  {
    id: 'agri-vault',
    name: 'Agri Vault Warehouse',
    location: 'Orai, Uttar Pradesh',
    shortLocation: 'Orai, UP',
    distance: '12 Km',
    capacity: '4,000 MT',
    crops: ['Wheat', 'Rice', 'Maize', 'Turmeric', 'Coffee'],
    image: '/assets/warehouse.png',
  },
  {
    id: 'green-field',
    name: 'Green Field Warehouse',
    location: 'Chhatarpur, Madhya Pradesh',
    shortLocation: 'Chhatarpur, MP',
    distance: '12 Km',
    capacity: '3,000 MT',
    crops: ['Wheat', 'Rice', 'Maize', 'Clove', 'Cumin'],
    image: '/assets/warehouse-card.png',
  },
]

export function warehouseById(id: string) {
  return warehouses.find((warehouse) => warehouse.id === id) ?? warehouses[0]
}

export const insights = [
  ['Coffee', '$25.00', '+2.4%', '/assets/coffee.png'],
  ['Turmeric', '$30.00', '+1.8%', '/assets/turmeric.png'],
  ['Cardamum', '$120.00', '+0.1%', '/assets/cardamom.jpg'],
  ['Black Pepper', '$14.63', '+2.5%', '/assets/pepper.jpg'],
  ['Clove', '$95.00', '+0.5%', '/assets/clove.png'],
] as const
