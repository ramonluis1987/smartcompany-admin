import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Badge, Button, ErrorBox, Loading, Modal, PageHeader, Select, Switch, TextField, errorText, fieldErrors, formatDate, useUI } from '#/components/ui'
import { api } from '#/lib/api'
import type { User } from '#/lib/api'

export const Route = createFileRoute('/_app/usuarios')({
  beforeLoad: ({ context }) => {
    if (context.user.role !== 'admin') throw redirect({ to: '/' })
  },
  component: UsersPage,
})

type Draft = { id?: string; name: string; email: string; role: 'admin' | 'editor'; isActive: boolean; password: string }

function UsersPage() {
  const qc = useQueryClient()
  const { toast, confirm } = useUI()
  const { user: me } = Route.useRouteContext()
  const { data, isPending, error } = useQuery({ queryKey: ['users'], queryFn: () => api<User[]>('/admin/users') })
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: (d: Draft) =>
      d.id
        ? api(`/admin/users/${d.id}`, { method: 'PATCH', json: { name: d.name, role: d.role, isActive: d.isActive, ...(d.password ? { password: d.password } : {}) } })
        : api('/admin/users', { method: 'POST', json: { name: d.name, email: d.email, role: d.role, password: d.password } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      setDraft(null)
      toast('Usuario guardado')
    },
    onError: (err) => {
      setErrors(fieldErrors(err))
      toast(errorText(err), 'error')
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => toast(errorText(err), 'error'),
  })

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Administradores gestionan todo; editores, el contenido (no los usuarios)."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setErrors({})
              setDraft({ name: '', email: '', role: 'editor', isActive: true, password: '' })
            }}
          >
            + Nuevo usuario
          </Button>
        }
      />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorBox error={error} />
      ) : (
        <ul className="divide-y divide-line rounded-[4px] border border-line bg-white">
          {data.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div>
                <p className="font-medium text-ink">
                  {u.name} {u.id === me.id && <span className="text-[12px] font-normal text-muted">(usted)</span>}
                </p>
                <p className="text-[13px] text-muted">
                  {u.email} · último acceso {formatDate(u.lastLoginAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={u.role === 'admin' ? 'brand' : 'neutral'}>{u.role === 'admin' ? 'Administrador' : 'Editor'}</Badge>
                {!u.isActive && <Badge tone="danger">Inactivo</Badge>}
                <Button
                  size="sm"
                  onClick={() => {
                    setErrors({})
                    setDraft({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, password: '' })
                  }}
                >
                  Editar
                </Button>
                {u.id !== me.id && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (await confirm(`¿Eliminar al usuario ${u.email}?`)) remove.mutate(u.id)
                    }}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Editar usuario' : 'Nuevo usuario'}
        footer={
          <>
            <Button onClick={() => setDraft(null)}>Cancelar</Button>
            <Button variant="primary" disabled={save.isPending} onClick={() => draft && save.mutate(draft)}>
              Guardar
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <TextField label="Nombre" value={draft.name} error={errors.name} onChange={(name) => setDraft({ ...draft, name })} />
            <TextField label="Correo" type="email" value={draft.email} error={errors.email} disabled={!!draft.id} onChange={(email) => setDraft({ ...draft, email })} />
            <Select
              label="Rol"
              value={draft.role}
              onChange={(role) => setDraft({ ...draft, role })}
              options={[
                { value: 'editor', label: 'Editor — contenido del sitio' },
                { value: 'admin', label: 'Administrador — todo, incluidos usuarios' },
              ]}
            />
            <TextField
              label={draft.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              type="text"
              autoComplete="new-password"
              value={draft.password}
              error={errors.password}
              onChange={(password) => setDraft({ ...draft, password })}
              hint="Mínimo 10 caracteres con letras y números. Cambiarla cierra sus sesiones abiertas."
            />
            {draft.id && <Switch label="Activo" hint="Un usuario inactivo no puede ingresar." checked={draft.isActive} onChange={(isActive) => setDraft({ ...draft, isActive })} />}
          </div>
        )}
      </Modal>
    </>
  )
}
