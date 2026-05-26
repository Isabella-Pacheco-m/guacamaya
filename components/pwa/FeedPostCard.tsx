import type { FeedPost, Tenant } from '@/types'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Bogota',
})

// Tiempo relativo en español ("ahora", "hace 12 min", "ayer", o la fecha).
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ayer'
  if (d < 7) return `hace ${d} d`
  return dateFmt.format(new Date(iso))
}

function initial(name: string): string {
  const t = name.trim()
  return t ? t[0].toUpperCase() : '?'
}

export function FeedPostCard({
  post,
  tenant,
}: {
  post: FeedPost
  tenant: Pick<Tenant, 'nombre' | 'logo_url'>
}) {
  const esMiembro = post.autor_miembro_id != null
  const autorNombre = esMiembro ? post.autor_nombre ?? 'Miembro' : tenant.nombre

  return (
    <article className="bg-white rounded-lg shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {!esMiembro && tenant.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tenant.logo_url}
            alt=""
            className="h-9 w-9 rounded-full object-cover shrink-0"
          />
        ) : (
          <span
            className={
              'h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-sm font-medium ' +
              (esMiembro ? 'bg-surface text-graphite' : 'bg-graphite text-lime')
            }
          >
            {initial(autorNombre)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-graphite truncate">
            {autorNombre}
            {!esMiembro && (
              <span className="ml-1.5 align-middle text-[10px] uppercase tracking-wide text-electric">
                negocio
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted">{relativeTime(post.created_at)}</p>
        </div>
      </div>

      {post.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imagen_url}
          alt=""
          className="w-full max-h-80 object-cover"
        />
      )}

      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        {post.titulo && (
          <h3 className="text-lg font-medium leading-snug tracking-tight">
            {post.titulo}
          </h3>
        )}
        <p className="text-sm text-graphite whitespace-pre-wrap leading-relaxed">
          {post.cuerpo}
        </p>
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noreferrer"
            className="text-electric text-sm font-medium hover:underline self-start mt-1 inline-flex items-center gap-1 group"
          >
            {post.link_label || post.link_url}
            <span className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </a>
        )}
      </div>
    </article>
  )
}
