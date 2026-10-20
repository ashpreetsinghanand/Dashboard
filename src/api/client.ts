import type { ApiError, ApiResponse } from './types'

/** Base URL of the backend API. Set VITE_API_URL in .env.local, or leave unset and use the Vite proxy (see the guide). */
export const API_BASE: string = import.meta.env.VITE_API_URL ?? '/api'

const TOKEN_KEY = 'krsi-token'

export const tokenStore = {
  get: (): string | null => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set: (token: string) => {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* private mode: token lives for this tab only */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  },
}

/** Thrown for every non-success response. `error.code` is stable; `error.message` is safe to show. */
export class ApiRequestError extends Error {
  // plain fields, not constructor parameter properties: the project builds with erasableSyntaxOnly
  readonly error: ApiError
  readonly status: number
  readonly traceId: string

  constructor(error: ApiError, status: number, traceId: string) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.error = error
    this.status = status
    this.traceId = traceId
  }

  /** Message for a form field, from error.details (validation errors). */
  fieldMessage(field: string): string | undefined {
    return this.error.details.find((d) => d.field === field)?.message
  }
}

let onUnauthorized: () => void = () => {}

/** Register what happens on 401 (e.g. clear the session and navigate to /login). Called once by AuthProvider. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

type Query = Record<string, string | number | boolean | null | undefined>

/** Builds ?a=1&b=2, skipping empty values so "All ..." dropdown options can be passed as undefined. */
export function toQuery(params?: object): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params as Query)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get()
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new ApiRequestError(
      { code: 'DEPENDENCY_UNAVAILABLE', message: 'Cannot reach the server. Check your connection.', details: [] },
      0,
      '',
    )
  }

  let body: ApiResponse<T> | null = null
  try {
    body = (await response.json()) as ApiResponse<T>
  } catch {
    /* non-JSON body (proxy error page etc.) */
  }

  // a 401 from /auth/* is a wrong password or code, not an expired session, so stay on the page
  if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized()
  if (!body || !body.success) {
    const error: ApiError = body?.error ?? { code: 'INTERNAL_ERROR', message: `Unexpected response (${response.status})`, details: [] }
    throw new ApiRequestError(error, response.status, body?.traceId ?? response.headers.get('X-Trace-Id') ?? '')
  }
  return body.data as T
}

export const get = <T>(path: string, params?: object) => call<T>(`${path}${toQuery(params)}`)
export const post = <T>(path: string, body?: unknown) =>
  call<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
export const put = <T>(path: string, body: unknown) => call<T>(path, { method: 'PUT', body: JSON.stringify(body) })
export const patch = <T>(path: string, body: unknown) => call<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
export const del = <T>(path: string) => call<T>(path, { method: 'DELETE' })

/** Fetches a non-JSON resource with the token (e.g. the printable invoice) and opens it in a new tab. */
export async function openAuthenticated(path: string) {
  const token = tokenStore.get()
  const response = await fetch(`${API_BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!response.ok) throw new Error(`Download failed (${response.status})`)
  const url = URL.createObjectURL(await response.blob())
  // a download link, not window.open: after the await the click no longer counts as a user gesture, so popups get blocked
  const name = response.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] ?? 'download'
  const link = Object.assign(document.createElement('a'), { href: url, download: name })
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
