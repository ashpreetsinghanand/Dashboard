import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { setUnauthorizedHandler, tokenStore } from '../api/client'
import { api } from '../api/endpoints'
import type { Category, Profile, Role, Session } from '../api/types'

interface AuthValue {
  user: Profile | null
  /** True until the stored token has been checked against /api/me on page load. */
  restoring: boolean
  login: (phone: string, password: string) => Promise<Profile>
  /** Stores the session returned by /auth/signup or /auth/password/reset. */
  acceptSession: (session: Session) => Profile
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<Profile | null>(null)
  const [restoring, setRestoring] = useState(true)

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear()
      setUser(null)
      navigate('/login', { replace: true })
    })
    if (!tokenStore.get()) {
      setRestoring(false)
      return
    }
    api.auth.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setRestoring(false))
  }, [navigate])

  const value = useMemo<AuthValue>(() => ({
    user,
    restoring,
    login: async (phone, password) => {
      const session = await api.auth.login(phone, password)
      tokenStore.set(session.accessToken)
      setUser(session.user)
      return session.user
    },
    acceptSession: (session) => {
      tokenStore.set(session.accessToken)
      setUser(session.user)
      return session.user
    },
    logout: () => {
      tokenStore.clear()
      setUser(null)
      navigate('/login')
    },
    refresh: async () => setUser(await api.auth.me()),
  }), [user, restoring, navigate])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

/** Route guard: signed in, and optionally one of the given roles. */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const { user, restoring } = useAuth()
  const location = useLocation()
  if (restoring) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

/**
 * Values collected across the sign-up screens (Language -> Category -> Phone -> OTP -> Password).
 * Kept in sessionStorage so a refresh mid-flow does not lose them.
 */
export interface SignupDraft {
  language?: string
  category?: Category
  phone?: string
  challengeId?: string
  resendAfterSeconds?: number
  verificationToken?: string
}

const DRAFT_KEY = 'krsi-signup'

export const signupDraft = {
  read(): SignupDraft {
    try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? '{}') as SignupDraft } catch { return {} }
  },
  merge(patch: SignupDraft) {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...signupDraft.read(), ...patch })) } catch { /* ignore */ }
  },
  clear() {
    try { sessionStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
  },
}
