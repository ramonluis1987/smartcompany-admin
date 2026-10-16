export interface Paged<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface Category {
  id: number
  slug: string
  name: string
  description: string
  isPublic: boolean
  sortOrder: number
  count: number
  publishedCount: number
}

export interface ArticleRow {
  id: number
  slug: string
  title: string
  excerpt: string
  views: number
  publishedAt: string | null
  updatedAt: string
  protected: boolean
  status: 'draft' | 'published'
  featured: boolean
  categoryId: number
  category: { slug: string; name: string }
  url: string
}

export interface Article {
  id: number
  slug: string
  title: string
  excerpt: string
  contentHtml: string
  categoryId: number
  categoryIds: number[]
  status: 'draft' | 'published'
  seoTitle: string | null
  seoDescription: string | null
  featured: boolean
  views: number
  hasPassword: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  oldSlugs: string[]
  url: string
}

export interface PracticeArea {
  id: number
  slug: string
  title: string
  summary: string
  bodyHtml: string
  icon: string
  categoryId: number | null
  sortOrder: number
  isVisible: boolean
}

export interface TeamMember {
  id: number
  name: string
  role: string
  bio: string
  photoUrl: string | null
  email: string | null
  phone: string | null
  isPartner: boolean
  sortOrder: number
  isVisible: boolean
}

export interface Office {
  id: number
  city: string
  label: string
  address: string
  phone: string | null
  email: string | null
  mapUrl: string | null
  sortOrder: number
  isVisible: boolean
}

export interface Message {
  id: number
  name: string
  email: string | null
  phone: string | null
  matter: string | null
  message: string
  pageUrl: string | null
  articleId: number | null
  articleTitle: string | null
  status: 'new' | 'read' | 'archived'
  createdAt: string
}

export interface Synonym {
  id: number
  term: string
  alternatives: string[]
}

export interface Stats {
  counts: {
    published: number
    drafts: number
    protected: number
    categories: number
    newMessages: number
    searches: number
    zeroResults: number
  }
  topArticles: { id: number; title: string; views: number; url: string }[]
  topSearches: { query: string; count: number; avgResults: number }[]
  zeroResultSearches: { query: string; count: number; lastAt: string }[]
}

export interface Settings {
  site: Record<string, string>
  home: Record<string, unknown> & { stats: { value: string; label: string }[] }
  consultas: Record<string, unknown> & { suggestions: string[] }
}
