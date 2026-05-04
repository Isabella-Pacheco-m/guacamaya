import Link from 'next/link'
import { listTenants } from '@/lib/tenant'
import { tenantBaseUrl } from '@/lib/config'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

export default async function SuperadminHome() {
  const tenants = await listTenants()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[44px] font-light tracking-tight leading-tight">
            Tenants
          </h1>
          <p className="text-muted text-sm mt-2">
            {tenants.length} {tenants.length === 1 ? 'negocio' : 'negocios'} en
            la plataforma.
          </p>
        </div>
        <Link href="/superadmin/tenants/new">
          <Button>Crear negocio</Button>
        </Link>
      </div>

      <Card padding="none" className="overflow-hidden">
        {tenants.length === 0 ? (
          <div className="p-12 text-center text-muted text-sm">
            Aún no hay tenants. Crea el primero con el botón de arriba.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted border-b border-border">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Slug</th>
                  <th className="px-6 py-3 font-medium">Color</th>
                  <th className="px-6 py-3 font-medium">Puntos / mil</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-border last:border-0 hover:bg-surface/50"
                  >
                    <td className="px-6 py-4 flex items-center gap-3">
                      {t.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.logo_url}
                          alt=""
                          className="h-8 w-8 rounded-md object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-border" />
                      )}
                      {t.nombre}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted">
                      {t.slug}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full inline-block border border-border"
                          style={{ backgroundColor: t.color_primario }}
                        />
                        <span className="font-mono text-xs">
                          {t.color_primario.toUpperCase()}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 tabular-nums">
                      {t.puntos_por_mil}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <a
                        href={tenantBaseUrl(t.slug)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-electric text-xs hover:underline"
                      >
                        Abrir →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
