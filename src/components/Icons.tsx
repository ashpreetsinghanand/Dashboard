type IconProps = {
  className?: string
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  )
}

export function StoreIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z" />
      <path {...stroke} d="M3 10 5.2 5h13.6L21 10" />
      <path {...stroke} d="M9 20v-5h6v5" />
    </svg>
  )
}

export function LoanIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path {...stroke} d="M14 3.5V8h4M8.5 13h7M8.5 16.5h5" />
    </svg>
  )
}

export function TradeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M7 7h11l-2.2-2.2M17 17H6l2.2 2.2" />
      <path {...stroke} d="M18 7v4M6 17v-4" />
    </svg>
  )
}

export function MarketIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...stroke} cx="12" cy="12" r="8" />
      <path {...stroke} d="M4 12h16M12 4c2.2 2.4 3.3 5.1 3.3 8S14.2 17.6 12 20c-2.2-2.4-3.3-5.1-3.3-8S9.8 6.4 12 4Z" />
    </svg>
  )
}

export function SackIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M8 7c0-2 1.6-3 4-3s4 1 4 3c2.2.6 3.5 2.2 3.5 4.5 0 4.2-2.4 8.5-7.5 8.5S4.5 15.7 4.5 11.5C4.5 9.2 5.8 7.6 8 7Z" />
      <path {...stroke} d="M9 7c.4 1.2 1.5 2 3 2s2.6-.8 3-2" />
    </svg>
  )
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M6 16V11a6 6 0 1 1 12 0v5l1.2 1.5H4.8L6 16Z" />
      <path {...stroke} d="M10 18.5a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M4 19h16" />
      <path {...stroke} d="M7 16V10M12 16V6M17 16v-4" />
    </svg>
  )
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M4 7h16v10H4V7Z" />
      <path {...stroke} d="m4 8 8 6 8-6" />
    </svg>
  )
}

export function GearIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...stroke} cx="12" cy="12" r="3" />
      <path
        {...stroke}
        d="M12 3.5v2.2M12 18.3V20.5M4.8 6.8l1.6 1.6M17.6 15.6l1.6 1.6M3.5 12h2.2M18.3 12h2.2M4.8 17.2l1.6-1.6M17.6 8.4l1.6-1.6"
      />
    </svg>
  )
}

export function HeadsetIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M4 13a8 8 0 0 1 16 0" />
      <path {...stroke} d="M4 13v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2ZM20 13v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2ZM10 19h3" />
    </svg>
  )
}

export function BoxIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M3.5 8 12 4l8.5 4L12 12 3.5 8Z" />
      <path {...stroke} d="M3.5 8v8L12 20l8.5-4V8" />
      <path {...stroke} d="M12 12v8" />
    </svg>
  )
}

export function WarehouseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M3 10 12 4l9 6v10H3V10Z" />
      <path {...stroke} d="M8 20v-6h8v6M3 12h18" />
    </svg>
  )
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M12 3.5 19 6.5v6.2c0 3.6-2.7 6.4-7 7.8-4.3-1.4-7-4.2-7-7.8V6.5L12 3.5Z" />
      <path {...stroke} d="m9 12 2 2 4-4" />
    </svg>
  )
}

export function PeopleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...stroke} cx="8" cy="9" r="2.2" />
      <circle {...stroke} cx="16" cy="9" r="2.2" />
      <path {...stroke} d="M4.5 17.5c.6-2 2.2-3 3.5-3s2.9 1 3.5 3M12.5 17.5c.6-2 2.2-3 3.5-3s2.9 1 3.5 3" />
    </svg>
  )
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...stroke} cx="12" cy="12" r="8" />
      <path {...stroke} d="M4 12h16M12 4c2 2.3 3 5 3 8s-1 5.7-3 8c-2-2.3-3-5-3-8s1-5.7 3-8Z" />
    </svg>
  )
}

export function BankIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M3 17h18M12 4 3 9h18L12 4Z" />
    </svg>
  )
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        {...stroke}
        d="M8 4.5h2.2l1.2 3-1.6 1a11 11 0 0 0 5.5 5.5l1-1.6 3 1.2V18a1.5 1.5 0 0 1-1.6 1.5A14.5 14.5 0 0 1 4.5 8.1 1.5 1.5 0 0 1 6 6.5h2Z"
      />
    </svg>
  )
}

export function PinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z" />
      <circle {...stroke} cx="12" cy="11" r="1.8" />
    </svg>
  )
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M12 4 3.5 19h17L12 4Z" />
      <path {...stroke} d="M12 10v4M12 16.5v.5" />
    </svg>
  )
}

export function CloudMiniIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M7 17h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.2A3.5 3.5 0 0 0 7 17Z" />
    </svg>
  )
}

export function GrainIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M8 8c0-2.2 1.5-4 4-4s4 1.8 4 4c1.8.5 3 2 3 4.2C19 16.8 16 20 12 20S5 16.8 5 12.2C5 10 6.2 8.5 8 8Z" />
      <path {...stroke} d="M12 8v8M9.5 10.5c.7.8 1.5 1.2 2.5 1.2s1.8-.4 2.5-1.2" />
    </svg>
  )
}

export function DocIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M7 3.5h6.5L18 8v12.5H7V3.5Z" />
      <path {...stroke} d="M13 3.5V8h5M9 12h6M9 15.5h4" />
    </svg>
  )
}

export function TrendIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path {...stroke} d="M4 16.5 9.5 11l3.2 3L20 7" />
      <path {...stroke} d="M14 7h6v6" />
    </svg>
  )
}

export function RepayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle {...stroke} cx="12" cy="12" r="8" />
      <path {...stroke} d="M12 8v4.2l2.6 1.6" />
    </svg>
  )
}

export function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M14.7 10.4 21.4 3h-1.6l-5.8 6.4L9.3 3H3.4l7 9.6L3.4 21h1.6l6.2-6.8 5 6.8h5.9l-7.4-10.6Zm-2.2 2.4-.7-1-5.7-7.6h2.4l4.6 6.1.7 1 6 7.9h-2.4l-4.9-6.4Z" />
    </svg>
  )
}

export function TelegramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M20.7 4.3 3.6 10.8c-1.2.4-1.1 1.1-.2 1.4l4.4 1.4 10.2-6.4c.5-.3.9-.1.6.2l-8.3 7.5-.3 4.5c.4 0 .6-.2.9-.5l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.8l2.9-13.6c.3-1.2-.4-1.7-1.2-1.4Z" />
    </svg>
  )
}

export function DiscordIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M18.6 5.2A16 16 0 0 0 14.8 4l-.4.7a13 13 0 0 1 3.3.8 15 15 0 0 0-11.4 0A12 12 0 0 1 9.6 4.7L9.2 4a16 16 0 0 0-3.8 1.2C3.2 8.2 2.6 11.1 2.8 14c1.6 1.2 3.1 1.9 4.6 2.4l.9-1.3a9 9 0 0 1-1.5-.7l.4-.3c2.9 1.3 6 1.3 8.8 0l.4.3c-.5.3-1 .5-1.5.7l.9 1.3c1.5-.5 3-1.2 4.6-2.4.4-3.4-.5-6.3-2.2-8.8ZM9.7 12.8c-.7 0-1.3-.6-1.3-1.4s.6-1.4 1.3-1.4 1.3.6 1.3 1.4-.6 1.4-1.3 1.4Zm4.6 0c-.7 0-1.3-.6-1.3-1.4s.6-1.4 1.3-1.4 1.3.6 1.3 1.4-.6 1.4-1.3 1.4Z"
      />
    </svg>
  )
}

export function YoutubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M22 12.2s0-3.1-.4-4.5c-.2-.8-.9-1.5-1.7-1.7C18.4 5.6 12 5.6 12 5.6s-6.4 0-7.9.4c-.8.2-1.5.9-1.7 1.7C2 9.1 2 12.2 2 12.2s0 3.1.4 4.5c.2.8.9 1.5 1.7 1.7 1.5.4 7.9.4 7.9.4s6.4 0 7.9-.4c.8-.2 1.5-.9 1.7-1.7.4-1.4.4-4.5.4-4.5ZM10 15.2V9.2l5.2 3-5.2 3Z"
      />
    </svg>
  )
}
