import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ArticleForm } from '#/components/ArticleForm'
import { ErrorBox, Loading } from '#/components/ui'
import { api } from '#/lib/api'
import type { Article } from '#/lib/types'

export const Route = createFileRoute('/_app/articulos/$id')({ component: EditArticle })

function EditArticle() {
  const { id } = Route.useParams()
  const { data, isPending, error } = useQuery({ queryKey: ['article', Number(id)], queryFn: () => api<Article>(`/admin/articles/${id}`), staleTime: 0 })
  if (isPending) return <Loading />
  if (error) return <ErrorBox error={error} />
  // remount the form when switching articles so the editor loads the new content
  return <ArticleForm key={data.id} article={data} />
}
