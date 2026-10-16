import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { Button, TextField, errorText } from '#/components/ui'

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context }) => {
    if (await context.auth.ensure()) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

function LoginPage() {
  const { auth } = Route.useRouteContext()
  const { redirect: to } = Route.useSearch()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await auth.login(email, password)
      // only same-app paths
      await navigate({ to: to?.startsWith('/') && !to.startsWith('//') ? to : '/' })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-brand p-12 text-white lg:flex">
        <div>
          <p className="font-serif text-[28px]">Smart Company</p>
          <p className="mt-1.5 text-[10.5px] uppercase tracking-[0.26em] text-white/60">Abogados &amp; Auditores</p>
        </div>
        <p className="max-w-md font-serif text-[40px] font-light leading-[1.15]">Administración del sitio y del centro de consultas.</p>
        <p className="text-sm text-white/60">Acceso exclusivo para el equipo del estudio.</p>
      </div>
      <div className="grid place-items-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm" noValidate>
          <p className="label">Panel de administración</p>
          <h1 className="mb-8 mt-3 text-[38px] font-light">Iniciar sesión</h1>
          <div className="space-y-4">
            <TextField label="Correo" type="email" autoComplete="username" required value={email} onChange={setEmail} autoFocus />
            <TextField label="Contraseña" type="password" autoComplete="current-password" required value={password} onChange={setPassword} />
          </div>
          {error && (
            <p role="alert" className="mt-4 rounded-[3px] bg-danger-soft px-3 py-2 text-[13.5px] text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className="mt-6 h-11 w-full" disabled={busy || !email || !password}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </main>
  )
}
