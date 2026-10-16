import { createFileRoute } from '@tanstack/react-router'
import { ImageInput } from '#/components/ImageInput'
import { OrderedCollection } from '#/components/OrderedCollection'
import { Switch, TextArea, TextField } from '#/components/ui'
import { mediaUrl } from '#/lib/api'
import type { TeamMember } from '#/lib/types'

export const Route = createFileRoute('/_app/equipo')({ component: TeamPage })

type Draft = Omit<TeamMember, 'id' | 'sortOrder'>

function TeamPage() {
  return (
    <OrderedCollection<TeamMember, Draft>
      endpoint="/admin/team"
      title="Equipo"
      description="Socios y abogados que aparecen en la portada. Los socios se muestran primero."
      noun="integrante"
      emptyDraft={() => ({ name: '', role: '', bio: '', photoUrl: null, email: null, phone: null, isPartner: false, isVisible: true })}
      toDraft={({ id: _id, sortOrder: _s, ...rest }) => rest}
      renderRow={(m) => (
        <div className="flex items-center gap-3">
          <span className="size-11 shrink-0 overflow-hidden rounded-full bg-stone">{m.photoUrl && <img src={mediaUrl(m.photoUrl)} alt="" className="size-full object-cover" />}</span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{m.name}</span>
            <span className="block truncate text-[12.5px] text-muted">
              {m.role}
              {m.isPartner && ' · Socio'}
            </span>
          </span>
        </div>
      )}
      renderForm={(d, set, errors) => (
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <ImageInput label="Retrato" value={d.photoUrl} onChange={(photoUrl) => set({ photoUrl })} aspect="aspect-[3/4]" />
          <div className="space-y-4">
            <TextField label="Nombre" value={d.name} error={errors.name} onChange={(name) => set({ name })} placeholder="Ab. Nombre Apellido" />
            <TextField label="Cargo o especialidad" value={d.role} onChange={(role) => set({ role })} />
            <TextField label="Correo" type="email" value={d.email ?? ''} onChange={(v) => set({ email: v || null })} />
            <TextField label="Teléfono" value={d.phone ?? ''} onChange={(v) => set({ phone: v || null })} />
          </div>
          <TextArea label="Biografía breve" value={d.bio} onChange={(bio) => set({ bio })} maxLength={2000} className="sm:col-span-2" />
          <div className="space-y-3 sm:col-span-2">
            <Switch label="Socio" hint="Se muestra primero y con su correo." checked={d.isPartner} onChange={(isPartner) => set({ isPartner })} />
            <Switch label="Visible en el sitio" checked={d.isVisible} onChange={(isVisible) => set({ isVisible })} />
          </div>
        </div>
      )}
    />
  )
}
