import { useState } from 'react'
import { api } from '../../api/endpoints'
import { RequestLayout } from '../../components/RequestLayout'
import { WarehouseForm } from '../../components/owner/WarehouseForm'
import { ErrorBanner, Modal } from '../../components/ui'
import { money, mt } from '../../lib/format'
import { useApi } from '../../lib/useApi'

const cols = 'grid-cols-[230px_130px_150px_120px_80px_90px_60px]'

export function MyWarehousesPage() {
  const { data, loading, error, reload } = useApi(() => api.warehouses.mine(), [])
  // undefined = closed, null = add, string = edit that id
  const [editing, setEditing] = useState<string | null>()

  return (
    <RequestLayout
      section="owner"
      ownerPage="My Warehouses"
      crumb="My Warehouses"
      title="My Warehouses"
      subtitle="Register your warehouses and keep their capacity, rates and facilities up to date."
      toolbar={
        <div className="flex items-center justify-between gap-4">
          <p className="text-[13px] text-[#667085]">New warehouses start unverified until an auditor passes them.</p>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="h-[30px] w-[150px] shrink-0 rounded-[8px] bg-[#1F8955] text-[14px] font-medium text-white"
          >
            Add warehouse
          </button>
        </div>
      }
    >
      <ErrorBanner error={error} onRetry={reload} />
      <div className="mt-3 overflow-hidden rounded-[12px] bg-white">
        <div className={`grid h-[50px] ${cols} items-center pl-[15px] text-[13px] text-[#667085]`}>
          <span>Warehouse</span>
          <span>Location</span>
          <span>Capacity (free / total)</span>
          <span>Storage Rate</span>
          <span>Rating</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {loading && !data ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">Loading warehouses…</p>
        ) : data && data.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[#667085]">You have not added a warehouse yet.</p>
        ) : (
          data?.map((w) => (
            <div key={w.id} className={`grid h-[70px] ${cols} items-center border-t border-[#F2F4F7] pl-[15px] text-[13px]`}>
              <span className="flex items-center gap-2">
                <img src={w.imageUrl} alt="" className="size-10 shrink-0 rounded-[8px] object-cover" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{w.name}</span>
                  <span className="block truncate text-[11px] text-[#98A2B3]">{w.crops.join(', ') || 'No crops'}</span>
                </span>
              </span>
              <span className="leading-[15px]">
                {w.district}
                <span className="block text-[11px] text-[#98A2B3]">{w.state}</span>
              </span>
              <span>
                {mt(w.availableCapacityMt)} / {mt(w.totalCapacityMt)}
              </span>
              <span>{money(w.storageRatePerMtMonth)}/MT/mo</span>
              <span>{w.ratingCount > 0 ? `${w.rating}/5 (${w.ratingCount})` : 'Not rated'}</span>
              <span
                className={`inline-grid h-[25px] w-[80px] place-items-center rounded-full text-[12px] font-medium ${
                  w.verified ? 'bg-[#E7F6EE] text-[#1F8955]' : 'bg-[#FFF6DE] text-[#B54708]'
                }`}
              >
                {w.verified ? '✓ Verified' : 'Unverified'}
              </span>
              <button type="button" onClick={() => setEditing(w.id)} className="justify-self-start text-[12px] font-medium text-[#1F8955]">
                Edit
              </button>
            </div>
          ))
        )}
      </div>
      {editing !== undefined && (
        <Modal title={editing ? 'Edit warehouse' : 'Add warehouse'} onClose={() => setEditing(undefined)} width="w-[760px]">
          <WarehouseForm
            id={editing ?? undefined}
            onCancel={() => setEditing(undefined)}
            onSaved={() => {
              setEditing(undefined)
              reload()
            }}
          />
        </Modal>
      )}
    </RequestLayout>
  )
}
