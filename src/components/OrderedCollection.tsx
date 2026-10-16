import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '#/lib/api'
import { Badge, Button, Empty, ErrorBox, Loading, Modal, PageHeader, errorText, fieldErrors, useUI } from './ui'

interface Item {
  id: number
  isVisible: boolean
}

/**
 * Shared screen for small ordered collections (areas, team, offices):
 * list with up/down reordering, visibility badge and a create/edit modal.
 */
export function OrderedCollection<T extends Item, TDraft extends object>({
  endpoint,
  title,
  description,
  noun,
  toDraft,
  emptyDraft,
  renderRow,
  renderForm,
  wideForm,
}: {
  endpoint: string
  title: string
  description: string
  noun: string
  toDraft: (item: T) => TDraft
  emptyDraft: () => TDraft
  renderRow: (item: T) => React.ReactNode
  renderForm: (draft: TDraft, set: (patch: Partial<TDraft>) => void, errors: Record<string, string>) => React.ReactNode
  wideForm?: boolean
}) {
  const qc = useQueryClient()
  const { toast, confirm } = useUI()
  const key = [endpoint]
  const { data, isPending, error } = useQuery({ queryKey: key, queryFn: () => api<T[]>(endpoint) })
  const [editing, setEditing] = useState<{ id?: number; draft: TDraft } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const invalidate = () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ['settings'] })])

  const save = useMutation({
    mutationFn: ({ id, draft }: { id?: number; draft: TDraft }) =>
      id ? api(`${endpoint}/${id}`, { method: 'PATCH', json: draft }) : api(endpoint, { method: 'POST', json: { ...draft, sortOrder: data?.length ?? 0 } }),
    onSuccess: async () => {
      await invalidate()
      setEditing(null)
      toast('Guardado. Ya se ve en el sitio.')
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      toast(errorText(err), 'error')
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api(`${endpoint}/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
    onError: (err) => toast(errorText(err), 'error'),
  })

  const reorder = useMutation({
    mutationFn: (ids: number[]) => api(`${endpoint}/reorder`, { method: 'POST', json: { ids } }),
    onMutate: (ids) => {
      // optimistic: show the new order right away
      qc.setQueryData<T[]>(key, (old) => (old ? ids.map((id) => old.find((o) => o.id === id)!).filter(Boolean) : old))
    },
    onSettled: invalidate,
  })

  const move = (index: number, delta: number) => {
    if (!data) return
    const ids = data.map((d) => d.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(index + delta, 0, moved)
    reorder.mutate(ids)
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setErrors({})
              setEditing({ draft: emptyDraft() })
            }}
          >
            + Agregar {noun}
          </Button>
        }
      />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : !data.length ? (
        <Empty>Todavía no hay registros.</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-[4px] border border-line bg-white">
          {data.map((item, i) => (
            <li key={item.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex flex-col">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded px-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-25" aria-label="Subir">
                  ▲
                </button>
                <button type="button" disabled={i === data.length - 1} onClick={() => move(i, 1)} className="rounded px-1.5 text-muted hover:bg-stone hover:text-ink disabled:opacity-25" aria-label="Bajar">
                  ▼
                </button>
              </div>
              <div className="min-w-0 flex-1">{renderRow(item)}</div>
              {!item.isVisible && <Badge tone="warn">Oculto</Badge>}
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  onClick={() => {
                    setErrors({})
                    setEditing({ id: item.id, draft: toDraft(item) })
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (await confirm(`¿Eliminar este registro de «${title}»?`)) remove.mutate(item.id)
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={!!editing}
        wide={wideForm}
        onClose={() => setEditing(null)}
        title={editing?.id ? `Editar ${noun}` : `Agregar ${noun}`}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancelar</Button>
            <Button variant="primary" disabled={save.isPending} onClick={() => editing && save.mutate(editing)}>
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        {editing && renderForm(editing.draft, (patch) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e)), errors)}
      </Modal>
    </>
  )
}
