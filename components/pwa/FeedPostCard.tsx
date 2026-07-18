import type { FeedPostPublic, Tenant } from '@/types'
import { Avatar } from '@/components/ui/Avatar'

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
  post: FeedPostPublic
  tenant: Pick<Tenant, 'nombre' | 'logo_url'>
}) {
  const esMiembro = post.autor_miembro_id != null
  const autorNombre = esMiembro ? post.autor_nombre ?? 'Miembro' : tenant.nombre
  const tieneImagen = Boolean(post.imagen_url)

  return (
    <article className="group bg-white rounded-3xl ring-1 ring-black/[0.04] shadow-[0_12px_40px_-16px_rgba(0,0,0,0.22)] overflow-hidden transition-shadow duration-300 hover:shadow-[0_22px_55px_-18px_rgba(0,0,0,0.3)]">
      {/* Encabezado: autor */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        {!esMiembro && tenant.logo_url ? (
          <span className="h-11 w-11 rounded-full bg-white ring-1 ring-black/[0.06] shrink-0 overflow-hidden flex items-center justify-center">
            {/* object-cover sin padding: el logo llena el círculo completo,
                como una foto de perfil — con contain quedaba un margen. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tenant.logo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
        ) : esMiembro ? (
          <Avatar name={autorNombre} src={post.autor_avatar_url} size={44} />
        ) : (
          <span className="h-11 w-11 rounded-full shrink-0 flex items-center justify-center text-base font-semibold bg-graphite text-lime">
            {initial(autorNombre)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-graphite truncate">
              {autorNombre}
            </p>
            <span
              className={
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
                (esMiembro
                  ? 'bg-surface text-muted'
                  : 'bg-electric/10 text-electric')
              }
            >
              {esMiembro ? 'Miembro' : 'Negocio'}
            </span>
          </div>
          <p className="text-[11px] text-muted mt-0.5">
            {relativeTime(post.created_at)}
          </p>
        </div>
      </div>

      {/* Imagen (con título superpuesto si lo hay) */}
      {tieneImagen && (
        <div className="px-5">
          <div className="relative rounded-2xl overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imagen_url as string}
              alt=""
              className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            {post.titulo && (
              <>
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <h3 className="absolute inset-x-0 bottom-0 px-4 pb-4 text-white text-2xl font-semibold leading-tight tracking-tight drop-shadow-sm">
                  {post.titulo}
                </h3>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cuerpo */}
      <div className="px-5 pt-4 pb-5 flex flex-col gap-2.5">
        {post.titulo && !tieneImagen && (
          <h3 className="text-2xl font-semibold leading-tight tracking-tight text-graphite">
            {post.titulo}
          </h3>
        )}
        <p className="text-[15px] text-graphite/90 whitespace-pre-wrap leading-relaxed">
          {post.cuerpo}
        </p>
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noreferrer"
            className="self-start mt-1 inline-flex items-center gap-1.5 rounded-full bg-electric px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 group/link"
          >
            {post.link_label || post.link_url}
            <span className="transition-transform group-hover/link:translate-x-0.5">
              →
            </span>
          </a>
        )}
      </div>
    </article>
  )
}
