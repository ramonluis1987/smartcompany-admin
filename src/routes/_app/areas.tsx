import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { OrderedCollection } from '#/components/OrderedCollection'
import { RichTextEditor } from '#/components/RichTextEditor'
import { Field, Select, Switch, TextArea, TextField } from '#/components/ui'
import { WEB_URL } from '#/lib/api'
import { categoriesQuery } from '#/lib/queries'
import type { PracticeArea } from '#/lib/types'

export const Route = createFileRoute('/_app/areas')({ component: AreasPage })

const ICONS = [
  { value: 'scale', label: 'Balanza (penal)' },
  { value: 'document', label: 'Documento (civil)' },
  { value: 'briefcase', label: 'Maletín (laboral)' },
  { value: 'family', label: 'Familia' },
  { value: 'car', label: 'Vehículo (tránsito)' },
  { value: 'building', label: 'Edificio (empresas)' },
  { value: 'shield', label: 'Escudo (seguros)' },
  { value: 'globe', label: 'Globo (migración)' },
  { value: 'home', label: 'Casa (inquilinato)' },
  { value: 'coins', label: 'Monedas (tributario)' },
]

type Draft = Omit<PracticeArea, 'id' | 'sortOrder'>

function AreasPage() {
  const categories = useQuery(categoriesQuery)
  return (
    <OrderedCollection<PracticeArea, Draft>
      endpoint="/admin/areas"
      title="Áreas de práctica"
      description="Las tarjetas de la portada y sus páginas. Vincule cada área a una categoría para listar sus guías."
      noun="área"
      wideForm
      emptyDraft={() => ({ slug: '', title: '', summary: '', bodyHtml: '', icon: 'scale', categoryId: null, isVisible: true })}
      toDraft={({ id: _id, sortOrder: _s, ...rest }) => rest}
      renderRow={(a) => (
        <>
          <p className="font-medium text-ink">{a.title}</p>
          <a href={`${WEB_URL}/areas-de-practica/${a.slug}/`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-muted hover:text-brand">
            /areas-de-practica/{a.slug}/
          </a>
        </>
      )}
      renderForm={(d, set, errors) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Título" value={d.title} error={errors.title} onChange={(title) => set({ title })} />
            <TextField label="Slug" value={d.slug} onChange={(slug) => set({ slug })} hint="Se genera del título si lo deja vacío." />
            <Select label="Ícono" value={d.icon} onChange={(icon) => set({ icon })} options={ICONS} />
            <Select
              label="Categoría de guías"
              value={d.categoryId ?? 0}
              onChange={(v) => set({ categoryId: v || null })}
              options={[{ value: 0, label: 'Ninguna' }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
          <TextArea label="Resumen" hint="Texto de la tarjeta en la portada." value={d.summary} onChange={(summary) => set({ summary })} maxLength={600} />
          <Field label="Contenido de la página">{() => <RichTextEditor value={d.bodyHtml} onChange={(bodyHtml) => set({ bodyHtml })} />}</Field>
          <Switch label="Visible en el sitio" checked={d.isVisible} onChange={(isVisible) => set({ isVisible })} />
        </div>
      )}
    />
  )
}
