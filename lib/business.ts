import type { Nivel } from '@/types'

// Única fuente TS de los umbrales de nivel. OJO: los RPCs SQL (0003, 0008,
// 0028, 0030) llevan su copia de 500/2000 — si esto cambia, cambiarlos ahí
// también (deuda documentada; unificar si algún día son por-tenant).
export const UMBRALES = { PLATA: 500, ORO: 2000 } as const

// Progresión hacia el siguiente nivel, derivada de UMBRALES. La consume la
// PWA (barra de progreso) — módulo puro, importable desde 'use client'.
export const NIVEL_PROGRESO: Record<
  Nivel,
  { siguiente: Nivel | null; meta: number | null }
> = {
  BRONCE: { siguiente: 'PLATA', meta: UMBRALES.PLATA },
  PLATA: { siguiente: 'ORO', meta: UMBRALES.ORO },
  ORO: { siguiente: null, meta: null },
}

export function calcularPuntos(montoCop: number, puntosPorMil: number): number {
  return Math.floor(montoCop / 1000) * puntosPorMil
}

export function calcularNivel(puntosHistoricos: number): Nivel {
  if (puntosHistoricos >= UMBRALES.ORO) return 'ORO'
  if (puntosHistoricos >= UMBRALES.PLATA) return 'PLATA'
  return 'BRONCE'
}

export function validarCanje(puntosActuales: number, costoPuntos: number): void {
  if (puntosActuales < costoPuntos) throw new Error('Puntos insuficientes')
}
