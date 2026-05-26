'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Miembro } from '@/types'
import { Card } from '@/components/ui/Card'
import { NivelBadge } from '@/components/ui/Badge'

const COP = new Intl.NumberFormat('es-CO')

// Normaliza para buscar sin importar mayúsculas ni tildes (José == jose).
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function formatTelefono(telefono: string | null): string | null {
  if (!telefono) return null
  const m = telefono.match(/^57(\d{3})(\d{3})(\d{4})$/)
  return m ? `${m[1]} ${m[2]} ${m[3]}` : telefono
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

export function MiembrosBuscador({
  miembros,
  tarjetaEnabled,
}: {
  miembros: Miembro[]
  tarjetaEnabled: boolean
}) {
  const [q, setQ] = useState('')

  const filtrados = useMemo(() => {
    const term = norm(q.trim())
    if (!term) return miembros
    const digits = term.replace(/\D/g, '')
    return miembros.filter((m) => {
      if (norm(m.nombre).includes(term)) return true
      if (m.email && norm(m.email).includes(term)) return true
      if (digits && m.telefono && m.telefono.replace(/\D/g, '').includes(digits))
        return true
      return false
    })
  }, [miembros, q])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted pointer-events-none" />
        <input
          type="search"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, correo o teléfono"
          aria-label="Buscar miembro"
          className="w-full rounded-full border border-border bg-white pl-12 pr-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-electric/30 focus:border-electric"
        />
      </div>

      <p className="px-1 text-xs text-muted">
        {q.trim()
          ? `${filtrados.length} ${filtrados.length === 1 ? 'resultado' : 'resultados'}`
          : `${miembros.length} ${miembros.length === 1 ? 'miembro' : 'miembros'} registrados`}
      </p>

      {miembros.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">
            Aún no hay miembros. Crea el primero abajo.
          </p>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-muted">
            Ningún miembro coincide con{' '}
            <span className="text-graphite">«{q.trim()}»</span>.
          </p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <ul className="divide-y divide-border">
            {filtrados.map((m) => {
              const contacto = [formatTelefono(m.telefono), m.email]
                .filter(Boolean)
                .join('  ·  ')
              return (
                <li key={m.id}>
                  <Link
                    href={`/admin/miembros/${m.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-surface/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-graphite truncate">
                        {m.nombre}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {contacto || 'Sin contacto'}
                      </p>
                    </div>

                    <span className="hidden shrink-0 sm:block">
                      <NivelBadge nivel={m.nivel} />
                    </span>

                    <div className="w-16 shrink-0 text-right">
                      <p className="tabular-nums text-graphite leading-tight">
                        {COP.format(m.puntos_actuales)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted">
                        puntos
                      </p>
                    </div>

                    {tarjetaEnabled && (
                      <div className="w-12 shrink-0 text-right">
                        <p className="tabular-nums text-graphite leading-tight">
                          {m.sellos_actuales}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-muted">
                          sellos
                        </p>
                      </div>
                    )}

                    <span
                      className="shrink-0 text-electric text-lg leading-none"
                      aria-hidden
                    >
                      →
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}
