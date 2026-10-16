import type { ReactNode } from 'react'
import { Stepper } from './Stepper'

type AuthScreenProps = {
  filled: number
  title: string
  subtitle: string
  children?: ReactNode
}

export function AuthScreen({ filled, title, subtitle, children }: AuthScreenProps) {
  return (
    <div className="min-h-screen bg-[#f6f9fc]">
      <div className="mx-auto min-h-screen w-[1440px] bg-[#f6f9fc]">
        <div className="h-[60px] bg-[#fffeff]" />
        <div className="flex flex-col items-center">
          <div className="mt-[100px]">
            <Stepper filled={filled} />
          </div>
          <h1 className="mt-[30px] text-center text-[48px] leading-[58px] font-bold tracking-[-0.5px] text-black">
            {title}
          </h1>
          <p className="mt-5 text-center text-[16px] leading-[19px] font-medium text-[#979797]">
            {subtitle}
          </p>
          {children}
        </div>
      </div>
    </div>
  )
}
