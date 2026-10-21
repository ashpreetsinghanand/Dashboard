import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/endpoints'
import type { NotificationFeed, NotificationItem } from '../api/types'
import { toUiDate } from '../lib/format'
import { BellIcon } from './Icons'

const POLL_MS = 30_000

/** Header bell: unread badge plus the latest notifications (GET /api/notifications). Polls while the tab is visible. */
export function NotificationBell() {
  const [feed, setFeed] = useState<NotificationFeed>()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const load = useCallback(() => {
    // a failed poll is simply retried on the next tick
    if (document.visibilityState === 'visible') api.notifications.feed().then(setFeed).catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const timer = window.setInterval(load, POLL_MS)
    document.addEventListener('visibilitychange', load)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [load])

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (!open) load()
    setOpen(!open)
  }

  function openItem(item: NotificationItem) {
    setOpen(false)
    if (!item.read) api.notifications.read(item.id).then(setFeed).catch(() => {})
    if (item.link) navigate(item.link)
  }

  const unread = feed?.unread ?? 0
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-full text-[#344054] hover:bg-[#F2F4F7]"
      >
        <BellIcon className="size-[22px]" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#D92D20] px-1 text-[11px] leading-none font-semibold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[360px] overflow-hidden rounded-[12px] border border-[#E6E8EC] bg-white shadow-[0_12px_32px_rgba(16,24,40,0.14)]">
          <div className="flex items-center justify-between border-b border-[#EAECF0] px-4 py-3">
            <p className="text-[15px] font-semibold text-[#101828]">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => api.notifications.readAll().then(setFeed).catch(() => {})}
                className="text-[13px] font-medium text-[#1F8955]"
              >
                Mark all as read
              </button>
            )}
          </div>
          {!feed ? (
            <p className="px-4 py-6 text-[14px] text-[#667085]">Loading…</p>
          ) : feed.items.length === 0 ? (
            <p className="px-4 py-6 text-[14px] text-[#667085]">You're all caught up.</p>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto">
              {feed.items.map((item) => (
                <li key={item.id} className="border-b border-[#F2F4F7] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-[#F9FAFB] ${item.read ? '' : 'bg-[#F6FEF9]'}`}
                  >
                    <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read ? '' : 'bg-[#1F8955]'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-[#101828]">
                        {item.title}
                        {!item.read && <span className="sr-only"> (unread)</span>}
                      </span>
                      <span className="block text-[13px] leading-[18px] text-[#475467]">{item.body}</span>
                      <span className="mt-1 block text-[12px] text-[#98A2B3]">{timeAgo(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function timeAgo(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return hours < 24 ? `${hours} h ago` : toUiDate(iso)
}
