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
// 42883 = undefined_function (Postgres). PGRST202 = PostgREST no encontró la
// función en su caché de esquema, que es lo que devuelve un .rpc() a una
// función que todavía no existe.
const UNDEFINED_FUNCTION = ['42883', 'PGRST202']

function errorCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null
    ? (error as { code?: unknown }).code
    : undefined
}

export function isUndefinedColumn(error: unknown): boolean {
  return errorCode(error) === UNDEFINED_COLUMN
}

/** RPC que aún no existe porque su migración no se ha aplicado. */
export function isMissingFunction(error: unknown): boolean {
  return UNDEFINED_FUNCTION.includes(errorCode(error) as string)
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
