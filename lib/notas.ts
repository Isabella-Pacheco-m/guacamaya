// lib/notas.ts — constantes y tipos PUROS de las notas post-it.
//
// Igual que lib/tarjeta.ts: NO importar nada de servidor. Lo consumen el panel
// admin ('use client') y el tablero de la PWA. La capa de datos (RPC) vive en
// lib/tenantQueries.ts.

export const NOTA_COLORS = ['amarillo', 'rosa', 'verde', 'azul', 'lavanda'] as const
export type NotaColor = (typeof NOTA_COLORS)[number]

export interface Nota {
  id: string
  tenant_id: string
  cuerpo: string
  color: NotaColor
  pinned: boolean
  created_at: string
}

// Estilo pastel de cada color (fondo, borde y texto), afín a las referencias
// de post-it. Se usan como estilos inline para no depender del safelist de
// Tailwind con clases dinámicas.
export const NOTA_COLOR_STYLES: Record<
  NotaColor,
  { bg: string; border: string; text: string; label: string }
> = {
  amarillo: { bg: '#FEF3C7', border: '#FDE68A', text: '#7C5E10', label: 'Amarillo' },
  rosa: { bg: '#FCE7F0', border: '#FBCFE1', text: '#9D2B62', label: 'Rosa' },
  verde: { bg: '#DCFCE7', border: '#BBF7D0', text: '#166534', label: 'Verde' },
  azul: { bg: '#DBEAFE', border: '#BFDBFE', text: '#1E40AF', label: 'Azul' },
  lavanda: { bg: '#EDE9FE', border: '#DDD6FE', text: '#5B21B6', label: 'Lavanda' },
}

export function notaColorStyle(color: string) {
  return NOTA_COLOR_STYLES[(color as NotaColor)] ?? NOTA_COLOR_STYLES.amarillo
}
