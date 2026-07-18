// lib/caducidad.ts — constantes y tipos PUROS del vencimiento de puntos.
//
// Igual que lib/tarjeta.ts y lib/notas.ts: NO importar nada de servidor. Lo
// consume MarcaForm ('use client') y también las páginas de la PWA. La capa
// de datos (RPC) vive en lib/tenantQueries.ts.

// Plazos que puede elegir un negocio. `null` = los puntos nunca vencen.
// Si se agrega una opción hay que extender también el CHECK de la columna
// `tenants.puntos_caducidad_meses` en 0032_caducidad_puntos.sql.
export const CADUCIDAD_MESES = [3, 6, 12] as const
export type CaducidadMeses = (typeof CADUCIDAD_MESES)[number]

export function esCaducidadValida(v: unknown): v is CaducidadMeses {
  return CADUCIDAD_MESES.includes(v as CaducidadMeses)
}

export function caducidadLabel(meses: number | null): string {
  if (meses === null) return 'Nunca vencen'
  if (meses === 12) return '12 meses (1 año)'
  return `${meses} meses`
}

/** Próximo lote de puntos por vencer de un miembro. */
export interface ProximaCaducidad {
  /** Plazo configurado por el negocio. null = sin caducidad. */
  meses: number | null
  /** Puntos que vencen en `fecha`. 0 si no hay nada por vencer. */
  puntos: number
  /** Fecha de vencimiento en formato YYYY-MM-DD, o null. */
  fecha: string | null
}
