export const NS = 'https://guacamaya.net/'

type Token = Record<string, unknown>

export const getTenantId = (t: Token): string => t[NS + 'tenantId'] as string
export const getMiembroId = (t: Token): string => t[NS + 'miembroId'] as string
