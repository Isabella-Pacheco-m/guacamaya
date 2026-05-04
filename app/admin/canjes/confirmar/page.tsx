import Link from 'next/link'
import { requireAdmin } from '@/lib/page-auth'
import { getMiembroById, getRecompensaById } from '@/lib/tenantQueries'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmarCanjeForm } from '@/components/admin/ConfirmarCanjeForm'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ConfirmarCanjePage({
  searchParams,
}: {
  searchParams: { m?: string; r?: string }
}) {
  const { tenantId } = await requireAdmin()

  const miembroId = searchParams.m
  const recompensaId = searchParams.r

  if (
    !miembroId ||
    !recompensaId ||
    !UUID_RE.test(miembroId) ||
    !UUID_RE.test(recompensaId)
  ) {
    return (
      <ErrorScreen
        title="Código inválido"
        body="El QR no contiene los datos esperados."
      />
    )
  }

  const [miembro, recompensa] = await Promise.all([
    getMiembroById(tenantId, miembroId),
    getRecompensaById(tenantId, recompensaId),
  ])

  if (!miembro) {
    return (
      <ErrorScreen
        title="Cliente no encontrado"
        body="Este miembro no pertenece a tu negocio."
      />
    )
  }
  if (!recompensa) {
    return (
      <ErrorScreen
        title="Recompensa no encontrada"
        body="La recompensa del QR ya no existe."
      />
    )
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <header className="mb-6">
        <Link href="/admin/dashboard" className="text-xs text-muted hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-light mt-1">Confirmar canje</h1>
      </header>

      <Card className="mb-6">
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted">Cliente</span>
            <span className="font-medium text-right">{miembro.nombre}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Recompensa</span>
            <span className="font-medium text-right">{recompensa.nombre}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Costo</span>
            <span className="font-medium">{recompensa.costo_puntos} pts</span>
          </div>
        </div>
      </Card>

      <ConfirmarCanjeForm
        miembroId={miembro.id}
        miembroNombre={miembro.nombre}
        recompensaId={recompensa.id}
        recompensaNombre={recompensa.nombre}
        costoPuntos={recompensa.costo_puntos}
        saldoActual={miembro.puntos_actuales}
      />
    </main>
  )
}

function ErrorScreen({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <Card className="text-center">
        <h1 className="text-xl font-light mb-3">{title}</h1>
        <p className="text-sm text-muted mb-6">{body}</p>
        <Link href="/admin/dashboard">
          <Button variant="secondary" className="w-full">
            Volver al dashboard
          </Button>
        </Link>
      </Card>
    </main>
  )
}
