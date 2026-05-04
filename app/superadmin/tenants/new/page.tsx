import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { CreateTenantForm } from '@/components/superadmin/CreateTenantForm'

export const dynamic = 'force-dynamic'

export default function CreateTenantPage() {
  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <Link
          href="/superadmin"
          className="text-electric text-xs hover:underline w-fit"
        >
          ← Volver
        </Link>
        <h1 className="text-[44px] font-light tracking-tight leading-tight mt-2">
          Crear negocio
        </h1>
        <p className="text-muted text-sm mt-2">
          Define los datos básicos del tenant. Al guardar generamos un enlace
          de invitación para el dueño.
        </p>
      </div>

      <Card>
        <CreateTenantForm />
      </Card>
    </div>
  )
}
