'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GaleriaPostPublic } from '@/lib/galeria'
import { Avatar } from '@/components/ui/Avatar'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Bogota',
})

// Rotaciones fijas por posición: dan el desorden de fotos pegadas a mano sin
// usar Math.random (que rompería la hidratación al no coincidir server/cliente).
const TILTS = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2', 'rotate-[0.5deg]', '-rotate-[1.5deg]']

/**
 * Galería en polaroids con scroll infinito.
 *
 * El marco es la clave del efecto: fondo blanco papel, márgenes finos arriba y
 * a los lados y uno GRUESO abajo, donde va la leyenda escrita a mano.
 */
export function GaleriaGrid({
  initial,
  hasMore: initialHasMore,
}: {
  initial: GaleriaPostPublic[]
  hasMore: boolean
}) {
  const [posts, setPosts] = useState(initial)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const sentinel = useRef<HTMLDivElement | null>(null)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || posts.length === 0) return
    setLoading(true)
    try {
      const before = posts[posts.length - 1].created_at
      const res = await fetch(
        `/api/me/galeria/feed?before=${encodeURIComponent(before)}`
      )
      if (!res.ok) {
        setHasMore(false)
        return
      }
      const data = (await res.json()) as {
        posts: GaleriaPostPublic[]
        hasMore: boolean
      }
      // Defensa ante duplicados si entran fotos mientras se hace scroll.
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...data.posts.filter((p) => !seen.has(p.id))]
      })
      setHasMore(data.hasMore)
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, posts])

  // IntersectionObserver: carga la siguiente página al acercarse al final.
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore()
      },
      { rootMargin: '600px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore, hasMore])

  if (posts.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">
        Aún no hay fotos. ¡Sé el primero en subir una!
      </p>
    )
  }

  return (
    <>
      <div className="columns-2 gap-4 [column-fill:_balance]">
        {posts.map((p, i) => (
          <figure
            key={p.id}
            className={
              'mb-5 break-inside-avoid bg-white p-2.5 pb-0 rounded-[3px] ' +
              'shadow-[0_10px_24px_-12px_rgba(42,35,32,0.45)] ring-1 ring-graphite/[0.06] ' +
              'transition-transform duration-300 hover:rotate-0 hover:scale-[1.02] ' +
              TILTS[i % TILTS.length]
            }
          >
            {/* La foto: cuadrada, como una polaroid real */}
            <div className="relative bg-surface overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imagen_url}
                alt={p.caption ?? ''}
                loading="lazy"
                className="w-full aspect-square object-cover"
              />
              {/* Brillo diagonal sutil: da el reflejo del papel fotográfico */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/20"
              />
            </div>

            {/* El borde inferior grueso — el alma de la polaroid */}
            <figcaption className="px-1 pt-3 pb-4">
              {p.caption && (
                <p className="text-[15px] leading-snug text-graphite/90 line-clamp-2">
                  {p.caption}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Avatar name={p.miembro_nombre} src={p.miembro_avatar_url} size={20} />
                <span className="text-[11px] text-muted truncate flex-1">
                  {p.miembro_nombre}
                </span>
                <span className="text-[11px] text-muted/70 shrink-0 tabular-nums">
                  {dateFmt.format(new Date(p.created_at))}
                </span>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Sentinela del scroll infinito */}
      {hasMore && (
        <div ref={sentinel} className="py-8 flex justify-center">
          <span
            className={
              'h-5 w-5 rounded-full border-2 border-border border-t-graphite/50 ' +
              (loading ? 'animate-spin' : 'opacity-0')
            }
          />
        </div>
      )}
      {!hasMore && posts.length > 8 && (
        <p className="py-8 text-center text-xs text-muted">
          Llegaste al final ·{' '}
          <span className="tabular-nums">{posts.length}</span> fotos
        </p>
      )}
    </>
  )
}
