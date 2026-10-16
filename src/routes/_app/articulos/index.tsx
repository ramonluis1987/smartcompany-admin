import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { Badge, Empty, ErrorBox, Loading, PageHeader, Pager, formatDate } from '#/components/ui'
import { WEB_URL, api } from '#/lib/api'
import { categoriesQuery } from '#/lib/queries'
import type { ArticleRow, Paged } from '#/lib/types'

const searchSchema = z.object({
  q: z.string().optional(),
  categoryId: z.number().optional(),
  status: z.enum(['draft', 'published']).optional(),
  protected: z.enum(['true', 'false']).optional(),
  sort: z.enum(['updated', 'published', 'views', 'title']).optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute('/_app/articulos/')({
  validateSearch: searchSchema,
  component: ArticlesPage,
})

function ArticlesPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const [q, setQ] = useState(search.q ?? '')
  const categories = useQuery(categoriesQuery)

  // debounce the text filter into the URL
  useEffect(() => {
    const t = setTimeout(() => {
      if ((search.q ?? '') !== q) void navigate({ search: (s) => ({ ...s, q: q || undefined, page: undefined }), replace: true })
    }, 250)
    return () => clearTimeout(t)
  }, [q, search.q, navigate])

  const params = new URLSearchParams()
  if (search.q) params.set('q', search.q)
  if (search.categoryId) params.set('categoryId', String(search.categoryId))
  if (search.status) params.set('status', search.status)
  if (search.protected) params.set('protected', search.protected)
  params.set('sort', search.sort ?? 'updated')
  params.set('page', String(search.page ?? 1))
  params.set('limit', '25')

  const { data, isPending, error, isFetching } = useQuery({
    queryKey: ['articles', params.toString()],
    queryFn: () => api<Paged<ArticleRow>>(`/admin/articles?${params}`),
    placeholderData: keepPreviousData,
  })

  const set = (patch: Partial<z.infer<typeof searchSchema>>) => navigate({ search: (s) => ({ ...s, ...patch, page: patch.page }) })

  return (
    <>
      <PageHeader
        title="Artículos"
        description="Guías, modelos y respuestas del centro de consultas."
        actions={
          <Link to="/articulos/nuevo" className="inline-flex h-10 items-center rounded-[3px] bg-brand px-4 text-sm font-medium text-white hover:bg-brand-2">
            + Nuevo artículo
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_150px_150px_170px]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título o slug…" className="input" aria-label="Buscar artículos" />
        <select value={search.categoryId ?? ''} onChange={(e) => set({ categoryId: e.target.value ? Number(e.target.value) : undefined })} className="input" aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>
        <select value={search.status ?? ''} onChange={(e) => set({ status: (e.target.value || undefined) as 'draft' | 'published' | undefined })} className="input" aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
        <select value={search.protected ?? ''} onChange={(e) => set({ protected: (e.target.value || undefined) as 'true' | 'false' | undefined })} className="input" aria-label="Acceso">
          <option value="">Todo acceso</option>
          <option value="false">Públicos</option>
          <option value="true">Protegidos</option>
        </select>
        <select value={search.sort ?? 'updated'} onChange={(e) => set({ sort: e.target.value as 'updated' })} className="input" aria-label="Ordenar">
          <option value="updated">Últimos editados</option>
          <option value="published">Fecha de publicación</option>
          <option value="views">Más leídos</option>
          <option value="title">Título A–Z</option>
        </select>
      </div>

      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : data.items.length === 0 ? (
        <Empty>No hay artículos con estos filtros.</Empty>
      ) : (
        <div className={`overflow-x-auto rounded-[4px] border border-line bg-white transition-opacity ${isFetching ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-line bg-stone/50 text-[12px] uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Lecturas</th>
                <th className="px-4 py-3 font-medium">Editado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((a) => (
                <tr key={a.id} className="hover:bg-stone/40">
                  <td className="max-w-[440px] px-4 py-3">
                    <Link to="/articulos/$id" params={{ id: String(a.id) }} className="line-clamp-2 font-medium text-ink hover:text-brand">
                      {a.title}
                    </Link>
                    <a href={`${WEB_URL}${a.url}`} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-[12px] text-muted hover:text-brand">
                      {a.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-[13px]">{a.category.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.status === 'published' ? <Badge tone="brand">Publicado</Badge> : <Badge tone="warn">Borrador</Badge>}
                      {a.protected && <Badge>Protegido</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-[13px] tabular-nums">{a.views.toLocaleString('es-EC')}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-[13px] text-muted">{formatDate(a.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pager page={data.page} total={data.total} limit={data.limit} onPage={(page) => set({ page })} />}
    </>
  )
}
