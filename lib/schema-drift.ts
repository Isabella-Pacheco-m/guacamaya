// lib/schema-drift.ts — tolerancia a migraciones pendientes.
//
// Las lecturas críticas (tenant + tenant_features) piden columnas explícitas.
// Si el código se despliega antes de correr sus migraciones, Postgres rechaza
// el SELECT COMPLETO con 42703 (undefined_column) y se cae toda la home del
// tenant — una columna faltante tumbaba todos los subdominios.
//
// Con esto, esas lecturas detectan el 42703, reintentan pidiendo `*` y
// completan lo que falte con los defaults: la feature nueva queda apagada
// hasta que se migre, en vez de romper la app.

const UNDEFINED_COLUMN = '42703'

export function isUndefinedColumn(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === UNDEFINED_COLUMN
  )
}

/** Log único y accionable: qué falta y qué hacer. */
export function warnSchemaDrift(where: string, error: unknown): void {
  const msg =
    typeof error === 'object' && error !== null
      ? String((error as { message?: unknown }).message ?? error)
      : String(error)
  console.error(
    `[schema-drift] ${where}: ${msg}. ` +
      'Hay migraciones sin aplicar en supabase/migrations/. ' +
      'Se sirvió con valores por defecto; aplícalas para restaurar la funcionalidad.'
  )
}
