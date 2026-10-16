import { queryOptions } from '@tanstack/react-query'
import { api } from './api'
import type { Category } from './types'

export const categoriesQuery = queryOptions({
  queryKey: ['categories'],
  queryFn: () => api<Category[]>('/admin/categories'),
  staleTime: 60_000,
})
