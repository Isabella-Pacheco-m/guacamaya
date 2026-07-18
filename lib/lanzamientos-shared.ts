// lib/lanzamientos-shared.ts — tipos y helpers PUROS de lanzamientos.
//
// IMPORTANTE: este módulo NO debe importar nada de servidor (supabase-admin,
// fs, …). Es el único punto del que puede importar VALORES un componente
// 'use client'. Mismo patrón que lib/tarjeta.ts y lib/notas.ts.
//
// El motivo es concreto: `lib/lanzamientos.ts` importa `supabase-admin`, así
// que si un componente cliente importa de ahí un valor (no solo un `type`), el
// bundle del navegador intenta construir el cliente admin sin la service-role
// key y revienta en runtime con "supabaseKey is required".

export type LanzamientoEstado = 'teaser' | 'activo' | 'finalizado'

export interface Lanzamiento {
  id: string
  tenant_id: string
  titulo: string
  teaser: string | null
  descripcion: string | null
  banner_url: string | null
  cta_url: string | null
  cta_label: string | null
  estado: LanzamientoEstado
  revela_at: string | null
  created_at: string
}

/**
 * ¿Ya se reveló el lanzamiento?
 *
 * `activo` siempre; `teaser` solo cuando su `revela_at` ya pasó (así la cuenta
 * regresiva puede revelar sola en el cliente, sin recargar). Los `finalizado`
 * nunca se muestran como revelados.
 */
export function estaRevelado(
  l: Pick<Lanzamiento, 'estado' | 'revela_at'>
): boolean {
  if (l.estado === 'activo') return true
  if (l.estado === 'teaser') {
    if (!l.revela_at) return false
    return new Date(l.revela_at).getTime() <= Date.now()
  }
  return false
}
