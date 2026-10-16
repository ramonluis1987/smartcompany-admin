// Browser client for smartcompany-api.
// The access token lives only in memory; the refresh token is an httpOnly cookie the
// API sets on /auth, so a page reload restores the session via POST /auth/refresh.

export const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')
export const WEB_URL = (import.meta.env.VITE_WEB_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor'
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

interface Session {
  accessToken: string
  expiresIn: number
  user: User
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message)
  }
}

let accessToken: string | null = null
let refreshing: Promise<Session | null> | null = null
const listeners = new Set<(user: User | null) => void>()

export function onSessionChange(fn: (user: User | null) => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setSession(session: Session | null) {
  accessToken = session?.accessToken ?? null
  listeners.forEach((fn) => fn(session?.user ?? null))
}

/** One refresh at a time, shared by every request that hit a 401. */
export function refreshSession(): Promise<Session | null> {
  refreshing ??= fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (res) => {
      const session = res.ok ? ((await res.json()) as Session) : null
      setSession(session)
      return session
    })
    .catch(() => {
      setSession(null)
      return null
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw await toError(res)
  const session = (await res.json()) as Session
  setSession(session)
  return session.user
}

export async function logout() {
  await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
  setSession(null)
}

async function toError(res: Response) {
  const body = (await res.json().catch(() => null)) as {
    message?: string | string[]
    errors?: { path: string | (string | number)[]; message: string }[]
  } | null
  const fieldErrors = Object.fromEntries(
    (body?.errors ?? []).map((e) => [Array.isArray(e.path) ? e.path.join('.') : e.path, e.message]),
  )
  const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
  const fallback = res.status === 429 ? 'Demasiados intentos. Espere un momento.' : `Error ${res.status}`
  return new ApiError(message || fallback, res.status, fieldErrors)
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init
  const send = () =>
    fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })

  let res = await send()
  if (res.status === 401 && !path.startsWith('/auth/')) {
    const session = await refreshSession()
    if (session) res = await send()
  }
  if (!res.ok) throw await toError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const { url } = await api<{ url: string }>('/admin/uploads', { method: 'POST', body: form })
  return url
}

/** Uploads are stored site-relative (/uploads/...); the admin shows them from the API. */
export function mediaUrl(path: string | null | undefined) {
  if (!path) return ''
  return path.startsWith('/uploads/') ? `${API_URL}${path}` : path
}
