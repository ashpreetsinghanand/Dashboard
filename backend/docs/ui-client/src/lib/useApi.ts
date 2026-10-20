import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../api/client'

export interface ApiState<T> {
  data: T | undefined
  error: ApiRequestError | undefined
  loading: boolean
  reload: () => void
}

/**
 * Loads data when `deps` change and ignores responses from superseded requests.
 * Usage: const { data, loading, error, reload } = useApi(() => api.bookings.search(filters), [filters])
 */
export function useApi<T>(load: () => Promise<T>, deps: unknown[]): ApiState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<ApiRequestError>()
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const latest = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps)

  useEffect(() => {
    const id = ++latest.current
    setLoading(true)
    setError(undefined)
    run()
      .then((result) => { if (id === latest.current) setData(result) })
      .catch((e: unknown) => { if (id === latest.current) setError(asApiError(e)) })
      .finally(() => { if (id === latest.current) setLoading(false) })
  }, [run, tick])

  return { data, error, loading, reload: () => setTick((t) => t + 1) }
}

/** Runs a mutation (button click), tracking busy/error state. Returns the result or undefined on failure. */
export function useAction<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiRequestError>()
  const run = async (...args: A): Promise<R | undefined> => {
    setBusy(true)
    setError(undefined)
    try {
      return await action(...args)
    } catch (e) {
      setError(asApiError(e))
      return undefined
    } finally {
      setBusy(false)
    }
  }
  return { run, busy, error }
}

function asApiError(e: unknown): ApiRequestError {
  if (e instanceof ApiRequestError) return e
  return new ApiRequestError({ code: 'INTERNAL_ERROR', message: e instanceof Error ? e.message : 'Unexpected error', details: [] }, 0, '')
}
