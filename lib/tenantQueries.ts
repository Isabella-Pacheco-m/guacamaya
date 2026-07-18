// Fachada de compatibilidad: la capa de datos vive en lib/queries/* por
// dominio (miembros, recompensas, tarjeta, notas, metricas). Este módulo
// re-exporta todo para no romper los imports existentes
// (`from '@/lib/tenantQueries'`). Código nuevo: importar del módulo de
// dominio directamente.
export * from './queries/miembros'
export * from './queries/recompensas'
export * from './queries/tarjeta'
export * from './queries/notas'
export * from './queries/metricas'
