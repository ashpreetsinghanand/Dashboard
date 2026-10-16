import { Fragment } from 'react'

type StepperProps = {
  filled: number
}

function Segment({ from, filled }: { from: number; filled: number }) {
  if (from < filled) return <div className="mx-0 h-[2px] flex-1 bg-[#1F8955]" />
  if (from === filled) {
    return (
      <div className="flex h-[2px] flex-1">
        <div className="h-full w-[38%] bg-[#1F8955]" />
        <div className="h-full flex-1 bg-[#E5E9EE]" />
      </div>
    )
  }
  return <div className="h-[2px] flex-1 bg-[#E5E9EE]" />
}

export function Stepper({ filled }: StepperProps) {
  return (
    <div className="flex w-[610px] items-center">
      {[1, 2, 3, 4].map((step, index) => {
        const done = step <= filled
        return (
          <Fragment key={step}>
            {index > 0 && <Segment from={step - 1} filled={filled} />}
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-full text-[20px] leading-none font-medium ${
                done ? 'bg-[#1F8955] text-white' : 'bg-[#E5E9EE] text-black'
              }`}
            >
              {step}
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
