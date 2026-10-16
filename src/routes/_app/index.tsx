import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Card, ErrorBox, Loading, PageHeader, formatDate } from '#/components/ui'
import { WEB_URL, api } from '#/lib/api'
import type { Stats } from '#/lib/types'

export const Route = createFileRoute('/_app/')({ component: Dashboard })

function Dashboard() {
  const { data, isPending, error } = useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/admin/stats') })
  const { user } = Route.useRouteContext()

  if (isPending) return <Loading />
  if (error) return <ErrorBox error={error} />
  const c = data.counts

  return (
    <>
      <PageHeader
        title={`Hola, ${user.name.split(' ')[0]}`}
        description="Resumen del centro de consultas en los últimos 30 días."
        actions={
          <Link to="/articulos/nuevo" className="inline-flex h-10 items-center rounded-[3px] bg-brand px-4 text-sm font-medium text-white hover:bg-brand-2">
            + Nuevo artículo
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-line bg-line lg:grid-cols-4">
        <Metric label="Artículos publicados" value={c.published} to="/articulos" />
        <Metric label="Borradores" value={c.drafts} to="/articulos" search={{ status: 'draft' }} />
        <Metric label="Mensajes sin leer" value={c.newMessages} to="/mensajes" highlight={c.newMessages > 0} />
        <Metric label="Búsquedas (30 días)" value={c.searches} to="/buscador" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card
          title="Búsquedas sin resultados"
          actions={
            <Link to="/buscador" className="text-[13px] text-brand hover:underline">
              Ver informe
            </Link>
          }
        >
          <p className="mb-3 text-[13px] text-muted">Temas que los visitantes buscan y aún no tienen guía. Son la mejor lista de próximos artículos.</p>
          {data.zeroResultSearches.length ? (
            <ul className="divide-y divide-line">
              {data.zeroResultSearches.map((s) => (
                <li key={s.query} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-ink">«{s.query}»</span>
                  <span className="shrink-0 text-[12.5px] text-muted">
                    {s.count}× · {formatDate(s.lastAt)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-muted">Todavía no hay búsquedas sin resultados.</p>
          )}
        </Card>

        <Card title="Lo más buscado">
          {data.topSearches.length ? (
            <ul className="divide-y divide-line">
              {data.topSearches.map((s) => (
                <li key={s.query} className="flex items-center justify-between gap-3 py-2.5">
                  <a href={`${WEB_URL}/consultas/?q=${encodeURIComponent(s.query)}`} target="_blank" rel="noopener noreferrer" className="truncate text-ink hover:text-brand">
                    {s.query}
                  </a>
                  <span className="shrink-0 text-[12.5px] text-muted">
                    {s.count} búsquedas · ~{s.avgResults} resultados
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-muted">Las búsquedas del sitio aparecerán aquí.</p>
          )}
        </Card>

        <Card title="Guías más leídas" className="lg:col-span-2">
          <ul className="divide-y divide-line">
            {data.topArticles.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-2.5">
                <Link to="/articulos/$id" params={{ id: String(a.id) }} className="truncate text-ink hover:text-brand">
                  {a.title}
                </Link>
                <span className="shrink-0 text-[12.5px] text-muted">{a.views.toLocaleString('es-EC')} lecturas</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}

function Metric({ label, value, to, search, highlight }: { label: string; value: number; to: string; search?: Record<string, string>; highlight?: boolean }) {
  return (
    <Link to={to} search={search} className={`block p-5 transition-colors hover:bg-stone ${highlight ? 'bg-brand-soft' : 'bg-white'}`}>
      <p className="font-serif text-[38px] font-light leading-none text-ink">{value.toLocaleString('es-EC')}</p>
      <p className="mt-2 text-[13px] text-muted">{label}</p>
    </Link>
  )
}
