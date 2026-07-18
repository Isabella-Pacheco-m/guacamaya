// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'

// =====================================================================
// Métricas
// =====================================================================

export interface MetricasResumen {
  dias: number
  desde: string
  miembros_nuevos: number
  compras_count: number
  compras_monto_cop: number
  canjes_count: number
  puntos_emitidos: number
  puntos_canjeados: number
}

export async function getMetricasResumen(
  tenantId: string,
  dias = 30
): Promise<MetricasResumen> {
  const { data, error } = await supabaseAdmin.rpc('get_metricas_resumen', {
    p_tenant_id: tenantId,
    p_dias: dias,
  })
  if (error) throw error
  return data as MetricasResumen
}
