import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Badge, Button, Empty, ErrorBox, Loading, PageHeader, Pager, errorText, formatDate, useUI } from '#/components/ui'
import { api } from '#/lib/api'
import type { Message, Paged } from '#/lib/types'

export const Route = createFileRoute('/_app/mensajes')({
  validateSearch: z.object({ status: z.enum(['new', 'read', 'archived']).optional(), page: z.number().optional() }),
  component: MessagesPage,
})

const TABS = [
  { value: undefined, label: 'Todos' },
  { value: 'new', label: 'Nuevos' },
  { value: 'read', label: 'Leídos' },
  { value: 'archived', label: 'Archivados' },
] as const

function MessagesPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const qc = useQueryClient()
  const { toast, confirm } = useUI()
  const params = new URLSearchParams({ page: String(search.page ?? 1), limit: '20' })
  if (search.status) params.set('status', search.status)
  const { data, isPending, error } = useQuery({
    queryKey: ['messages', params.toString()],
    queryFn: () => api<Paged<Message>>(`/admin/messages?${params}`),
    placeholderData: keepPreviousData,
  })

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ['messages'] }), qc.invalidateQueries({ queryKey: ['stats'] })])
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Message['status'] }) => api(`/admin/messages/${id}`, { method: 'PATCH', json: { status } }),
    onSuccess: refresh,
    onError: (err) => toast(errorText(err), 'error'),
  })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/admin/messages/${id}`, { method: 'DELETE' }),
    onSuccess: refresh,
    onError: (err) => toast(errorText(err), 'error'),
  })

  return (
    <>
      <PageHeader title="Mensajes" description="Consultas recibidas desde los formularios del sitio." />
      <div className="mb-5 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            onClick={() => navigate({ search: { status: t.value } })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm ${search.status === t.value ? 'border-brand font-medium text-brand' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : !data.items.length ? (
        <Empty>No hay mensajes aquí.</Empty>
      ) : (
        <ul className="space-y-3">
          {data.items.map((m) => (
            <li key={m.id} className={`rounded-[4px] border bg-white p-5 ${m.status === 'new' ? 'border-brand/40 shadow-[inset_3px_0_0_var(--color-brand)]' : 'border-line'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">
                    {m.name} {m.status === 'new' && <Badge tone="brand">Nuevo</Badge>} {m.matter && <Badge>{m.matter}</Badge>}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-[13px]">
                    {m.phone && (
                      <>
                        <a href={`tel:${m.phone}`} className="text-brand hover:underline">
                          {m.phone}
                        </a>
                        <a href={`https://wa.me/${m.phone.replace(/\D/g, '').replace(/^0/, '593')}`} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                          WhatsApp
                        </a>
                      </>
                    )}
                    {m.email && (
                      <a href={`mailto:${m.email}`} className="text-brand hover:underline">
                        {m.email}
                      </a>
                    )}
                  </p>
                </div>
                <span className="text-[12.5px] text-muted">{formatDate(m.createdAt)}</span>
              </div>
              <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-ink">{m.message}</p>
              {(m.articleTitle || m.pageUrl) && (
                <p className="mt-2 text-[12.5px] text-muted">
                  Enviado desde:{' '}
                  {m.pageUrl ? (
                    <a href={m.pageUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand">
                      {m.articleTitle ?? m.pageUrl}
                    </a>
                  ) : (
                    m.articleTitle
                  )}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {m.status !== 'read' && (
                  <Button size="sm" onClick={() => setStatus.mutate({ id: m.id, status: 'read' })}>
                    Marcar leído
                  </Button>
                )}
                {m.status !== 'new' && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: m.id, status: 'new' })}>
                    Marcar no leído
                  </Button>
                )}
                {m.status !== 'archived' && (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: m.id, status: 'archived' })}>
                    Archivar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (await confirm('¿Eliminar este mensaje definitivamente?')) remove.mutate(m.id)
                  }}
                >
                  Eliminar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && <Pager page={data.page} total={data.total} limit={data.limit} onPage={(page) => navigate({ search: (s) => ({ ...s, page }) })} />}
    </>
  )
}
