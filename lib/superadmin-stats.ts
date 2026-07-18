// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { listTenants } from '@/lib/tenant'
import type { Nivel, Tenant } from '@/types'

// Stats globales para el panel del superadmin. La plataforma es chica
// (pocos tenants, cientos de miembros), así que traemos los miembros de un
// tiro y agregamos en JS en vez de crear RPCs/vistas nuevas.

export interface TenantStats extends Tenant {
  miembros: number
  miembros_30d: number
  puntos_activos: number
  puntos_historicos: number
  niveles: Record<Nivel, number>
}

export interface PlatformStats {
  total_tenants: number
  total_miembros: number
  total_puntos_activos: number
  total_puntos_historicos: number
  tenants: TenantStats[]
}

interface MiembroRow {
  tenant_id: string
  puntos_actuales: number
  puntos_historicos: number
  nivel: Nivel
  created_at: string
}

function emptyNiveles(): Record<Nivel, number> {
  return { BRONCE: 0, PLATA: 0, ORO: 0 }
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const tenants = await listTenants()

  const { data, error } = await supabaseAdmin
    .from('miembros')
    .select('tenant_id, puntos_actuales, puntos_historicos, nivel, created_at')
  if (error) throw error
  const miembros = (data ?? []) as MiembroRow[]

  const hace30d = Date.now() - 30 * 24 * 60 * 60 * 1000

  const porTenant = new Map<string, TenantStats>()
  for (const t of tenants) {
    porTenant.set(t.id, {
      ...t,
      miembros: 0,
      miembros_30d: 0,
      puntos_activos: 0,
      puntos_historicos: 0,
      niveles: emptyNiveles(),
    })
  }

  let totalMiembros = 0
  let totalActivos = 0
  let totalHistoricos = 0

  for (const m of miembros) {
    const stats = porTenant.get(m.tenant_id)
    if (!stats) continue // miembro huérfano (tenant ya borrado): lo ignoramos
    stats.miembros += 1
    stats.puntos_activos += m.puntos_actuales ?? 0
    stats.puntos_historicos += m.puntos_historicos ?? 0
    if (m.nivel in stats.niveles) stats.niveles[m.nivel] += 1
    if (new Date(m.created_at).getTime() >= hace30d) stats.miembros_30d += 1

    totalMiembros += 1
    totalActivos += m.puntos_actuales ?? 0
    totalHistoricos += m.puntos_historicos ?? 0
  }

  return {
    total_tenants: tenants.length,
    total_miembros: totalMiembros,
    total_puntos_activos: totalActivos,
    total_puntos_historicos: totalHistoricos,
    tenants: Array.from(porTenant.values()),
  }
}
