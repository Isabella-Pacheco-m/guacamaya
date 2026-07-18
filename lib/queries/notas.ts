// Solo servidor: este módulo usa la service-role key. El import de
// 'server-only' hace que importarlo desde un componente cliente falle en
// BUILD en vez de reventar en el navegador con "supabaseKey is required".
import 'server-only'

import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Nota } from '@/lib/notas'

// =====================================================================
// Notas (post-it de la marca)
// =====================================================================

export class NotaError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'NotaError'
  }
}

export async function listNotas(tenantId: string, limit = 50): Promise<Nota[]> {
  const { data, error } = await supabaseAdmin.rpc('list_notas', {
    p_tenant_id: tenantId,
    p_limit: limit,
  })
  if (error) throw error
  return (data ?? []) as Nota[]
}

export async function createNota(
  tenantId: string,
  cuerpo: string,
  color: string,
  pinned: boolean
): Promise<Nota> {
  const { data, error } = await supabaseAdmin.rpc('create_nota', {
    p_tenant_id: tenantId,
    p_cuerpo: cuerpo,
    p_color: color,
    p_pinned: pinned,
  })
  if (error) {
    if ((error.message || '').includes('cuerpo no puede estar vacio')) {
      throw new NotaError('El mensaje no puede estar vacío', 400)
    }
    throw error
  }
  return data as Nota
}

export async function deleteNota(tenantId: string, id: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc('delete_nota', {
    p_tenant_id: tenantId,
    p_id: id,
  })
  if (error) {
    if ((error.message || '').includes('nota no encontrada')) {
      throw new NotaError('Nota no encontrada', 404)
    }
    throw error
  }
}
