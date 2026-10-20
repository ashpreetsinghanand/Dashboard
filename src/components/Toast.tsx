import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Toast = { id: number; message: string }
const ToastContext = createContext<((message: string) => void) | null>(null)
let nextId = 1

/** Success messages ("INV-000004 paid") as toasts in the bottom-right corner; errors stay inline next to the action. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const show = useCallback(
    (message: string) => {
      const id = nextId++
      setToasts((current) => [...current.slice(-2), { id, message }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed right-5 bottom-5 z-[60] grid w-[360px] gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 rounded-[12px] border border-[#E6E8EC] border-l-4 border-l-[#1F8955] bg-white px-4 py-3 text-[14px] leading-5 text-[#101828] shadow-[0_12px_32px_rgba(16,24,40,0.14)]"
          >
            <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-[#E7F6EE] text-[12px] text-[#1F8955]">
              ✓
            </span>
            <p className="min-w-0 flex-1">{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="text-[16px] leading-none text-[#98A2B3]">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}
