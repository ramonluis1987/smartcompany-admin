import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { ApiError } from '#/lib/api'

// ---------- buttons ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white border-brand hover:bg-brand-2 hover:border-brand-2',
  secondary: 'bg-white text-ink border-line hover:border-ink',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-stone',
  danger: 'bg-white text-danger border-line hover:border-danger hover:bg-danger-soft',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-[3px] border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm'} ${VARIANTS[variant]} ${className}`}
    />
  )
}

// ---------- layout ----------

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        <h1 className="text-[34px] font-light leading-tight">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className = '' }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[4px] border border-line bg-white ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'brand' | 'warn' | 'danger'; children: React.ReactNode }) {
  const tones = {
    neutral: 'bg-stone text-text',
    brand: 'bg-brand-soft text-brand',
    warn: 'bg-warn-soft text-[#6b5200]',
    danger: 'bg-danger-soft text-danger',
  }
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${tones[tone]}`}>{children}</span>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[4px] border border-dashed border-line px-6 py-12 text-center text-muted">{children}</div>
}

export function Spinner({ className = 'size-4' }: { className?: string }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-line border-t-brand ${className}`} aria-label="Cargando" />
}

export function Loading() {
  return (
    <div className="flex items-center gap-3 py-16 text-muted">
      <Spinner /> Cargando…
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  return (
    <div role="alert" className="rounded-[4px] border border-danger/30 bg-danger-soft px-4 py-3 text-danger">
      {error instanceof Error ? error.message : 'Ocurrió un error inesperado.'}
    </div>
  )
}

// ---------- form fields ----------

interface FieldProps {
  label: string
  hint?: React.ReactNode
  error?: string
  children: (id: string) => React.ReactNode
  className?: string
}

export function Field({ label, hint, error, children, className = '' }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-medium text-ink">
        {label}
      </label>
      {children(id)}
      {error ? <p className="mt-1 text-[12.5px] text-danger">{error}</p> : hint ? <p className="mt-1 text-[12.5px] text-muted">{hint}</p> : null}
    </div>
  )
}

export function TextField({
  label,
  hint,
  error,
  value,
  onChange,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> & {
  label: string
  hint?: React.ReactNode
  error?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(id) => <input id={id} {...props} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} className="input" />}
    </Field>
  )
}

export function TextArea({
  label,
  hint,
  error,
  value,
  onChange,
  rows = 3,
  className,
  maxLength,
}: {
  label: string
  hint?: React.ReactNode
  error?: string
  value: string
  onChange: (value: string) => void
  rows?: number
  className?: string
  maxLength?: number
}) {
  return (
    <Field
      label={label}
      hint={
        maxLength ? (
          <>
            {hint} <span className={value.length > maxLength * 0.9 ? 'text-danger' : ''}>{value.length}/{maxLength}</span>
          </>
        ) : (
          hint
        )
      }
      error={error}
      className={className}
    >
      {(id) => <textarea id={id} rows={rows} value={value} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} className="input resize-y leading-relaxed" />}
    </Field>
  )
}

export function Select<T extends string | number>({
  label,
  hint,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  hint?: React.ReactNode
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      {(id) => (
        <select
          id={id}
          value={String(value)}
          onChange={(e) => {
            const opt = options.find((o) => String(o.value) === e.target.value)
            if (opt) onChange(opt.value)
          }}
          className="input"
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

export function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-stone-2'}`}
      >
        <span className={`absolute left-0 top-0.5 size-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-[13.5px] font-medium text-ink">{label}</span>
        {hint && <span className="block text-[12.5px] text-muted">{hint}</span>}
      </label>
    </div>
  )
}

// ---------- dialogs ----------

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-hidden rounded-[6px] border border-line bg-paper p-0 shadow-2xl backdrop:bg-ink/40 ${wide ? 'max-w-4xl' : 'max-w-xl'}`}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="text-2xl font-light">{title}</h2>
            <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full text-muted hover:bg-stone" aria-label="Cerrar">
              ✕
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line bg-white px-6 py-3.5">{footer}</div>}
        </div>
      )}
    </dialog>
  )
}

// ---------- toasts & confirm ----------

type Toast = { id: number; text: string; tone: 'ok' | 'error' }
const ToastContext = createContext<{ toast: (text: string, tone?: Toast['tone']) => void; confirm: (text: string) => Promise<boolean> } | null>(null)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [ask, setAsk] = useState<{ text: string; resolve: (ok: boolean) => void } | null>(null)

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3000)
  }, [])

  const confirm = useCallback((text: string) => new Promise<boolean>((resolve) => setAsk({ text, resolve })), [])

  const answer = (ok: boolean) => {
    ask?.resolve(ok)
    setAsk(null)
  }

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto max-w-sm rounded-[4px] px-4 py-3 text-sm shadow-lg ${t.tone === 'ok' ? 'bg-ink text-white' : 'bg-danger text-white'}`}>
            {t.text}
          </div>
        ))}
      </div>
      <Modal
        open={!!ask}
        onClose={() => answer(false)}
        title="Confirmar"
        footer={
          <>
            <Button onClick={() => answer(false)}>Cancelar</Button>
            <Button variant="danger" onClick={() => answer(true)}>
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-[15px]">{ask?.text}</p>
      </Modal>
    </ToastContext.Provider>
  )
}

export function useUI() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useUI outside UIProvider')
  return ctx
}

export const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Ocurrió un error')
export const fieldErrors = (err: unknown) => (err instanceof ApiError ? err.fieldErrors : {})

// ---------- pagination ----------

export function Pager({ page, total, limit, onPage }: { page: number; total: number; limit: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="mt-4 flex items-center justify-between text-[13px] text-muted">
      <span>
        {total.toLocaleString('es-EC')} {total === 1 ? 'registro' : 'registros'} · página {page} de {pages}
      </span>
      <div className="flex gap-2">
        <Button size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Anterior
        </Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Siguiente →
        </Button>
      </div>
    </div>
  )
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—'
