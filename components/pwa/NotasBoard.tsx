import { notaColorStyle, type Nota } from '@/lib/notas'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Bogota',
})

// Fecha corta y humana: hoy / ayer / "12 mar".
function fechaCorta(iso: string): string {
  const d = new Date(iso)
  const dias = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (dias < 1) return 'hoy'
  if (dias < 2) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  return dateFmt.format(d)
}

// Tablero de notas post-it de la marca en la PWA. Diseño de tarjetas pastel
// con una leve rotación alterna para el aire de "post-it pegado".
export function NotasBoard({
  notas,
  titulo = 'Del negocio',
}: {
  notas: Nota[]
  titulo?: string | null
}) {
  if (notas.length === 0) return null

  return (
    <section className="mb-6">
      {titulo && (
        <p className="text-[11px] uppercase tracking-wider text-muted mb-3">
          {titulo}
        </p>
      )}
      {/* Tres columnas en pantallas anchas: con dos, cada post-it cuadrado
          crecía demasiado. El max-w del ítem pone el techo definitivo. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 justify-items-center sm:justify-items-start">
        {notas.map((n, i) => {
          const s = notaColorStyle(n.color)
          const rot = i % 2 === 0 ? '-rotate-1' : 'rotate-1'
          return (
            <div
              key={n.id}
              // aspect-square: un post-it real es cuadrado. El texto se recorta
              // si no cabe, en vez de estirar la nota.
              className={`w-full max-w-[240px] aspect-square flex flex-col overflow-hidden rounded-xl p-4 shadow-[0_6px_16px_-8px_rgba(42,35,32,0.3)] transition-transform hover:rotate-0 ${rot}`}
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              {n.pinned && (
                <span
                  className="self-start mb-1.5 text-[9px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 shrink-0"
                  style={{ background: s.text, color: s.bg }}
                >
                  Fijada
                </span>
              )}
              <p
                className="text-[13px] leading-relaxed whitespace-pre-wrap flex-1 min-h-0 overflow-hidden"
                style={{ color: s.text }}
              >
                {n.cuerpo}
              </p>
              {/* Fecha de posteo — separada por una línea del color de la nota */}
              <p
                className="mt-3 pt-2 text-[10px] tracking-wide border-t"
                style={{ color: s.text, opacity: 0.65, borderColor: s.border }}
              >
                {fechaCorta(n.created_at)}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
