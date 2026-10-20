export const primaryBtn = 'h-10 rounded-[8px] bg-[#1F8955] px-4 text-[14px] font-medium text-white disabled:opacity-60'
export const secondaryBtn = 'h-10 rounded-[8px] border border-[#D0D5DD] px-4 text-[14px] font-medium text-[#344054] disabled:opacity-60'
export const linkBtn = 'text-left text-[12px] leading-4 font-medium whitespace-nowrap text-[#1F8955] disabled:opacity-60'

/** Parses a form number; NaN for empty or non-numeric text. */
export const num = (text: string) => (text.trim() === '' ? Number.NaN : Number(text))
