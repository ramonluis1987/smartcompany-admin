import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button, Card, PageHeader, TextField, errorText, fieldErrors, useUI } from '#/components/ui'
import { api } from '#/lib/api'

export const Route = createFileRoute('/_app/cuenta')({ component: AccountPage })

function AccountPage() {
  const { user, auth } = Route.useRouteContext()
  const navigate = useNavigate()
  const { toast } = useUI()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const change = useMutation({
    mutationFn: () => api('/auth/change-password', { method: 'POST', json: { currentPassword: current, newPassword: next } }),
    onSuccess: async () => {
      toast('Contraseña actualizada. Ingrese nuevamente.')
      await auth.logout()
      await navigate({ to: '/login' })
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      toast(errorText(err), 'error')
    },
  })

  const mismatch = repeat.length > 0 && next !== repeat

  return (
    <>
      <PageHeader title="Mi cuenta" description={`${user.name} · ${user.email}`} />
      <Card title="Cambiar contraseña" className="max-w-lg">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!mismatch) change.mutate()
          }}
        >
          <TextField label="Contraseña actual" type="password" autoComplete="current-password" value={current} onChange={setCurrent} />
          <TextField label="Nueva contraseña" type="password" autoComplete="new-password" value={next} error={errors.newPassword} onChange={setNext} hint="Mínimo 10 caracteres con letras y números." />
          <TextField label="Repita la nueva contraseña" type="password" autoComplete="new-password" value={repeat} error={mismatch ? 'No coincide' : undefined} onChange={setRepeat} />
          <Button type="submit" variant="primary" disabled={change.isPending || !current || !next || mismatch}>
            Actualizar contraseña
          </Button>
          <p className="text-[12.5px] text-muted">Por seguridad se cerrarán todas sus sesiones abiertas.</p>
        </form>
      </Card>
    </>
  )
}
