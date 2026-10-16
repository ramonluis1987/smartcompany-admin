import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import { useRef, useState } from 'react'
import { mediaUrl, uploadImage } from '#/lib/api'
import { errorText, useUI } from './ui'

/**
 * Article/area body editor. Produces the same HTML subset the API sanitizer keeps.
 * Images are stored with site-relative /uploads/... paths and shown through the API here.
 */
export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const [source, setSource] = useState(false)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } },
      }),
      Image.extend({
        // display uploads from the API while keeping the stored src site-relative
        renderHTML({ HTMLAttributes }) {
          return ['img', { ...HTMLAttributes, src: mediaUrl(HTMLAttributes.src) }]
        },
        parseHTML() {
          return [{ tag: 'img[src]', getAttrs: (el) => ({ src: el.getAttribute('src')?.replace(/^https?:\/\/[^/]+(?=\/uploads\/)/, '') }) }]
        },
      }),
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Escriba el contenido…' }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(cleanHtml(e.getHTML())),
  })

  return (
    <div className="overflow-hidden rounded-[4px] border border-line bg-white focus-within:border-brand">
      {editor && <Toolbar editor={editor} source={source} onToggleSource={() => setSource((s) => !s)} />}
      {source ? (
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            editor?.commands.setContent(e.target.value, { emitUpdate: false })
          }}
          spellCheck={false}
          className="block min-h-[420px] w-full resize-y border-0 bg-stone/40 p-5 font-mono text-[12.5px] leading-relaxed text-ink outline-none"
          aria-label="Código HTML"
        />
      ) : (
        <EditorContent editor={editor} className="editor-content" />
      )}
    </div>
  )
}

// image src is rendered absolute for display; store it site-relative again
const cleanHtml = (html: string) => (html === '<p></p>' ? '' : html.replace(/src="https?:\/\/[^"/]+(\/uploads\/[^"]+)"/g, 'src="$1"'))

function Toolbar({ editor, source, onToggleSource }: { editor: Editor; source: boolean; onToggleSource: () => void }) {
  const { toast } = useUI()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      h4: e.isActive('heading', { level: 4 }),
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      link: e.isActive('link'),
      ul: e.isActive('bulletList'),
      ol: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      table: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  })

  const chain = () => editor.chain().focus()

  function setLink() {
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('Dirección del enlace (use /categoria/slug/ para guías del sitio)', prev ?? '')
    if (url === null) return
    if (!url) chain().extendMarkRange('link').unsetLink().run()
    else chain().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  async function onImage(file: File | undefined) {
    if (!file) return
    setUploading(true)
    try {
      const src = await uploadImage(file)
      chain().setImage({ src, alt: '' }).run()
    } catch (err) {
      toast(errorText(err), 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-line bg-white px-2 py-1.5">
      <Tool label="Párrafo" onClick={() => chain().setParagraph().run()} disabled={source}>
        ¶
      </Tool>
      <Tool label="Título 2" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} disabled={source}>
        H2
      </Tool>
      <Tool label="Título 3" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} disabled={source}>
        H3
      </Tool>
      <Tool label="Título 4" active={s.h4} onClick={() => chain().toggleHeading({ level: 4 }).run()} disabled={source}>
        H4
      </Tool>
      <Sep />
      <Tool label="Negrita" active={s.bold} onClick={() => chain().toggleBold().run()} disabled={source}>
        <b>B</b>
      </Tool>
      <Tool label="Cursiva" active={s.italic} onClick={() => chain().toggleItalic().run()} disabled={source}>
        <i>I</i>
      </Tool>
      <Tool label="Subrayado" active={s.underline} onClick={() => chain().toggleUnderline().run()} disabled={source}>
        <u>U</u>
      </Tool>
      <Tool label="Tachado" active={s.strike} onClick={() => chain().toggleStrike().run()} disabled={source}>
        <s>S</s>
      </Tool>
      <Tool label="Enlace" active={s.link} onClick={setLink} disabled={source}>
        Enlace
      </Tool>
      <Sep />
      <Tool label="Lista" active={s.ul} onClick={() => chain().toggleBulletList().run()} disabled={source}>
        • Lista
      </Tool>
      <Tool label="Lista numerada" active={s.ol} onClick={() => chain().toggleOrderedList().run()} disabled={source}>
        1. Lista
      </Tool>
      <Tool label="Cita" active={s.quote} onClick={() => chain().toggleBlockquote().run()} disabled={source}>
        “Cita”
      </Tool>
      <Tool label="Separador" onClick={() => chain().setHorizontalRule().run()} disabled={source}>
        —
      </Tool>
      <Sep />
      <Tool label="Insertar imagen" onClick={() => fileRef.current?.click()} disabled={source || uploading}>
        {uploading ? 'Subiendo…' : 'Imagen'}
      </Tool>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
      {s.table ? (
        <>
          <Tool label="Agregar fila" onClick={() => chain().addRowAfter().run()}>+ Fila</Tool>
          <Tool label="Agregar columna" onClick={() => chain().addColumnAfter().run()}>+ Col</Tool>
          <Tool label="Eliminar fila" onClick={() => chain().deleteRow().run()}>− Fila</Tool>
          <Tool label="Eliminar columna" onClick={() => chain().deleteColumn().run()}>− Col</Tool>
          <Tool label="Eliminar tabla" onClick={() => chain().deleteTable().run()}>✕ Tabla</Tool>
        </>
      ) : (
        <Tool label="Insertar tabla" onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} disabled={source}>
          Tabla
        </Tool>
      )}
      <Sep />
      <Tool label="Deshacer" onClick={() => chain().undo().run()} disabled={source || !s.canUndo}>
        ↶
      </Tool>
      <Tool label="Rehacer" onClick={() => chain().redo().run()} disabled={source || !s.canRedo}>
        ↷
      </Tool>
      <div className="ml-auto">
        <Tool label="Ver código HTML" active={source} onClick={onToggleSource}>
          HTML
        </Tool>
      </div>
    </div>
  )
}

function Tool({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-8 min-w-8 rounded-[3px] px-2 text-[13px] transition-colors disabled:opacity-35 ${active ? 'bg-brand text-white' : 'text-ink hover:bg-stone'}`}
    >
      {children}
    </button>
  )
}

const Sep = () => <span className="mx-1 h-5 w-px bg-line" aria-hidden="true" />
