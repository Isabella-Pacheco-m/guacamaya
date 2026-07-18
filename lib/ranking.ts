// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

// NOTA: los tipos de este módulo se pueden importar con `import type` desde
// componentes cliente sin arrastrar supabase-admin al bundle. No importar
// VALORES de aquí en 'use client'.

/** Cuántos miembros se muestran en la tabla de posiciones de la comunidad. */
export const RANKING_LIMIT = 10

export interface RankingRow {
  miembro_id: string
  nombre: string
  avatar_url: string | null
  /** puntos_historicos — ver la nota de 0033_ranking.sql sobre por qué. */
  puntos: number
  posicion: number
}

export interface RankingPosicion {
  /** null si el miembro todavía no acumula puntos. */
  posicion: number | null
  puntos: number
  /** Miembros del club con al menos un punto. */
  total: number
}

export async function listRanking(
  tenantId: string,
  limit = RANKING_LIMIT
): Promise<RankingRow[]> {
  const { data, error } = await supabaseAdmin.rpc('list_ranking', {
    p_tenant_id: tenantId,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as RankingRow[]
}

export async function getRankingPosicion(
  tenantId: string,
  miembroId: string
): Promise<RankingPosicion> {
  const { data, error } = await supabaseAdmin.rpc('get_ranking_posicion', {
    p_tenant_id: tenantId,
    p_miembro_id: miembroId,
  })
  if (error) throw error
  return data as RankingPosicion
}
