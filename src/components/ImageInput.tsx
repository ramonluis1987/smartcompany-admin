import { useRef, useState } from 'react'
import { mediaUrl, uploadImage } from '#/lib/api'
import { Button, errorText, useUI } from './ui'

/** Upload/replace/remove one image; the value is the stored /uploads/... path. */
export function ImageInput({ label, value, onChange, aspect = 'aspect-[4/3]' }: { label: string; value: string | null; onChange: (url: string | null) => void; aspect?: string }) {
  const { toast } = useUI()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function pick(file?: File) {
    if (!file) return
    setBusy(true)
    try {
      onChange(await uploadImage(file))
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-medium text-ink">{label}</p>
      <div className={`relative w-full max-w-xs overflow-hidden rounded-[4px] border border-line bg-stone ${aspect}`}>
        {value ? <img src={mediaUrl(value)} alt="" className="absolute inset-0 size-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-[12.5px] text-muted">Sin imagen</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="sm" onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Subiendo…' : value ? 'Reemplazar' : 'Subir imagen'}
        </Button>
        {value && (
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            Quitar
          </Button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}
