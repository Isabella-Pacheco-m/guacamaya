import type { GaleriaPostPublic } from '@/lib/galeria'
import { Avatar } from '@/components/ui/Avatar'

// Cuadrícula de fotos aprobadas. Columnas tipo mosaico (masonry con CSS
// columns) para respetar proporciones distintas.
export function GaleriaGrid({ posts }: { posts: GaleriaPostPublic[] }) {
  if (posts.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">
        Aún no hay fotos. ¡Sé el primero en subir una!
      </p>
    )
  }
  return (
    <div className="columns-2 gap-3 [column-fill:_balance]">
      {posts.map((p) => (
        <figure
          key={p.id}
          className="mb-3 break-inside-avoid rounded-2xl overflow-hidden bg-white ring-1 ring-black/[0.04] shadow-[0_8px_28px_-14px_rgba(0,0,0,0.25)]"
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.imagen_url}
              alt={p.caption ?? ''}
              className="w-full object-cover bg-surface"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 p-2.5 bg-gradient-to-t from-black/60 to-transparent">
              <Avatar name={p.miembro_nombre} src={p.miembro_avatar_url} size={24} />
              <span className="text-[11px] font-medium text-white truncate drop-shadow">
                {p.miembro_nombre}
              </span>
            </div>
          </div>
          {p.caption && (
            <figcaption className="px-3 py-2 text-[13px] text-graphite/90 leading-snug">
              {p.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  )
}
