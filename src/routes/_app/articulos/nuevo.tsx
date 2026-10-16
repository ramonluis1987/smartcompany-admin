import { createFileRoute } from '@tanstack/react-router'
import { ArticleForm } from '#/components/ArticleForm'

export const Route = createFileRoute('/_app/articulos/nuevo')({ component: () => <ArticleForm /> })
