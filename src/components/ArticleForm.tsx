import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { WEB_URL, api } from '#/lib/api'
import { categoriesQuery } from '#/lib/queries'
import type { Article } from '#/lib/types'
import { RichTextEditor } from './RichTextEditor'
import { Badge, Button, Card, Field, PageHeader, Select, Switch, TextArea, TextField, errorText, fieldErrors, formatDate, useUI } from './ui'

const slugify = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

interface FormState {
  title: string
  slug: string
  excerpt: string
  contentHtml: string
  categoryId: number
  categoryIds: number[]
  status: 'draft' | 'published'
  seoTitle: string
  seoDescription: string
  featured: boolean
  publishedAt: string
  protected: boolean
  password: string
}

export function ArticleForm({ article }: { article?: Article }) {
  const isNew = !article
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { toast, confirm } = useUI()
  const categories = useQuery(categoriesQuery)
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [f, setF] = useState<FormState>(() => ({
    title: article?.title ?? '',
    slug: article?.slug ?? '',
    excerpt: article?.excerpt ?? '',
    contentHtml: article?.contentHtml ?? '',
    categoryId: article?.categoryId ?? 0,
    categoryIds: article?.categoryIds.filter((id) => id !== article.categoryId) ?? [],
    status: article?.status ?? 'draft',
    seoTitle: article?.seoTitle ?? '',
    seoDescription: article?.seoDescription ?? '',
    featured: article?.featured ?? false,
    publishedAt: toLocalInput(article?.publishedAt ?? null),
    protected: article?.hasPassword ?? false,
    password: '',
  }))
  const [dirty, setDirty] = useState(false)
  const set = <TKey extends keyof FormState>(key: TKey, value: FormState[TKey]) => {
    setF((s) => ({ ...s, [key]: value }))
    setDirty(true)
  }

  const save = useMutation({
    mutationFn: (status?: 'draft' | 'published') => {
      const finalStatus = status ?? f.status
      const body = {
        title: f.title,
        slug: f.slug || null,
        excerpt: f.excerpt || null,
        contentHtml: f.contentHtml,
        categoryId: f.categoryId,
        categoryIds: f.categoryIds,
        status: finalStatus,
        seoTitle: f.seoTitle || null,
        seoDescription: f.seoDescription || null,
        featured: f.featured,
        publishedAt: f.publishedAt ? new Date(f.publishedAt).toISOString() : null,
        // undefined keeps the current password; null removes protection
        password: !f.protected ? (article?.hasPassword ? null : undefined) : f.password ? f.password : undefined,
      }
      return isNew ? api<Article>('/admin/articles', { method: 'POST', json: body }) : api<Article>(`/admin/articles/${article.id}`, { method: 'PATCH', json: body })
    },
    onSuccess: async (saved) => {
      setErrors({})
      setDirty(false)
      await qc.invalidateQueries({ queryKey: ['articles'] })
      qc.setQueryData(['article', saved.id], saved)
      void qc.invalidateQueries({ queryKey: ['stats'] })
      void qc.invalidateQueries({ queryKey: ['categories'] })
      toast(saved.status === 'published' ? 'Guardado y publicado en el sitio' : 'Borrador guardado')
      if (isNew) await navigate({ to: '/articulos/$id', params: { id: String(saved.id) } })
      else setF((s) => ({ ...s, slug: saved.slug, status: saved.status, password: '', protected: saved.hasPassword }))
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      toast(errorText(err), 'error')
    },
  })

  const remove = useMutation({
    mutationFn: () => api(`/admin/articles/${article!.id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['articles'] })
      toast('Artículo eliminado')
      await navigate({ to: '/articulos' })
    },
    onError: (err) => toast(errorText(err), 'error'),
  })

  const catOptions = [{ value: 0, label: 'Elija la categoría principal…' }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]
  const primary = categories.data?.find((c) => c.id === f.categoryId)
  const previewUrl = primary ? `/${primary.slug}/${f.slug || slugify(f.title)}/` : null

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate(undefined)
      }}
    >
      <PageHeader
        title={isNew ? 'Nuevo artículo' : 'Editar artículo'}
        description={
          article ? (
            <span className="flex flex-wrap items-center gap-2">
              {article.status === 'published' ? <Badge tone="brand">Publicado</Badge> : <Badge tone="warn">Borrador</Badge>}
              <span>Editado {formatDate(article.updatedAt)}</span>
              <span>· {article.views.toLocaleString('es-EC')} lecturas</span>
            </span>
          ) : (
            'Las guías publicadas aparecen de inmediato en el sitio y en el buscador.'
          )
        }
        actions={
          <>
            <Link to="/articulos" className="inline-flex h-10 items-center px-3 text-sm text-muted hover:text-ink">
              ← Volver
            </Link>
            {article?.status === 'published' && (
              <a href={`${WEB_URL}${article.url}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-[3px] border border-line bg-white px-4 text-sm hover:border-ink">
                Ver en el sitio ↗
              </a>
            )}
            {f.status === 'draft' ? (
              <>
                <Button type="submit" disabled={save.isPending}>
                  Guardar borrador
                </Button>
                <Button variant="primary" disabled={save.isPending} onClick={() => save.mutate('published')}>
                  Publicar
                </Button>
              </>
            ) : (
              <Button type="submit" variant="primary" disabled={save.isPending}>
                {save.isPending ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Guardado'}
              </Button>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <TextField
            label="Título"
            value={f.title}
            error={errors.title}
            onChange={(v) => {
              set('title', v)
              if (!slugTouched) set('slug', slugify(v))
            }}
            className="[&_input]:font-serif [&_input]:text-[22px]"
            placeholder="Ej.: Despido intempestivo, Art. 188 C.T., Ecuador 2026."
          />
          <Field label="Contenido" error={errors.contentHtml}>
            {() => <RichTextEditor value={f.contentHtml} onChange={(v) => set('contentHtml', v)} />}
          </Field>
          <TextArea
            label="Extracto"
            hint="Resumen que aparece en listados y resultados de búsqueda. Si lo deja vacío se genera del contenido."
            value={f.excerpt}
            onChange={(v) => set('excerpt', v)}
            maxLength={600}
          />
        </div>

        <div className="space-y-5">
          <Card title="Publicación">
            <div className="space-y-4">
              <Select label="Estado" value={f.status} onChange={(v) => set('status', v)} options={[{ value: 'draft', label: 'Borrador (no visible)' }, { value: 'published', label: 'Publicado' }]} />
              <Field label="Fecha de publicación" hint="Vacía = ahora, al publicar.">
                {(id) => <input id={id} type="datetime-local" value={f.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} className="input" />}
              </Field>
              <Switch label="Destacado" hint="Marca la guía como destacada." checked={f.featured} onChange={(v) => set('featured', v)} />
            </div>
          </Card>

          <Card title="Categorías">
            <div className="space-y-4">
              <Select label="Categoría principal" hint="Forma parte de la dirección (URL) de la guía." value={f.categoryId} onChange={(v) => set('categoryId', v)} options={catOptions} />
              {errors.categoryId && <p className="text-[12.5px] text-danger">{errors.categoryId}</p>}
              <details className="rounded-[3px] border border-line">
                <summary className="cursor-pointer px-3 py-2 text-[13px] text-ink">Otras categorías ({f.categoryIds.length})</summary>
                <ul className="max-h-60 overflow-y-auto border-t border-line px-3 py-2">
                  {categories.data
                    ?.filter((c) => c.id !== f.categoryId)
                    .map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-2 py-1 text-[13px]">
                          <input
                            type="checkbox"
                            checked={f.categoryIds.includes(c.id)}
                            onChange={(e) => set('categoryIds', e.target.checked ? [...f.categoryIds, c.id] : f.categoryIds.filter((id) => id !== c.id))}
                            className="accent-brand"
                          />
                          {c.name}
                        </label>
                      </li>
                    ))}
                </ul>
              </details>
            </div>
          </Card>

          <Card title="Dirección y SEO">
            <div className="space-y-4">
              <TextField
                label="Slug"
                value={f.slug}
                error={errors.slug}
                onChange={(v) => {
                  setSlugTouched(true)
                  set('slug', v)
                }}
                hint={
                  <>
                    {previewUrl && <span className="block break-all">{previewUrl}</span>}
                    {!isNew && 'Si lo cambia, la dirección anterior redirige automáticamente a la nueva.'}
                  </>
                }
              />
              <TextField label="Título SEO" hint="Opcional. Reemplaza el título en Google." value={f.seoTitle} onChange={(v) => set('seoTitle', v)} maxLength={200} />
              <TextArea label="Descripción SEO" hint="Opcional. Ideal: 140–160 caracteres." value={f.seoDescription} onChange={(v) => set('seoDescription', v)} maxLength={320} />
              {!!article?.oldSlugs.length && (
                <details className="text-[12.5px] text-muted">
                  <summary className="cursor-pointer">Direcciones anteriores ({article.oldSlugs.length})</summary>
                  <ul className="mt-1.5 space-y-0.5 break-all">
                    {article.oldSlugs.map((s) => (
                      <li key={s}>/{s}/</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </Card>

          <Card title="Acceso">
            <div className="space-y-4">
              <Switch
                label="Protegido con contraseña"
                hint="El contenido solo se muestra a quien tenga la contraseña (modelos, documentos de clientes). No aparece en el buscador."
                checked={f.protected}
                onChange={(v) => set('protected', v)}
              />
              {f.protected && (
                <TextField
                  label={article?.hasPassword ? 'Nueva contraseña' : 'Contraseña'}
                  type="text"
                  autoComplete="off"
                  value={f.password}
                  onChange={(v) => set('password', v)}
                  hint={article?.hasPassword ? 'Déjela vacía para mantener la actual.' : 'Compártala con el cliente por WhatsApp o correo.'}
                />
              )}
            </div>
          </Card>

          {article && (
            <Button
              variant="danger"
              className="w-full"
              disabled={remove.isPending}
              onClick={async () => {
                if (await confirm(`¿Eliminar definitivamente «${article.title}»? Su dirección dejará de funcionar.`)) remove.mutate()
              }}
            >
              Eliminar artículo
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
