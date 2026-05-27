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

export interface TenantFeatures {
  tenant_id: string
  feed_enabled: boolean
  sorteos_enabled: boolean
  tarjeta_enabled: boolean
  cumpleanos_enabled: boolean
  feed_miembros_pueden_publicar: boolean
  // Registro abierto: cualquier usuario logueado puede unirse a la comunidad
  // sin enlace de invitación. Default true.
  registro_abierto: boolean
  tarjeta_size: number
  sello_valor_cop: number | null
  tarjeta_color_fondo: string
  tarjeta_color_sello: string
  tarjeta_estilo_sello: TarjetaEstilo
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
  { id: 'grafito', nombre: 'Grafito', colorFondo: '#1A1A1E', colorSello: '#B8FA4E', estilo: 'circulo' },
  { id: 'cafe', nombre: 'Café', colorFondo: '#3B2A20', colorSello: '#E8C18A', estilo: 'circulo' },
  { id: 'elegante', nombre: 'Elegante', colorFondo: '#0F1B2D', colorSello: '#D4AF37', estilo: 'estrella' },
  { id: 'vibrante', nombre: 'Vibrante', colorFondo: '#6D28D9', colorSello: '#FDE047', estilo: 'diamante' },
  { id: 'menta', nombre: 'Menta', colorFondo: '#0F3D3E', colorSello: '#7FE7C4', estilo: 'hexagono' },
  { id: 'coral', nombre: 'Coral', colorFondo: '#7A1F3D', colorSello: '#FF8FA3', estilo: 'corazon' },
]
