// lib/tarjeta.ts — constantes y tipos PUROS de funcionalidades y tarjeta.
//
// IMPORTANTE: este módulo NO debe importar nada de servidor (supabase-admin,
// fs, etc.). Lo consumen tanto Server Components/route handlers como
// componentes 'use client'. Si un cliente importa un valor (no solo `type`)
// de un módulo que a su vez importa `supabase-admin`, el bundle del navegador
// intenta crear el cliente admin sin la service-role key y revienta con
// "supabaseKey is required". Por eso las constantes viven aquí, separadas de
// la lógica de datos en lib/tenant-features.ts.

export const FEATURE_KEYS = [
  'feed_enabled',
  'sorteos_enabled',
  'tarjeta_enabled',
  'cumpleanos_enabled',
  'notas_enabled',
  'galeria_enabled',
  'lanzamientos_enabled',
  'retos_enabled',
  'ranking_enabled',
] as const

export type FeatureKey = (typeof FEATURE_KEYS)[number]

// Formas del sello soportadas por <TarjetaCliente>. Al agregar una nueva forma
// hay que: (1) sumarla aquí, (2) extender el constraint en la migración
// 0018_tarjeta_estilos_extra.sql, (3) darle glyph y, si aplica, clip-path.
export const TARJETA_ESTILOS = [
  'circulo',
  'estrella',
  'corazon',
  'cuadrado',
  'diamante',
  'hexagono',
] as const
export type TarjetaEstilo = (typeof TARJETA_ESTILOS)[number]

export const TARJETA_FONDO_TIPOS = ['solid', 'gradient'] as const
export type TarjetaFondoTipo = (typeof TARJETA_FONDO_TIPOS)[number]

export interface TenantFeatures {
  tenant_id: string
  feed_enabled: boolean
  sorteos_enabled: boolean
  tarjeta_enabled: boolean
  cumpleanos_enabled: boolean
  notas_enabled: boolean
  galeria_enabled: boolean
  galeria_puntos: number
  lanzamientos_enabled: boolean
  retos_enabled: boolean
  // Tabla de posiciones por puntos históricos en la comunidad. Expone nombre
  // y foto de los miembros al resto del club, por eso es opt-in.
  ranking_enabled: boolean
  feed_miembros_pueden_publicar: boolean
  // Registro abierto: cualquier usuario logueado puede unirse a la comunidad
  // sin enlace de invitación. Default true.
  registro_abierto: boolean
  tarjeta_size: number
  sello_valor_cop: number | null
  tarjeta_color_fondo: string
  tarjeta_color_sello: string
  tarjeta_estilo_sello: TarjetaEstilo
  // Fondo de la tarjeta: 'solid' usa solo tarjeta_color_fondo; 'gradient'
  // hace un degradado hacia tarjeta_color_fondo2.
  tarjeta_fondo_tipo: TarjetaFondoTipo
  tarjeta_color_fondo2: string | null
  // PNG subido por la marca para usar como estampilla del sello. Si es null se
  // usa el emblema SVG según tarjeta_estilo_sello.
  tarjeta_sello_url: string | null
}

// Valores por defecto de cada flag. Viven aquí (módulo puro) junto al tipo para
// que la capa de datos y el merge defensivo compartan una sola fuente.
export const DEFAULT_TENANT_FEATURES: Omit<TenantFeatures, 'tenant_id'> = {
  feed_enabled: false,
  sorteos_enabled: false,
  tarjeta_enabled: false,
  cumpleanos_enabled: false,
  notas_enabled: false,
  galeria_enabled: false,
  galeria_puntos: 0,
  lanzamientos_enabled: false,
  retos_enabled: false,
  ranking_enabled: false,
  feed_miembros_pueden_publicar: false,
  registro_abierto: true,
  tarjeta_size: 10,
  sello_valor_cop: null,
  tarjeta_color_fondo: '#2A2320',
  tarjeta_color_sello: '#EBBA4F',
  tarjeta_estilo_sello: 'circulo',
  tarjeta_fondo_tipo: 'solid',
  tarjeta_color_fondo2: null,
  tarjeta_sello_url: null,
}

/**
 * Completa una fila parcial de `tenant_features` con los defaults.
 *
 * Existe para tolerar *schema drift*: si el código se despliega antes de que
 * corran sus migraciones, la fila de la DB no traerá las columnas nuevas. En
 * vez de romper, la feature nueva queda apagada (su default) hasta que se
 * migre. Solo copia claves conocidas — ignora columnas extra (updated_at, …).
 */
export function mergeTenantFeatures(
  tenantId: string,
  row: Record<string, unknown> | null | undefined
): TenantFeatures {
  const out = { tenant_id: tenantId, ...DEFAULT_TENANT_FEATURES } as TenantFeatures
  if (!row) return out
  for (const key of Object.keys(DEFAULT_TENANT_FEATURES) as Array<
    keyof Omit<TenantFeatures, 'tenant_id'>
  >) {
    const v = row[key]
    // `undefined` = la columna no existe en la DB todavía → conservar default.
    // `null` sí es un valor legítimo para las columnas nullable.
    if (v !== undefined) {
      ;(out as unknown as Record<string, unknown>)[key] = v
    }
  }
  return out
}

export const ESTILO_LABEL: Record<TarjetaEstilo, string> = {
  circulo: 'Círculo',
  estrella: 'Estrella',
  corazon: 'Corazón',
  cuadrado: 'Cuadrado',
  diamante: 'Diamante',
  hexagono: 'Hexágono',
}

// Glyph representativo de la FORMA del sello — se usa en el selector de estilo
// del panel admin para que cada opción muestre su figura. (El sello relleno en
// la tarjeta del cliente se dibuja con SVG, no con estos glyphs.)
export const ESTILO_GLYPH: Record<TarjetaEstilo, string> = {
  circulo: '●',
  estrella: '★',
  corazon: '♥',
  cuadrado: '■',
  diamante: '◆',
  hexagono: '⬢',
}

// Recorte CSS (clip-path) para las formas que no son círculo/cuadrado.
// Las que no aparecen aquí se dibujan con border-radius.
export const ESTILO_CLIP: Partial<Record<TarjetaEstilo, string>> = {
  diamante: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  hexagono: 'polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)',
}

// Clase de border-radius del recuadro del sello según la forma.
export function estiloRadiusClass(estilo: TarjetaEstilo): string {
  if (estilo === 'cuadrado') return 'rounded-md'
  if (estilo === 'diamante' || estilo === 'hexagono') return 'rounded-none'
  return 'rounded-full'
}

// Presets de color+forma listos para aplicar de un clic en el panel admin.
export interface TarjetaPreset {
  id: string
  nombre: string
  colorFondo: string
  colorSello: string
  estilo: TarjetaEstilo
}

export const TARJETA_PRESETS: TarjetaPreset[] = [
  { id: 'espresso', nombre: 'Espresso', colorFondo: '#2A2320', colorSello: '#EBBA4F', estilo: 'circulo' },
  { id: 'cafe', nombre: 'Café', colorFondo: '#3B2A20', colorSello: '#E8C18A', estilo: 'circulo' },
  { id: 'terracota', nombre: 'Terracota', colorFondo: '#8C3F24', colorSello: '#F2D0A4', estilo: 'estrella' },
  { id: 'oliva', nombre: 'Oliva', colorFondo: '#4A4A22', colorSello: '#DCCB6A', estilo: 'hexagono' },
  { id: 'arcilla', nombre: 'Arcilla', colorFondo: '#7A4436', colorSello: '#E9B7A0', estilo: 'corazon' },
  { id: 'trigo', nombre: 'Trigo', colorFondo: '#5C4B2E', colorSello: '#F0D79B', estilo: 'diamante' },
]
