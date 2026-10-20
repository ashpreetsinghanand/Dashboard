/** Live weather from Open-Meteo (free, no API key, CORS-enabled) for the user's saved coordinates. */
export interface Weather {
  temperature: number
  humidity: number
  windKmh: number
  label: string
  tomorrow: { maxC: number; rainChance: number; label: string }
}

const LABELS: [number, string][] = [
  [0, 'Clear sky'],
  [3, 'Partly cloudy'],
  [48, 'Foggy'],
  [57, 'Drizzle'],
  [67, 'Rain'],
  [77, 'Snow'],
  [82, 'Rain showers'],
  [99, 'Thunderstorm'],
]

/** WMO weather code to a short label. */
export function weatherLabel(code: number) {
  return LABELS.find(([max]) => code <= max)?.[1] ?? 'Unsettled'
}

export async function fetchWeather(latitude: number, longitude: number): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
    daily: 'temperature_2m_max,precipitation_probability_max,weather_code',
    forecast_days: '2',
    timezone: 'auto',
  })
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error('Weather is unavailable right now')
  const body = await response.json()
  return {
    temperature: Math.round(body.current.temperature_2m),
    humidity: Math.round(body.current.relative_humidity_2m),
    windKmh: Math.round(body.current.wind_speed_10m),
    label: weatherLabel(body.current.weather_code),
    tomorrow: {
      maxC: Math.round(body.daily.temperature_2m_max[1]),
      rainChance: body.daily.precipitation_probability_max[1] ?? 0,
      label: weatherLabel(body.daily.weather_code[1]),
    },
  }
}

/** The storage advice shown in the Weather Alert card. */
export function storageAdvice(weather: Weather): { title: string; text: string } {
  const { maxC, rainChance, label } = weather.tomorrow
  if (rainChance >= 50) return { title: 'Weather Alert', text: `${label} likely tomorrow (${rainChance}% chance). Cover stored produce and check drainage.` }
  if (maxC >= 38) return { title: 'Heat Alert', text: `Up to ${maxC}°C tomorrow. Check ventilation and moisture in stored produce.` }
  return { title: 'Weather Outlook', text: `${label} tomorrow, up to ${maxC}°C with a ${rainChance}% chance of rain. Good conditions to move produce.` }
}

// self-check of the code table (runs once at import; cheap)
console.assert(weatherLabel(0) === 'Clear sky' && weatherLabel(2) === 'Partly cloudy' && weatherLabel(63) === 'Rain' && weatherLabel(96) === 'Thunderstorm')
