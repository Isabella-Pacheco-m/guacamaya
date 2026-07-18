'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { FeedPost, Miembro, Sorteo, Tenant } from '@/types'
import type { Nota } from '@/lib/notas'
import type { GaleriaPostPublic } from '@/lib/galeria'
import type { Reto } from '@/lib/retos'
import type { Lanzamiento } from '@/lib/lanzamientos-shared'
import { Card } from '@/components/ui/Card'
import { FeedPostCard } from '@/components/pwa/FeedPostCard'
import { FeedComposer } from '@/components/pwa/FeedComposer'
import { GaleriaGrid } from '@/components/pwa/GaleriaGrid'
import { GaleriaComposer } from '@/components/pwa/GaleriaComposer'
import { LanzamientoCard } from '@/components/pwa/LanzamientoCard'
import { NotasBoard } from '@/components/pwa/NotasBoard'

export type TabId =
  | 'todo'
  | 'novedades'
  | 'galeria'
  | 'retos'
  | 'sorteos'
  | 'lanzamientos'

export interface ComunidadData {
  notas: Nota[]
  posts: FeedPost[]
  galeria: { initial: GaleriaPostPublic[]; hasMore: boolean }
  retos: Reto[]
  sorteos: Sorteo[]
  lanzamientos: Lanzamiento[]
}

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  timeZone: 'America/Bogota',
})

export function ComunidadTabs({
  tenant,
  miembro,
  data,
  enabled,
  puedePublicar,
  galeriaPuntos,
  initialTab,
}: {
  tenant: Tenant
  miembro: Miembro
  data: ComunidadData
  /** Qué pestañas mostrar, según los flags que activó la marca. */
  enabled: Record<Exclude<TabId, 'todo'>, boolean>
  puedePublicar: boolean
  galeriaPuntos: number
  initialTab: TabId
}) {
  // Solo se ofrecen las pestañas de features encendidas.
  const tabs = useMemo(() => {
    const all: { id: TabId; label: string }[] = [
      { id: 'todo', label: 'Todo' },
      { id: 'novedades', label: 'Novedades' },
      { id: 'galeria', label: 'Galería' },
      { id: 'retos', label: 'Retos' },
      { id: 'sorteos', label: 'Sorteos' },
      { id: 'lanzamientos', label: 'Lanzamientos' },
    ]
    return all.filter(
      (t) => t.id === 'todo' || enabled[t.id as Exclude<TabId, 'todo'>]
    )
  }, [enabled])

  const [tab, setTab] = useState<TabId>(
    tabs.some((t) => t.id === initialTab) ? initialTab : 'todo'
  )

  // Deep-link sin recargar: la pestaña queda en la URL para poder compartirla
  // y para que "atrás" del navegador no saque al usuario de la comunidad.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (tab === 'todo') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }, [tab])

  const show = (id: TabId) => tab === 'todo' || tab === id

  return (
    <>
      {/* ── Chips sticky ── */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-surface/85 backdrop-blur-md border-b border-border/60">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={
                'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ' +
                (tab === t.id
                  ? 'bg-graphite text-white'
                  : 'bg-white text-graphite border border-border hover:border-graphite/40')
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6 flex flex-col gap-8">
        {/* ── Notas: siempre arriba en "Todo" y en Novedades ── */}
        {(tab === 'todo' || tab === 'novedades') && data.notas.length > 0 && (
          <NotasBoard notas={data.notas} titulo="Del negocio" />
        )}

        {/* ── Novedades ── */}
        {enabled.novedades && show('novedades') && (
          <section className="flex flex-col gap-4">
            {tab === 'todo' && (
              <SectionHeader
                titulo="Novedades"
                onVerTodo={() => setTab('novedades')}
              />
            )}
            {puedePublicar && tab === 'novedades' && (
              <FeedComposer
                miembroNombre={miembro.nombre}
                miembroAvatarUrl={miembro.avatar_url}
              />
            )}
            {data.posts.length === 0 ? (
              <Empty texto="Aún no hay publicaciones." />
            ) : (
              (tab === 'todo' ? data.posts.slice(0, 2) : data.posts).map((p) => (
                <FeedPostCard key={p.id} post={p} tenant={tenant} />
              ))
            )}
          </section>
        )}

        {/* ── Galería ── */}
        {enabled.galeria && show('galeria') && (
          <section className="flex flex-col gap-4">
            {tab === 'todo' && (
              <SectionHeader
                titulo="Galería"
                onVerTodo={() => setTab('galeria')}
              />
            )}
            {tab === 'galeria' && <GaleriaComposer puntos={galeriaPuntos} />}
            {tab === 'todo' ? (
              data.galeria.initial.length === 0 ? (
                <Empty texto="Aún no hay fotos de la comunidad." />
              ) : (
                // En "Todo" solo un anticipo; la cuadrícula completa con scroll
                // infinito vive en su propia pestaña.
                <GaleriaGrid
                  initial={data.galeria.initial.slice(0, 4)}
                  hasMore={false}
                />
              )
            ) : (
              <GaleriaGrid
                initial={data.galeria.initial}
                hasMore={data.galeria.hasMore}
              />
            )}
          </section>
        )}

        {/* ── Retos ── */}
        {enabled.retos && show('retos') && (
          <section className="flex flex-col gap-4">
            {tab === 'todo' && (
              <SectionHeader titulo="Retos" onVerTodo={() => setTab('retos')} />
            )}
            {data.retos.length === 0 ? (
              <Empty texto="No hay retos activos por ahora." />
            ) : (
              <div className="flex flex-col gap-3">
                {(tab === 'todo' ? data.retos.slice(0, 2) : data.retos).map(
                  (r) => (
                    <RetoMini key={r.id} reto={r} />
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Sorteos ── */}
        {enabled.sorteos && show('sorteos') && (
          <section className="flex flex-col gap-4">
            {tab === 'todo' && (
              <SectionHeader
                titulo="Sorteos"
                onVerTodo={() => setTab('sorteos')}
              />
            )}
            {data.sorteos.length === 0 ? (
              <Empty texto="No hay sorteos activos por ahora." />
            ) : (
              <div className="flex flex-col gap-3">
                {(tab === 'todo' ? data.sorteos.slice(0, 2) : data.sorteos).map(
                  (s) => (
                    <SorteoMini key={s.id} sorteo={s} />
                  )
                )}
              </div>
            )}
          </section>
        )}

        {/* ── Lanzamientos ── */}
        {enabled.lanzamientos && show('lanzamientos') && (
          <section className="flex flex-col gap-4">
            {tab === 'todo' && (
              <SectionHeader
                titulo="Lanzamientos"
                onVerTodo={() => setTab('lanzamientos')}
              />
            )}
            {data.lanzamientos.length === 0 ? (
              <Empty texto="Aún no hay lanzamientos. Vuelve pronto 👀" />
            ) : (
              <div className="flex flex-col gap-5">
                {(tab === 'todo'
                  ? data.lanzamientos.slice(0, 1)
                  : data.lanzamientos
                ).map((l) => (
                  <LanzamientoCard key={l.id} lanzamiento={l} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}

function SectionHeader({
  titulo,
  onVerTodo,
}: {
  titulo: string
  onVerTodo: () => void
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-[11px] uppercase tracking-wider text-muted">
        {titulo}
      </h2>
      <button
        type="button"
        onClick={onVerTodo}
        className="text-xs text-electric hover:underline"
      >
        Ver todo →
      </button>
    </div>
  )
}

function Empty({ texto }: { texto: string }) {
  return (
    <Card className="text-center" padding="lg">
      <p className="text-sm text-muted">{texto}</p>
    </Card>
  )
}

function RetoMini({ reto: r }: { reto: Reto }) {
  return (
    <Link href={`/retos/${r.id}`} className="block group">
      <article className="bg-white rounded-2xl shadow-card overflow-hidden flex transition-transform group-hover:-translate-y-0.5">
        {r.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={r.imagen_url}
            alt=""
            className="w-24 sm:w-32 object-cover shrink-0"
          />
        )}
        <div className="p-4 flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={
                'text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 font-medium ' +
                (r.estado === 'ABIERTO'
                  ? 'bg-electric/10 text-electric'
                  : 'bg-surface text-muted')
              }
            >
              {r.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
            </span>
            {r.puntos > 0 && (
              <span className="text-[11px] font-medium text-graphite bg-lime/40 rounded-full px-2 py-0.5">
                +{r.puntos} pts
              </span>
            )}
          </div>
          <p className="font-medium leading-tight truncate">{r.titulo}</p>
          {r.descripcion && (
            <p className="text-xs text-muted line-clamp-2">{r.descripcion}</p>
          )}
        </div>
      </article>
    </Link>
  )
}

function SorteoMini({ sorteo: s }: { sorteo: Sorteo }) {
  return (
    <Link href={`/sorteos/${s.id}`} className="block group">
      <article className="bg-white rounded-2xl shadow-card overflow-hidden flex transition-transform group-hover:-translate-y-0.5">
        {s.imagen_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.imagen_url}
            alt=""
            className="w-24 sm:w-32 object-cover shrink-0"
          />
        )}
        <div className="p-4 flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider bg-electric/10 text-electric rounded-full px-2 py-0.5 font-medium">
              {s.estado === 'ABIERTO' ? 'Abierto' : 'Cerrado'}
            </span>
            {s.cierra_at && (
              <span className="text-[11px] text-muted">
                Cierra {dateFmt.format(new Date(s.cierra_at))}
              </span>
            )}
          </div>
          <p className="font-medium leading-tight truncate">{s.titulo}</p>
          {s.descripcion && (
            <p className="text-xs text-muted line-clamp-2">{s.descripcion}</p>
          )}
        </div>
      </article>
    </Link>
  )
}
