import { notaColorStyle, type Nota } from '@/lib/notas'

// Tablero de notas post-it de la marca en la PWA. Cabe en la home (server
// component). Diseño de tarjetas pastel con una leve rotación alterna para el
// aire de "post-it pegado".
export function NotasBoard({ notas }: { notas: Nota[] }) {
  if (notas.length === 0) return null

  return (
    <section className="mb-6">
      <p className="text-[11px] uppercase tracking-wider text-muted mb-3">
        Del negocio
      </p>
      <div className="grid grid-cols-2 gap-3">
        {notas.map((n, i) => {
          const s = notaColorStyle(n.color)
          const rot = i % 2 === 0 ? '-rotate-1' : 'rotate-1'
          return (
            <div
              key={n.id}
              className={`rounded-xl p-4 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.25)] transition-transform hover:rotate-0 ${rot}`}
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              {n.pinned && (
                <span
                  className="inline-block mb-1.5 text-[9px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5"
                  style={{ background: s.text, color: s.bg }}
                >
                  Fijada
                </span>
              )}
              <p
                className="text-[13px] leading-relaxed whitespace-pre-wrap"
                style={{ color: s.text }}
              >
                {n.cuerpo}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
