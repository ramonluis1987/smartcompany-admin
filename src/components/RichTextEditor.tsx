import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import { Node } from '@tiptap/core'
import { BubbleMenu } from '@tiptap/react/menus'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import type { Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import { useEffect, useRef, useState } from 'react'
import { TextFormatControls } from './TextFormatControls'
import { mediaUrl, uploadImage } from '#/lib/api'
import { errorText, useUI } from './ui'

/**
 * Article/area body editor. Produces the same HTML subset the API sanitizer keeps.
 * Images are stored with site-relative /uploads/... paths and shown through the API here.
 */
export function RichTextEditor({ value, onChange, placeholder, inline = false, label = 'Contenido', maxLength }: { value: string; onChange: (html: string) => void; placeholder?: string; inline?: boolean; label?: string; maxLength?: number }) {
  const [source, setSource] = useState(false)
  const [format, setFormat] = useState(false)
  const lastEmitted = useRef(value)
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: inline ? false : { levels: [2, 3, 4] },
        ...(inline ? { document: false, paragraph: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false, codeBlock: false, horizontalRule: false, trailingNode: false, gapcursor: false } as const : {}),
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: null, target: null } },
      }),
      TextStyleKit.configure({ lineHeight: { types: inline ? ['textStyle'] : ['paragraph', 'heading'] } }),
      CharacterCount.configure({ limit: maxLength }),
      ...(inline ? [Node.create({ name: 'doc', topNode: true, content: 'inline*', addKeyboardShortcuts() { return { Enter: () => this.editor.commands.setHardBreak() } } })] : [
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
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
      ]),
      Placeholder.configure({ placeholder: placeholder ?? 'Escriba el contenido…' }),
    ],
    content: inline ? inlineContent(value) : value,
    editorProps: { attributes: { role: 'textbox', 'aria-label': label, 'aria-multiline': 'true' } },
    onUpdate: ({ editor: e }) => {
      lastEmitted.current = e.isEmpty ? '' : inline ? `<span>${e.getHTML()}</span>` : cleanHtml(e.getHTML())
      onChange(lastEmitted.current)
    },
  })

  useEffect(() => {
    if (editor && value !== lastEmitted.current) {
      editor.commands.setContent(inline ? inlineContent(value) : value, { emitUpdate: false })
      lastEmitted.current = value
    }
  }, [editor, value, inline])

  return (
    <div className="rounded-[4px] border border-line bg-white focus-within:border-brand">
      {editor && !inline && <Toolbar editor={editor} source={source} onToggleSource={() => setSource((s) => !s)} />}
      {editor && !source && <>
        <div className="flex items-center justify-between gap-2 border-b border-line px-2 py-1 text-xs text-muted">
          <span>Seleccione un texto para cambiar su estilo.</span>
          <button type="button" aria-expanded={format} onClick={() => setFormat((v) => !v)} className="rounded px-2 py-1.5 font-medium text-brand hover:bg-stone">Formato</button>
        </div>
        {format && <div className="border-b border-line p-2"><TextFormatControls editor={editor} inline={inline} /></div>}
        <BubbleMenu editor={editor} options={{ placement: 'top', offset: 10, shift: { padding: 12 }, flip: true }} className="text-format-bubble" updateDelay={100}>
          <TextFormatControls editor={editor} inline={inline} />
        </BubbleMenu>
      </>}
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
        <EditorContent editor={editor} className={inline ? 'editor-content editor-inline' : 'editor-content'} />
      )}
    </div>
  )
}

// Existing site copy is plain text with *emphasis*. Only convert it on edit.
function inlineContent(value: string) {
  if (/<\/?[a-z][^>]*>/i.test(value)) return value
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*([^*]+)\*/g, '<em><span style="color: #9a754b">$1</span></em>').replace(/\n/g, '<br>')
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
