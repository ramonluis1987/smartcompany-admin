import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ImageInput } from '#/components/ImageInput'
import { Button, Card, ErrorBox, Loading, PageHeader, TextArea, TextField, errorText, useUI } from '#/components/ui'
import { WEB_URL, api } from '#/lib/api'
import type { Settings } from '#/lib/types'

type Key = keyof Settings
type Spec = { name: string; label: string; kind?: 'text' | 'textarea' | 'image'; hint?: string; max?: number }
type Section = { title: string; fields: Spec[] }

const EMPHASIS = 'Encierre entre *asteriscos* las palabras que se muestran en verde cursiva.'

const FORMS: Record<Key, { label: string; description: string; sections: Section[] }> = {
  site: {
    label: 'Datos generales',
    description: 'Nombre, contacto y textos que aparecen en todas las páginas.',
    sections: [
      {
        title: 'Identidad',
        fields: [
          { name: 'name', label: 'Nombre del estudio' },
          { name: 'tagline', label: 'Subtítulo', hint: 'Debajo del nombre, p. ej. «Abogados & Auditores».' },
          { name: 'metaDescription', label: 'Descripción para Google', kind: 'textarea', max: 320 },
          { name: 'topbarCities', label: 'Ciudades (barra superior)' },
          { name: 'footerText', label: 'Texto del pie de página', kind: 'textarea', max: 600 },
        ],
      },
      {
        title: 'Contacto',
        fields: [
          { name: 'phone', label: 'Teléfono matriz' },
          { name: 'whatsapp', label: 'WhatsApp', hint: 'Solo números con código de país, p. ej. 593969001346.' },
          { name: 'email', label: 'Correo' },
          { name: 'hours', label: 'Horario de atención' },
          { name: 'instagram', label: 'Instagram (URL)' },
        ],
      },
    ],
  },
  home: {
    label: 'Página de inicio',
    description: 'Cada bloque de la portada, en orden.',
    sections: [
      {
        title: 'Portada',
        fields: [
          { name: 'heroEyebrow', label: 'Antetítulo' },
          { name: 'heroTitle', label: 'Título principal', kind: 'textarea', hint: EMPHASIS, max: 200 },
          { name: 'heroText', label: 'Texto', kind: 'textarea', max: 600 },
          { name: 'heroImage', label: 'Fotografía', kind: 'image' },
          { name: 'heroCaptionLeft', label: 'Pie de foto (izquierda)' },
          { name: 'heroCaptionRight', label: 'Pie de foto (derecha)' },
        ],
      },
      {
        title: 'Áreas de práctica',
        fields: [
          { name: 'areasEyebrow', label: 'Antetítulo' },
          { name: 'areasTitle', label: 'Título', kind: 'textarea', hint: EMPHASIS, max: 200 },
          { name: 'areasText', label: 'Texto', kind: 'textarea', max: 600 },
        ],
      },
      {
        title: 'Franja de declaración',
        fields: [
          { name: 'statementEyebrow', label: 'Antetítulo' },
          { name: 'statementQuote', label: 'Declaración', kind: 'textarea', hint: EMPHASIS, max: 800 },
          { name: 'statementAuthor', label: 'Firma' },
          { name: 'statementImage', label: 'Fotografía de fondo', kind: 'image' },
        ],
      },
      {
        title: 'Centro de consultas',
        fields: [
          { name: 'consultasEyebrow', label: 'Antetítulo' },
          { name: 'consultasTitle', label: 'Título', kind: 'textarea', hint: EMPHASIS, max: 200 },
          { name: 'consultasText', label: 'Texto', kind: 'textarea', max: 600 },
          { name: 'consultasImage', label: 'Fotografía', kind: 'image' },
        ],
      },
      {
        title: 'Equipo',
        fields: [
          { name: 'teamEyebrow', label: 'Antetítulo' },
          { name: 'teamTitle', label: 'Título', kind: 'textarea', hint: EMPHASIS, max: 200 },
          { name: 'teamText', label: 'Texto', kind: 'textarea', max: 600 },
        ],
      },
      {
        title: 'Oficinas',
        fields: [
          { name: 'officesEyebrow', label: 'Antetítulo' },
          { name: 'officesTitle', label: 'Título', kind: 'textarea', hint: EMPHASIS, max: 200 },
          { name: 'officesText', label: 'Texto', kind: 'textarea', max: 600 },
        ],
      },
      {
        title: 'Contacto',
        fields: [
          { name: 'contactEyebrow', label: 'Antetítulo' },
          { name: 'contactTitle', label: 'Título', kind: 'textarea', hint: EMPHASIS, max: 200 },
          { name: 'contactText', label: 'Texto', kind: 'textarea', max: 600 },
        ],
      },
    ],
  },
  consultas: {
    label: 'Centro de consultas',
    description: 'Textos de la página del buscador y de cada guía.',
    sections: [
      {
        title: 'Página del buscador',
        fields: [
          { name: 'title', label: 'Título' },
          { name: 'intro', label: 'Introducción', kind: 'textarea', max: 800 },
          { name: 'searchPlaceholder', label: 'Texto de ayuda del buscador' },
        ],
      },
      {
        title: 'En cada guía',
        fields: [
          { name: 'articleCtaTitle', label: 'Título del formulario de asesoría' },
          { name: 'articleCtaText', label: 'Texto del formulario', kind: 'textarea', max: 600 },
          { name: 'protectedText', label: 'Mensaje en documentos protegidos', kind: 'textarea', max: 600 },
        ],
      },
    ],
  },
}

export const Route = createFileRoute('/_app/contenido')({
  validateSearch: z.object({ tab: z.enum(['site', 'home', 'consultas']).optional() }),
  component: ContentPage,
})

function ContentPage() {
  const { tab = 'home' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data, isPending, error } = useQuery({ queryKey: ['settings'], queryFn: () => api<Settings>('/admin/settings') })

  return (
    <>
      <PageHeader title="Textos del sitio" description="Todo el texto del sitio público. Los cambios se ven en el sitio apenas guarda." />
      <div className="mb-6 flex gap-1 border-b border-line" role="tablist">
        {(Object.keys(FORMS) as Key[]).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => navigate({ search: { tab: k } })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm transition-colors ${tab === k ? 'border-brand font-medium text-brand' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {FORMS[k].label}
          </button>
        ))}
      </div>
      {isPending ? <Loading /> : error ? <ErrorBox error={error} /> : <SettingsForm key={tab} settingsKey={tab} initial={data[tab]} />}
    </>
  )
}

function SettingsForm({ settingsKey, initial }: { settingsKey: Key; initial: Record<string, unknown> }) {
  const qc = useQueryClient()
  const { toast } = useUI()
  const [values, setValues] = useState<Record<string, unknown>>(initial)
  const [dirty, setDirty] = useState(false)
  const form = FORMS[settingsKey]
  const set = (name: string, v: unknown) => {
    setValues((s) => ({ ...s, [name]: v }))
    setDirty(true)
  }

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => dirty && e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const save = useMutation({
    mutationFn: () => api(`/admin/settings/${settingsKey}`, { method: 'PUT', json: values }),
    onSuccess: async () => {
      setDirty(false)
      await qc.invalidateQueries({ queryKey: ['settings'] })
      toast('Cambios publicados en el sitio')
    },
    onError: (err) => toast(errorText(err), 'error'),
  })

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-20 -mx-1 flex items-center justify-between gap-3 bg-paper/95 px-1 py-3 backdrop-blur">
        <p className="text-[13px] text-muted">{form.description}</p>
        <div className="flex gap-2">
          <a href={WEB_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-[3px] border border-line bg-white px-4 text-sm hover:border-ink">
            Ver sitio ↗
          </a>
          <Button variant="primary" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}
          </Button>
        </div>
      </div>

      {form.sections.map((section) => (
        <Card key={section.title} title={section.title}>
          <div className="grid gap-4 md:grid-cols-2">
            {section.fields.map((f) =>
              f.kind === 'image' ? (
                <ImageInput key={f.name} label={f.label} value={typeof values[f.name] === 'string' && values[f.name] ? String(values[f.name]) : null} onChange={(v) => set(f.name, v ?? '')} aspect="aspect-[16/10]" />
              ) : f.kind === 'textarea' ? (
                <TextArea key={f.name} label={f.label} hint={f.hint} value={typeof values[f.name] === 'string' ? String(values[f.name]) : ''} onChange={(v) => set(f.name, v)} maxLength={f.max} className="md:col-span-2" />
              ) : (
                <TextField key={f.name} label={f.label} hint={f.hint} value={typeof values[f.name] === 'string' ? String(values[f.name]) : ''} onChange={(v) => set(f.name, v)} />
              ),
            )}
          </div>
        </Card>
      ))}

      {settingsKey === 'home' && <StatsEditor value={Array.isArray(values.stats) ? (values.stats as { value: string; label: string }[]) : []} onChange={(v) => set('stats', v)} />}
      {settingsKey === 'consultas' && (
        <Card title="Búsquedas sugeridas">
          <TextArea
            label="Una por línea"
            hint="Se muestran al hacer clic en el buscador vacío (máximo 12)."
            rows={7}
            value={(Array.isArray(values.suggestions) ? (values.suggestions as string[]) : []).join('\n')}
            onChange={(v) => set('suggestions', v.split('\n').map((s) => s.trimStart()).slice(0, 12))}
          />
        </Card>
      )}
    </div>
  )
}

function StatsEditor({ value, onChange }: { value: { value: string; label: string }[]; onChange: (v: { value: string; label: string }[]) => void }) {
  const update = (i: number, patch: Partial<{ value: string; label: string }>) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  return (
    <Card
      title="Cifras bajo la portada"
      actions={
        value.length < 6 && (
          <Button size="sm" onClick={() => onChange([...value, { value: '', label: '' }])}>
            + Agregar cifra
          </Button>
        )
      }
    >
      <div className="space-y-3">
        {value.map((s, i) => (
          <div key={i} className="grid items-end gap-3 sm:grid-cols-[120px_1fr_auto]">
            <TextField label="Cifra" value={s.value} onChange={(v) => update(i, { value: v })} />
            <TextField label="Descripción" value={s.label} onChange={(v) => update(i, { label: v })} />
            <Button variant="ghost" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Quitar cifra">
              Quitar
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
