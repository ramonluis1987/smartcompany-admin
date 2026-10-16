import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Badge, Button, ErrorBox, Loading, Modal, PageHeader, Switch, TextArea, TextField, errorText, fieldErrors, useUI } from '#/components/ui'
import { WEB_URL, api } from '#/lib/api'
import { categoriesQuery } from '#/lib/queries'
import type { Category } from '#/lib/types'

export const Route = createFileRoute('/_app/categorias')({ component: CategoriesPage })

type Draft = { id?: number; name: string; slug: string; description: string; isPublic: boolean; sortOrder: number }
const empty: Draft = { name: '', slug: '', description: '', isPublic: true, sortOrder: 0 }

function CategoriesPage() {
  const qc = useQueryClient()
  const { toast, confirm } = useUI()
  const { data, isPending, error } = useQuery(categoriesQuery)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = { name: d.name, slug: d.slug || null, description: d.description, isPublic: d.isPublic, sortOrder: d.sortOrder }
      return d.id ? api(`/admin/categories/${d.id}`, { method: 'PATCH', json: body }) : api('/admin/categories', { method: 'POST', json: body })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'] })
      setDraft(null)
      toast('Categoría guardada')
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      toast(errorText(err), 'error')
    },
  })

  const remove = useMutation({
    mutationFn: (c: Category) => api(`/admin/categories/${c.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories'] })
      toast('Categoría eliminada')
    },
    onError: (err) => toast(errorText(err), 'error'),
  })

  const open = (c?: Category) => {
    setErrors({})
    setDraft(c ? { id: c.id, name: c.name, slug: c.slug, description: c.description, isPublic: c.isPublic, sortOrder: c.sortOrder } : { ...empty, sortOrder: (data?.length ?? 0) + 1 })
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Materias del centro de consultas. El slug forma parte de la dirección de cada guía."
        actions={
          <Button variant="primary" onClick={() => open()}>
            + Nueva categoría
          </Button>
        }
      />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : (
        <div className="overflow-x-auto rounded-[4px] border border-line bg-white">
          <table className="w-full min-w-[680px] text-left">
            <thead className="border-b border-line bg-stone/50 text-[12px] uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Orden</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 text-right font-medium">Artículos</th>
                <th className="px-4 py-3 font-medium">Visibilidad</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.map((c) => (
                <tr key={c.id} className="hover:bg-stone/40">
                  <td className="px-4 py-3 text-[13px] tabular-nums text-muted">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => open(c)} className="text-left font-medium text-ink hover:text-brand">
                      {c.name}
                    </button>
                    <a href={`${WEB_URL}/${c.slug}/`} target="_blank" rel="noopener noreferrer" className="block text-[12px] text-muted hover:text-brand">
                      /{c.slug}/
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                    <Link to="/articulos" search={{ categoryId: c.id }} className="hover:text-brand">
                      {c.publishedCount} <span className="text-muted">/ {c.count}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{c.isPublic ? <Badge tone="brand">Pública</Badge> : <Badge tone="warn">Privada</Badge>}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" onClick={() => open(c)}>
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={async () => {
                          if (await confirm(`¿Eliminar la categoría «${c.name}»?`)) remove.mutate(c)
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Editar categoría' : 'Nueva categoría'}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>Cancelar</Button>
            <Button variant="primary" disabled={save.isPending || !draft?.name} onClick={() => draft && save.mutate(draft)}>
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <TextField label="Nombre" value={draft.name} error={errors.name} onChange={(name) => setDraft({ ...draft, name })} />
            <TextField
              label="Slug"
              value={draft.slug}
              error={errors.slug}
              onChange={(slug) => setDraft({ ...draft, slug })}
              hint={draft.id ? 'Cambiarlo cambia la dirección de todas sus guías (las antiguas redirigen a las nuevas).' : 'Se genera del nombre si lo deja vacío.'}
            />
            <TextArea label="Descripción" hint="Aparece en la página de la categoría y en Google." value={draft.description} onChange={(description) => setDraft({ ...draft, description })} rows={3} maxLength={2000} />
            <TextField label="Orden" type="number" value={String(draft.sortOrder)} onChange={(v) => setDraft({ ...draft, sortOrder: Number(v) || 0 })} hint="Menor número = aparece primero." />
            <Switch
              label="Pública"
              hint="Las privadas (p. ej. seguimiento de clientes) no aparecen en listados, buscador ni sitemap; sus guías solo se abren con el enlace directo."
              checked={draft.isPublic}
              onChange={(isPublic) => setDraft({ ...draft, isPublic })}
            />
          </div>
        )}
      </Modal>
    </>
  )
}
