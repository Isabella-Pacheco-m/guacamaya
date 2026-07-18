export type Nivel = 'BRONCE' | 'PLATA' | 'ORO'

export type TipoTransaccion =
  | 'COMPRA'
  | 'CANJE'
  | 'AJUSTE'
  | 'REGALO'
  | 'CUMPLEANOS'
  | 'SELLO'
  | 'SELLO_CANJE'
  | 'GALERIA'
  | 'RETO'
  | 'CADUCIDAD'

export interface Tenant {
  id: string
  nombre: string
  slug: string
  logo_url: string | null
  banner_url: string | null
  color_primario: string
  puntos_por_mil: number
  puntos_cumpleanos: number | null
  // Meses tras los que vence un punto ganado. null = nunca vencen.
  puntos_caducidad_meses: number | null
}

export interface Miembro {
  id: string
  tenant_id: string
  nombre: string
  telefono: string | null
  email: string | null
  puntos_actuales: number
  puntos_historicos: number
  nivel: Nivel
  mes_cumpleanos: number | null
  sellos_actuales: number
  tarjeta_ciclo: number
  avatar_url: string | null
}

export interface Transaccion {
  id: string
  tenant_id: string
  miembro_id: string
  tipo: TipoTransaccion
  monto_cop: number | null
  puntos_delta: number
  nota: string | null
  created_at: string
}

export interface Recompensa {
  id: string
  tenant_id: string
  nombre: string
  descripcion: string | null
  costo_puntos: number
  activa: boolean
  imagen_url: string | null
}

export interface FeedPost {
  id: string
  tenant_id: string
  titulo: string | null
  cuerpo: string
  imagen_url: string | null
  link_url: string | null
  link_label: string | null
  autor_email: string | null
  // Autoría: si autor_miembro_id es null el post es del negocio; si no, es de
  // un miembro y autor_nombre trae su nombre para mostrar.
  autor_miembro_id: string | null
  autor_nombre: string | null
  // Foto ACTUAL del miembro autor (join en list_feed_posts). Null para posts
  // del negocio o miembros sin foto.
  autor_avatar_url?: string | null
  created_at: string
}

export type SorteoEstado = 'ABIERTO' | 'CERRADO' | 'SORTEADO'

export interface Sorteo {
  id: string
  tenant_id: string
  titulo: string
  descripcion: string | null
  requisitos: string | null
  imagen_url: string | null
  cierra_at: string | null
  estado: SorteoEstado
  ganador_miembro_id: string | null
  created_at: string
}

export interface SorteoConMeta extends Sorteo {
  participaciones_count: number
  ganador_nombre?: string | null
}

export interface SorteoParticipacion {
  id: string
  sorteo_id: string
  tenant_id: string
  miembro_id: string
  evidencia_url: string | null
  comentario: string | null
  created_at: string
}

export interface SorteoParticipacionAdmin {
  id: string
  miembro_id: string
  miembro_nombre: string
  miembro_telefono: string | null
  evidencia_url: string | null
  comentario: string | null
  created_at: string
}
