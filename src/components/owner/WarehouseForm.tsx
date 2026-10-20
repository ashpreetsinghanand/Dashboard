import { useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../../api/endpoints'
import type { Attribute, WarehouseDetails, WarehouseUpsert } from '../../api/types'
import { useAction, useApi } from '../../lib/useApi'
import { ErrorBanner, FieldError } from '../ui'

const input = 'h-9 w-full rounded-[8px] border border-[#E6E8EC] bg-white px-2.5 text-[13px] outline-none focus:border-[#1F8955]'

type Text = Record<(typeof textFields)[number][0] | (typeof numberFields)[number][0] | 'slug' | 'amenities' | 'licenses' | 'photos', string>

const textFields = [
  ['name', 'Name *'],
  ['legalName', 'Legal name *'],
  ['code', 'Registration code *'],
  ['operator', 'Operator *'],
  ['type', 'Type (e.g. Private)'],
  ['address', 'Address *'],
  ['district', 'District * (e.g. Lalitpur, UP)'],
  ['state', 'State *'],
  ['suitableFor', 'Suitable for'],
  ['accessHours', 'Access hours'],
  ['connectivity', 'Connectivity'],
] as const

const numberFields = [
  ['latitude', 'Latitude *'],
  ['longitude', 'Longitude *'],
  ['totalCapacityMt', 'Total capacity (MT) *'],
  ['storageRatePerMtMonth', 'Storage rate (₹ / MT / month) *'],
  ['yearEstablished', 'Year established'],
  ['totalAreaSqft', 'Total area (sq ft)'],
] as const

const listFields = [
  ['amenities', 'Amenities'],
  ['licenses', 'Licenses'],
  ['photos', 'Photo URLs'],
] as const

function toText(w: WarehouseDetails | undefined): Text {
  const s = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v))
  return {
    slug: '', name: s(w?.name), legalName: s(w?.legalName), code: s(w?.code), operator: s(w?.operator), type: s(w?.type),
    address: s(w?.address), district: s(w?.district), state: s(w?.state), suitableFor: s(w?.suitableFor),
    accessHours: s(w?.accessHours), connectivity: s(w?.connectivity), latitude: s(w?.latitude), longitude: s(w?.longitude),
    totalCapacityMt: s(w?.totalCapacityMt), storageRatePerMtMonth: s(w?.storageRatePerMtMonth),
    yearEstablished: s(w?.yearEstablished), totalAreaSqft: s(w?.totalAreaSqft),
    amenities: (w?.amenities ?? []).join('\n'), licenses: (w?.licenses ?? []).join('\n'), photos: (w?.photos ?? []).join('\n'),
  }
}

/** Add (no id) or edit (id) a warehouse. Loads the full details first when editing. */
export function WarehouseForm({ id, onCancel, onSaved }: { id?: string; onCancel: () => void; onSaved: () => void }) {
  const details = useApi(() => (id ? api.warehouses.details(id) : Promise.resolve(undefined)), [id])
  if (details.loading && !details.data) return <p className="text-[14px] text-[#667085]">Loading warehouse…</p>
  if (details.error) return <ErrorBanner error={details.error} onRetry={details.reload} />
  return <Form id={id} initial={details.data} onCancel={onCancel} onSaved={onSaved} />
}

function Form({ id, initial, onCancel, onSaved }: { id?: string; initial?: WarehouseDetails; onCancel: () => void; onSaved: () => void }) {
  const commodities = useApi(() => api.reference.commodities(), [])
  const [text, setText] = useState(() => toText(initial))
  const [description, setDescription] = useState(initial?.description ?? '')
  const [crops, setCrops] = useState<string[]>(initial?.crops ?? [])
  const [wdra, setWdra] = useState(initial?.wdraRegistered ?? false)
  const [infra, setInfra] = useState<Attribute[]>(initial?.infrastructure ?? [])
  const save = useAction((body: WarehouseUpsert) => (id ? api.warehouses.update(id, body) : api.warehouses.create(body)))
  const err = (field: string) => save.error?.fieldMessage(field)

  const set = (key: keyof Text, value: string) => setText((t) => ({ ...t, [key]: value }))
  const num = (v: string) => (v.trim() === '' ? undefined : Number(v))
  const list = (v: string) => v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean)
  const opt = (v: string) => v.trim() || undefined

  async function submit(event: FormEvent) {
    event.preventDefault()
    const body: WarehouseUpsert = {
      slug: id ? undefined : opt(text.slug),
      name: text.name.trim(), legalName: text.legalName.trim(), code: text.code.trim(), operator: text.operator.trim(),
      type: opt(text.type), description: opt(description), address: text.address.trim(), district: text.district.trim(),
      state: text.state.trim(),
      // required numbers left empty go out as missing; the server answers with a field message
      latitude: num(text.latitude) as number, longitude: num(text.longitude) as number,
      totalCapacityMt: num(text.totalCapacityMt) as number, storageRatePerMtMonth: num(text.storageRatePerMtMonth) as number,
      crops, amenities: list(text.amenities), licenses: list(text.licenses), photos: list(text.photos),
      suitableFor: opt(text.suitableFor), accessHours: opt(text.accessHours), connectivity: opt(text.connectivity),
      yearEstablished: num(text.yearEstablished), totalAreaSqft: num(text.totalAreaSqft), wdraRegistered: wdra,
      infrastructure: infra.map((row) => ({ label: row.label.trim(), value: row.value.trim() })),
    }
    if (await save.run(body)) onSaved()
  }

  return (
    <form onSubmit={submit} className="grid gap-4 text-[13px]">
      {!id && (
        <p className="rounded-[8px] bg-[#FFF6DE] px-3 py-2 text-[#B54708]">
          New warehouses start unverified. They get the Verified badge once an auditor passes them.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {!id && (
          <Field label="URL id (optional, e.g. nayak)" error={err('slug')}>
            <input className={input} value={text.slug} onChange={(e) => set('slug', e.target.value)} placeholder="Generated from the name" />
          </Field>
        )}
        {textFields.map(([key, label]) => (
          <Field key={key} label={label} error={err(key)}>
            <input className={input} value={text[key]} onChange={(e) => set(key, e.target.value)} />
          </Field>
        ))}
        {numberFields.map(([key, label]) => (
          <Field key={key} label={label} error={err(key)}>
            <input className={input} type="number" step="any" value={text[key]} onChange={(e) => set(key, e.target.value)} />
          </Field>
        ))}
      </div>
      <Field label="Description" error={err('description')}>
        <textarea className={`${input} h-20 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={wdra} onChange={(e) => setWdra(e.target.checked)} className="accent-[#1F8955]" />
        WDRA registered
      </label>

      <fieldset>
        <legend className="mb-1.5 text-[#344054]">Crops stored *</legend>
        {commodities.error ? (
          <ErrorBanner error={commodities.error} onRetry={commodities.reload} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {commodities.loading && !commodities.data && <span className="text-[#667085]">Loading commodities…</span>}
            {commodities.data?.map((c) => {
              const on = crops.includes(c.name)
              return (
                <button
                  key={c.name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCrops((cur) => (on ? cur.filter((x) => x !== c.name) : [...cur, c.name]))}
                  className={`h-7 rounded-full px-3 text-[12px] ${on ? 'bg-[#1F8955] text-white' : 'border border-[#E6E8EC] bg-white text-[#344054]'}`}
                >
                  {c.name}
                </button>
              )
            })}
          </div>
        )}
        <FieldError message={err('crops')} />
      </fieldset>

      <div className="grid grid-cols-3 gap-3">
        {listFields.map(([key, label]) => (
          <Field key={key} label={`${label} (one per line or comma separated)`} error={err(key)}>
            <textarea className={`${input} h-24 py-2`} value={text[key]} onChange={(e) => set(key, e.target.value)} />
          </Field>
        ))}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[#344054]">Infrastructure details</legend>
        <div className="grid gap-2">
          {infra.map((row, i) => (
            <div key={i}>
              <div className="flex gap-2">
                <input
                  className={input}
                  aria-label={`Infrastructure label ${i + 1}`}
                  placeholder="Label (e.g. Fire safety)"
                  value={row.label}
                  onChange={(e) => setInfra((rows) => rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                />
                <input
                  className={input}
                  aria-label={`Infrastructure value ${i + 1}`}
                  placeholder="Value (e.g. Sprinklers)"
                  value={row.value}
                  onChange={(e) => setInfra((rows) => rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))}
                />
                <button
                  type="button"
                  onClick={() => setInfra((rows) => rows.filter((_, j) => j !== i))}
                  className="shrink-0 px-2 text-[#D92D20]"
                  aria-label={`Remove infrastructure row ${i + 1}`}
                >
                  Remove
                </button>
              </div>
              <FieldError message={err(`infrastructure[${i}].label`) ?? err(`infrastructure[${i}].value`)} />
            </div>
          ))}
          <button type="button" onClick={() => setInfra((rows) => [...rows, { label: '', value: '' }])} className="justify-self-start font-medium text-[#1F8955]">
            + Add row
          </button>
        </div>
        <FieldError message={err('infrastructure')} />
      </fieldset>

      <ErrorBanner error={save.error} />
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="h-10 w-[120px] rounded-[8px] border border-[#E6E8EC] text-[14px] text-[#344054]">
          Cancel
        </button>
        <button type="submit" disabled={save.busy} className="h-10 w-[150px] rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white disabled:opacity-60">
          {save.busy ? 'Saving…' : id ? 'Save changes' : 'Add warehouse'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[#344054]">{label}</span>
      {children}
      <FieldError message={error} />
    </label>
  )
}
