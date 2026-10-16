import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Card, ErrorBox, Loading, Modal, PageHeader, TextField, errorText, fieldErrors, formatDate, useUI } from '#/components/ui'
import { WEB_URL, api } from '#/lib/api'
import type { Stats, Synonym } from '#/lib/types'

export const Route = createFileRoute('/_app/buscador')({ component: SearchPage })

type Report = Pick<Stats, 'topSearches' | 'zeroResultSearches'>

function SearchPage() {
  const [days, setDays] = useState(30)
  const report = useQuery({ queryKey: ['search-report', days], queryFn: () => api<Report>(`/admin/stats/searches?days=${days}`) })

  return (
    <>
      <PageHeader
        title="Buscador"
        description="Qué buscan los visitantes en el centro de consultas y cómo ayudar al buscador a entenderlos."
        actions={
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input w-auto" aria-label="Periodo">
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
            <option value={365}>Último año</option>
          </select>
        }
      />
      {report.isPending ? (
        <Loading />
      ) : report.error ? (
        <ErrorBox error={report.error} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Sin resultados">
            <p className="mb-3 text-[13px] text-muted">Escriba una guía sobre estos temas o agregue un sinónimo para que la búsqueda encuentre una guía existente.</p>
            <QueryList rows={report.data.zeroResultSearches.map((s) => ({ query: s.query, meta: `${s.count}× · ${formatDate(s.lastAt)}` }))} />
          </Card>
          <Card title="Más buscado">
            <QueryList rows={report.data.topSearches.map((s) => ({ query: s.query, meta: `${s.count} búsquedas · ~${s.avgResults} resultados` }))} />
          </Card>
        </div>
      )}
      <Synonyms />
    </>
  )
}

function QueryList({ rows }: { rows: { query: string; meta: string }[] }) {
  if (!rows.length) return <p className="py-4 text-muted">Sin datos en este periodo.</p>
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.query} className="flex items-center justify-between gap-3 py-2.5">
          <a href={`${WEB_URL}/consultas/?q=${encodeURIComponent(r.query)}`} target="_blank" rel="noopener noreferrer" className="truncate text-ink hover:text-brand">
            {r.query}
          </a>
          <span className="shrink-0 text-[12.5px] text-muted">{r.meta}</span>
        </li>
      ))}
    </ul>
  )
}

function Synonyms() {
  const qc = useQueryClient()
  const { toast, confirm } = useUI()
  const { data, isPending, error } = useQuery({ queryKey: ['synonyms'], queryFn: () => api<Synonym[]>('/admin/search/synonyms') })
  const [draft, setDraft] = useState<{ id?: number; term: string; alternatives: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('')

  const save = useMutation({
    mutationFn: (d: NonNullable<typeof draft>) => {
      const body = { term: d.term, alternatives: d.alternatives.split(',').map((s) => s.trim()).filter(Boolean) }
      return d.id ? api(`/admin/search/synonyms/${d.id}`, { method: 'PATCH', json: body }) : api('/admin/search/synonyms', { method: 'POST', json: body })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['synonyms'] })
      setDraft(null)
      toast('Sinónimo guardado. Ya se aplica en el buscador.')
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      toast(errorText(err), 'error')
    },
  })
  const remove = useMutation({
    mutationFn: (id: number) => api(`/admin/search/synonyms/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['synonyms'] }),
    onError: (err) => toast(errorText(err), 'error'),
  })

  const rows = (data ?? []).filter((s) => !filter || s.term.includes(filter.toLowerCase()) || s.alternatives.some((a) => a.includes(filter.toLowerCase())))

  return (
    <Card
      title="Sinónimos"
      className="mt-6"
      actions={
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            setErrors({})
            setDraft({ term: '', alternatives: '' })
          }}
        >
          + Agregar
        </Button>
      }
    >
      <p className="mb-4 max-w-3xl text-[13px] text-muted">
        Cómo pregunta la gente frente a cómo están escritas las guías. Si alguien busca «<strong className="text-ink">chocaron</strong>», el buscador también busca «accidente» y «choque». Las tildes y mayúsculas no importan.
      </p>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar…" className="input mb-3 max-w-xs" aria-label="Filtrar sinónimos" />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span>
                <strong className="font-medium text-ink">{s.term}</strong> <span className="text-muted">→</span> {s.alternatives.join(', ')}
              </span>
              <span className="flex gap-1.5">
                <Button
                  size="sm"
                  onClick={() => {
                    setErrors({})
                    setDraft({ id: s.id, term: s.term, alternatives: s.alternatives.join(', ') })
                  }}
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (await confirm(`¿Eliminar el sinónimo «${s.term}»?`)) remove.mutate(s.id)
                  }}
                >
                  Eliminar
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Editar sinónimo' : 'Nuevo sinónimo'}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>Cancelar</Button>
            <Button variant="primary" disabled={save.isPending || !draft?.term || !draft.alternatives} onClick={() => draft && save.mutate(draft)}>
              Guardar
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <TextField label="Cuando alguien busca…" value={draft.term} error={errors.term} onChange={(term) => setDraft({ ...draft, term })} hint="Una sola palabra, p. ej. «carro»." />
            <TextField
              label="…buscar también"
              value={draft.alternatives}
              error={errors.alternatives}
              onChange={(alternatives) => setDraft({ ...draft, alternatives })}
              hint="Palabras separadas por coma, p. ej. «vehiculo, automovil»."
            />
          </div>
        )}
      </Modal>
    </Card>
  )
}
