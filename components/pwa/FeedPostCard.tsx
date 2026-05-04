import type { FeedPost } from '@/types'

const dateFmt = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Bogota',
})

export function FeedPostCard({ post }: { post: FeedPost }) {
  return (
    <article className="bg-white rounded-lg shadow-card overflow-hidden">
      {post.imagen_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.imagen_url}
          alt=""
          className="w-full max-h-72 object-cover"
        />
      )}
      <div className="p-6 flex flex-col gap-2.5">
        <p className="text-[11px] uppercase tracking-wider text-muted font-medium">
          {dateFmt.format(new Date(post.created_at))}
        </p>
        <h3 className="text-xl font-light leading-tight tracking-tight">
          {post.titulo}
        </h3>
        <p className="text-sm text-graphite whitespace-pre-wrap leading-relaxed">
          {post.cuerpo}
        </p>
        {post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noreferrer"
            className="text-electric text-sm font-medium hover:underline self-start mt-2 inline-flex items-center gap-1 group"
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
