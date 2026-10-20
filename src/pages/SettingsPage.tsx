import { useState, type FormEvent } from 'react'
import { api } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { DashboardShell } from '../components/DashboardShell'
import { ErrorBanner, FieldError } from '../components/ui'
import { useAction, useApi } from '../lib/useApi'

const field = 'mt-1.5 block h-10 w-full rounded-[8px] border border-[#E4E7EC] bg-white px-3 text-[14px] outline-none focus:border-[#1F8955]'

/** Profile and farm location (GET/PATCH /api/me). The location drives weather and "nearest warehouse" sorting. */
export function SettingsPage() {
  const { user, refresh } = useAuth()
  const languages = useApi(() => api.reference.languages(), [])
  const save = useAction(api.auth.updateMe)
  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    language: user?.language ?? 'English',
    district: user?.district ?? '',
    state: user?.state ?? '',
    latitude: user?.latitude?.toString() ?? '',
    longitude: user?.longitude?.toString() ?? '',
  })
  const [saved, setSaved] = useState(false)
  const [locating, setLocating] = useState(false)
  const set = (key: keyof typeof form) => (value: string) => {
    setSaved(false)
    setForm((current) => ({ ...current, [key]: value }))
  }

  function locate() {
    setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        set('latitude')(position.coords.latitude.toFixed(4))
        set('longitude')(position.coords.longitude.toFixed(4))
        setLocating(false)
      },
      () => setLocating(false),
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const number = (text: string) => (text.trim() === '' ? undefined : Number(text))
    const updated = await save.run({
      fullName: form.fullName.trim() || undefined,
      language: form.language,
      district: form.district.trim() || undefined,
      state: form.state.trim() || undefined,
      latitude: number(form.latitude),
      longitude: number(form.longitude),
    })
    if (updated) {
      await refresh()
      setSaved(true)
    }
  }

  const error = (name: string) => save.error?.fieldMessage(name)

  return (
    <DashboardShell section="settings">
      <main className="min-w-0 flex-1 px-5 pt-[15px] pb-10">
        <h1 className="text-[24px] leading-[29px] font-bold">Settings</h1>
        <p className="mt-2 text-[14px] text-[#667085]">Your profile and farm location. Location is used for local weather and to sort warehouses by distance.</p>

        <form onSubmit={submit} className="mt-5 grid max-w-[760px] grid-cols-2 gap-x-5 gap-y-4 rounded-[16px] bg-white p-6 text-[14px] text-[#344054]">
          <p className="col-span-2 text-[13px] text-[#667085]">
            Signed in as <span className="font-semibold text-[#1E1E1E]">{user?.phone}</span> · {user?.categoryLabel}
          </p>
          <label>
            Full name
            <input value={form.fullName} onChange={(event) => set('fullName')(event.target.value)} className={field} />
            <FieldError message={error('fullName')} />
          </label>
          <label>
            Language
            <select value={form.language} onChange={(event) => set('language')(event.target.value)} className={field}>
              {(languages.data ?? [{ code: 'en', label: form.language }]).map((option) => (
                <option key={option.code} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            District / village
            <input value={form.district} onChange={(event) => set('district')(event.target.value)} className={field} />
            <FieldError message={error('district')} />
          </label>
          <label>
            State
            <input value={form.state} onChange={(event) => set('state')(event.target.value)} className={field} />
            <FieldError message={error('state')} />
          </label>
          <label>
            Latitude
            <input value={form.latitude} onChange={(event) => set('latitude')(event.target.value)} inputMode="decimal" placeholder="e.g. 28.61" className={field} />
            <FieldError message={error('latitude')} />
          </label>
          <label>
            Longitude
            <input value={form.longitude} onChange={(event) => set('longitude')(event.target.value)} inputMode="decimal" placeholder="e.g. 76.95" className={field} />
            <FieldError message={error('longitude')} />
          </label>
          <button type="button" onClick={locate} disabled={locating} className="col-span-2 justify-self-start text-[13px] font-medium text-[#1F8955] disabled:opacity-60">
            {locating ? 'Finding your location…' : 'Use my current location'}
          </button>
          {save.error && !save.error.error.details.length ? (
            <div className="col-span-2">
              <ErrorBanner error={save.error} />
            </div>
          ) : null}
          <div className="col-span-2 flex items-center gap-4">
            <button type="submit" disabled={save.busy} className="h-10 w-[150px] rounded-[8px] bg-[#1F8955] font-medium text-white disabled:opacity-60">
              {save.busy ? 'Saving…' : 'Save changes'}
            </button>
            {saved ? (
              <p role="status" className="text-[13px] text-[#1F8955]">
                Saved.
              </p>
            ) : null}
          </div>
        </form>
      </main>
    </DashboardShell>
  )
}
