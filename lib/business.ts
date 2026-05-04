import type { Nivel } from '@/types'

const UMBRALES = { PLATA: 500, ORO: 2000 }

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
