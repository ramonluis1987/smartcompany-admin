import { createFileRoute } from '@tanstack/react-router'
import { OrderedCollection } from '#/components/OrderedCollection'
import { Switch, TextArea, TextField } from '#/components/ui'
import type { Office } from '#/lib/types'

export const Route = createFileRoute('/_app/oficinas')({ component: OfficesPage })

type Draft = Omit<Office, 'id' | 'sortOrder'>

function OfficesPage() {
  return (
    <OrderedCollection<Office, Draft>
      endpoint="/admin/offices"
      title="Oficinas"
      description="Direcciones y teléfonos de cada ciudad (portada, contacto y pie de página)."
      noun="oficina"
      emptyDraft={() => ({ city: '', label: 'Sucursal', address: '', phone: null, email: null, mapUrl: null, isVisible: true })}
      toDraft={({ id: _id, sortOrder: _s, ...rest }) => rest}
      renderRow={(o) => (
        <>
          <p className="font-medium text-ink">
            {o.city} <span className="font-normal text-muted">· {o.label}</span>
          </p>
          <p className="truncate text-[12.5px] text-muted">{o.address || 'Sin dirección'}</p>
        </>
      )}
      renderForm={(d, set, errors) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Ciudad" value={d.city} error={errors.city} onChange={(city) => set({ city })} />
          <TextField label="Tipo" value={d.label} onChange={(label) => set({ label })} hint="Matriz, Sucursal, Oficina…" />
          <TextArea label="Dirección" value={d.address} onChange={(address) => set({ address })} rows={2} className="sm:col-span-2" />
          <TextField label="Teléfono" value={d.phone ?? ''} onChange={(v) => set({ phone: v || null })} />
          <TextField label="Correo" type="email" value={d.email ?? ''} onChange={(v) => set({ email: v || null })} />
          <TextField label="Enlace de Google Maps" value={d.mapUrl ?? ''} onChange={(v) => set({ mapUrl: v || null })} className="sm:col-span-2" />
          <Switch label="Visible en el sitio" checked={d.isVisible} onChange={(isVisible) => set({ isVisible })} />
        </div>
      )}
    />
  )
}
