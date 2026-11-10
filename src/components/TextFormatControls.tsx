import { useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'

const FONTS = [
  ['var(--font-serif)', 'Serif de la firma'],
  ['var(--font-sans)', 'Sans de la firma'],
  ['Georgia, serif', 'Georgia'],
  ['Arial, sans-serif', 'Arial'],
]
const COLORS = [['#142b45', 'Azul marino'], ['#9a754b', 'Bronce'], ['#163b2e', 'Verde'], ['#16181a', 'Negro'], ['#6f747b', 'Gris'], ['#ffffff', 'Blanco']]

export function TextFormatControls({ editor, inline }: { editor: Editor; inline: boolean }) {
  const s = useEditorState({ editor, selector: ({ editor: e }) => ({
    bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'),
    link: e.isActive('link'), ul: e.isActive('bulletList'), ol: e.isActive('orderedList'),
    style: e.getAttributes('textStyle'),
    block: e.isActive('heading') ? e.getAttributes('heading') : e.getAttributes('paragraph'),
    heading: e.isActive('heading') ? String(e.getAttributes('heading').level) : 'p',
    undo: e.can().undo(), redo: e.can().redo(),
  }) })
  const chain = () => editor.chain().focus()
  const setLink = () => {
    const url = window.prompt('Dirección del enlace', String(editor.getAttributes('link').href ?? ''))
    if (url === null) return
    if (!url.trim()) chain().extendMarkRange('link').unsetLink().run()
    else chain().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }
  return (
    <div role="group" aria-label="Formato del texto" className="text-format-controls">
      <div className="format-row">
        {!inline && <Choice label="Tipo de texto" value={s.heading} onChange={(v) => v === 'p' ? chain().setParagraph().run() : chain().setHeading({ level: Number(v) as 2 | 3 | 4 }).run()}>
          <option value="p">Párrafo</option><option value="2">Título 2</option><option value="3">Título 3</option><option value="4">Título 4</option>
        </Choice>}
        <Choice label="Fuente" value={s.style.fontFamily ?? ''} onChange={(v) => v ? chain().setFontFamily(v).run() : chain().unsetFontFamily().run()}>
          <option value="">Fuente original</option>{FONTS.map(([v, name]) => <option key={v} value={v}>{name}</option>)}
        </Choice>
        <Choice label="Tamaño" value={s.style.fontSize ?? ''} onChange={(v) => v ? chain().setFontSize(v).run() : chain().unsetFontSize().run()}>
          <option value="">Tamaño original</option>{[12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64].map((n) => <option key={n} value={`${n}px`}>{n} px</option>)}
        </Choice>
      </div>
      <div className="format-row">
        <Action label="Negrita" active={s.bold} onClick={() => chain().toggleBold().run()}><b>B</b></Action>
        <Action label="Cursiva" active={s.italic} onClick={() => chain().toggleItalic().run()}><i>I</i></Action>
        <Action label="Subrayado" active={s.underline} onClick={() => chain().toggleUnderline().run()}><u>U</u></Action>
        <Action label="Tachado" active={s.strike} onClick={() => chain().toggleStrike().run()}><s>S</s></Action>
        <Action label="Editar enlace" active={s.link} onClick={setLink}>Enlace</Action>
        {s.link && <Action label="Quitar enlace" onClick={() => chain().extendMarkRange('link').unsetLink().run()}>Sin enlace</Action>}
        <Action label="Limpiar formato" onClick={() => {
          const c = chain().unsetAllMarks()
          if (!inline) c.unsetTextAlign().updateAttributes('paragraph', { lineHeight: null }).updateAttributes('heading', { lineHeight: null })
          c.run()
        }}>Limpiar</Action>
      </div>
      <div className="format-row">
        <Choice label="Color del texto" value={s.style.color ?? ''} onChange={(v) => v ? chain().setColor(v).run() : chain().unsetColor().run()}>
          <option value="">Color original</option>{COLORS.map(([v, name]) => <option key={v} value={v}>{name}</option>)}
          {s.style.color && !COLORS.some(([v]) => v === s.style.color) && <option value={s.style.color}>Personalizado</option>}
        </Choice>
        <label className="format-color" title="Color personalizado">Color
          <input type="color" aria-label="Color personalizado" value={toHex(s.style.color, '#16181a')} onChange={(e) => chain().setColor(e.target.value).run()} />
        </label>
        <label className="format-color" title="Resaltado">Fondo
          <input type="color" aria-label="Color de resaltado" value={toHex(s.style.backgroundColor, '#f6eccb')} onChange={(e) => chain().setBackgroundColor(e.target.value).run()} />
        </label>
        <Action label="Quitar resaltado" onClick={() => chain().unsetBackgroundColor().run()}>Sin fondo</Action>
      </div>
      <div className="format-row">
        {!inline && <>
          <Choice label="Alineación" value={s.block.textAlign ?? ''} onChange={(v) => v ? chain().setTextAlign(v).run() : chain().unsetTextAlign().run()}>
            <option value="">Alineación original</option><option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option><option value="justify">Justificada</option>
          </Choice>
          <Action label="Lista con viñetas" active={s.ul} onClick={() => chain().toggleBulletList().run()}>• Lista</Action>
          <Action label="Lista numerada" active={s.ol} onClick={() => chain().toggleOrderedList().run()}>1. Lista</Action>
        </>}
        <Choice label="Interlineado" value={(inline ? s.style.lineHeight : s.block.lineHeight) ?? ''} onChange={(v) => inline ? (v ? chain().setLineHeight(v).run() : chain().unsetLineHeight().run()) : chain().updateAttributes('paragraph', { lineHeight: v || null }).updateAttributes('heading', { lineHeight: v || null }).run()}>
          <option value="">Interlineado original</option>{['1', '1.25', '1.5', '1.75', '2'].map((v) => <option key={v} value={v}>{v}</option>)}
        </Choice>
        <Action label="Deshacer formato" disabled={!s.undo} onClick={() => chain().undo().run()}>↶</Action>
        <Action label="Rehacer formato" disabled={!s.redo} onClick={() => chain().redo().run()}>↷</Action>
      </div>
    </div>
  )
}

function Choice({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return <select aria-label={label} title={label} value={value} onChange={(e) => onChange(e.target.value)} className="format-choice">{children}</select>
}
function Action({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className="format-action">{children}</button>
}
function toHex(color: string | undefined, fallback: string) {
  if (!color) return fallback
  if (/^#[\da-f]{6}$/i.test(color)) return color
  const rgb = color.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/)
  return rgb ? '#' + rgb.slice(1).map((v) => Number(v).toString(16).padStart(2, '0')).join('') : fallback
}
