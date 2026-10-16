import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { WEB_URL, api } from '#/lib/api'
import { useUser } from '#/lib/auth'
import type { Stats } from '#/lib/types'

export const Route = createFileRoute('/_app')({
  ssr: false,
  beforeLoad: async ({ context, location }) => {
    const user = await context.auth.ensure()
    if (!user) throw redirect({ to: '/login', search: { redirect: location.href } })
    return { user }
  },
  component: AppLayout,
})

const NAV: { group: string; items: { to: string; label: string; adminOnly?: boolean }[] }[] = [
  { group: '', items: [{ to: '/', label: 'Resumen' }] },
  {
    group: 'Centro de consultas',
    items: [
      { to: '/articulos', label: 'Artículos' },
      { to: '/categorias', label: 'Categorías' },
      { to: '/buscador', label: 'Buscador' },
    ],
  },
  {
    group: 'Sitio web',
    items: [
      { to: '/contenido', label: 'Textos del sitio' },
      { to: '/areas', label: 'Áreas de práctica' },
      { to: '/equipo', label: 'Equipo' },
      { to: '/oficinas', label: 'Oficinas' },
    ],
  },
  { group: 'Contacto', items: [{ to: '/mensajes', label: 'Mensajes' }] },
  { group: 'Cuenta', items: [{ to: '/usuarios', label: 'Usuarios', adminOnly: true }, { to: '/cuenta', label: 'Mi cuenta' }] },
]

function AppLayout() {
  const user = useUser()
  const { auth } = Route.useRouteContext()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // badge with unread messages
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: () => api<Stats>('/admin/stats'), refetchInterval: 120_000 })

  async function signOut() {
    await auth.logout()
    await navigate({ to: '/login' })
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper px-4 lg:hidden">
        <span className="font-serif text-xl text-ink">Smart Company</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded px-3 py-1.5 text-sm hover:bg-stone" aria-expanded={open}>
          {open ? 'Cerrar' : 'Menú'}
        </button>
      </header>
      <aside className={`${open ? 'block' : 'hidden'} border-r border-line bg-white lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto`}>
        <div className="hidden px-6 pb-5 pt-7 lg:block">
          <p className="font-serif text-[23px] leading-none text-ink">Smart Company</p>
          <p className="mt-1.5 text-[9.5px] uppercase tracking-[0.26em] text-muted">Administración</p>
        </div>
        <nav className="px-3 pb-6" onClick={() => setOpen(false)}>
          {NAV.map((g) => (
            <div key={g.group} className="mt-4 first:mt-0">
              {g.group && <p className="label px-3 pb-1.5 text-[10px]">{g.group}</p>}
              <ul>
                {g.items
                  .filter((i) => !i.adminOnly || user?.role === 'admin')
                  .map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        activeOptions={{ exact: item.to === '/' }}
                        className="flex items-center justify-between rounded-[3px] px-3 py-2 text-[14px] text-text transition-colors hover:bg-stone data-[status=active]:bg-brand-soft data-[status=active]:font-medium data-[status=active]:text-brand"
                      >
                        {item.label}
                        {item.to === '/mensajes' && !!stats?.counts.newMessages && (
                          <span className="rounded-full bg-brand px-1.5 text-[11px] font-semibold text-white">{stats.counts.newMessages}</span>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
          <div className="mt-6 border-t border-line px-3 pt-4 text-[13px]">
            <p className="truncate font-medium text-ink">{user?.name}</p>
            <p className="truncate text-muted">{user?.email}</p>
            <div className="mt-3 flex gap-3">
              <a href={WEB_URL} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                Ver sitio ↗
              </a>
              <button type="button" onClick={signOut} className="text-muted hover:text-danger">
                Cerrar sesión
              </button>
            </div>
          </div>
        </nav>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto max-w-[1200px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
