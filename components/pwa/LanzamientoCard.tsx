'use client'

import { useEffect, useState } from 'react'
import { estaRevelado, type Lanzamiento } from '@/lib/lanzamientos'

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  }
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-light tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-wide text-muted mt-1">
        {label}
      </span>
    </div>
  )
}

export function LanzamientoCard({ lanzamiento: l }: { lanzamiento: Lanzamiento }) {
  // Reevalúa cada segundo para pasar de countdown a revelado sin recargar.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (l.estado !== 'teaser' || !l.revela_at) return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [l.estado, l.revela_at])

  const revelado = estaRevelado(l)
  const restante = l.revela_at ? new Date(l.revela_at).getTime() - Date.now() : 0
  const p = parts(restante)

  return (
    <article className="bg-white rounded-3xl overflow-hidden ring-1 ring-black/[0.04] shadow-[0_12px_40px_-16px_rgba(0,0,0,0.22)]">
      {l.banner_url && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={l.banner_url}
            alt=""
            className={
              'w-full aspect-[16/9] object-cover ' +
              (revelado ? '' : 'blur-[2px] scale-105')
            }
          />
          {!revelado && (
            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                Muy pronto
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-5 flex flex-col gap-3">
        <h3 className="text-xl font-semibold tracking-tight text-graphite">
          {l.titulo}
        </h3>

        {revelado ? (
          <>
            {l.descripcion && (
              <p className="text-[15px] text-graphite/90 whitespace-pre-wrap leading-relaxed">
                {l.descripcion}
              </p>
            )}
            {l.cta_url && (
              <a
                href={l.cta_url}
                target="_blank"
                rel="noreferrer"
                className="self-start mt-1 inline-flex items-center gap-1.5 rounded-full bg-lime text-graphite px-5 py-2.5 text-sm font-medium transition-transform hover:scale-[1.02] active:scale-95"
              >
                {l.cta_label || 'Ver más'}
                <span>→</span>
              </a>
            )}
          </>
        ) : (
          <>
            {l.teaser && (
              <p className="text-[15px] text-graphite/80 whitespace-pre-wrap leading-relaxed">
                {l.teaser}
              </p>
            )}
            {l.revela_at && (
              <div className="mt-1 rounded-2xl bg-surface px-4 py-3 flex items-center justify-around">
                <Cell value={p.d} label="días" />
                <Cell value={p.h} label="hrs" />
                <Cell value={p.m} label="min" />
                <Cell value={p.s} label="seg" />
              </div>
            )}
          </>
        )}
      </div>
    </article>
  )
}
