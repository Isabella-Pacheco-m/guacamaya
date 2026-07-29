import Image from 'next/image'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { SuscribirseForm } from '@/components/pwa/SuscribirseForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Crea tu club — Guacamaya',
}

const INCLUYE = [
  'Tu club en tunegocio.guacamaya.net con tu logo y tus colores',
  'Puntos, niveles, recompensas y tarjeta de sellos',
  'Comunidad: feed, notas, galería, retos, sorteos y lanzamientos',
  'Panel de administración con métricas de tus clientes',
]

// Página pública de suscripción (vive en el apex, no en un subdominio).
export default function SuscribirsePage() {
  return (
    <main className="min-h-screen bg-tenant-halo bg-paper px-6 py-14">
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="inline-flex mb-10">
          <Image
            src="/logo-light.png"
            alt="Guacamaya"
            width={180}
            height={77}
            priority
            className="h-auto w-[150px]"
          />
        </Link>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-graphite/70 bg-lime/35 border border-lime/50 rounded-full px-3.5 py-1.5 mb-5">
              Suscripción mensual
            </p>
            <h1 className="text-[36px] sm:text-[44px] font-light leading-[1.05] tracking-tight mb-4">
              Tu club de miembros,
              <br />
              con tu propia marca.
            </h1>

            <div className="flex items-end gap-2 mb-6">
              <span className="text-[40px] font-light leading-none tabular-nums">
                $35.000
              </span>
              <span className="text-muted text-sm mb-1.5">COP / mes</span>
            </div>

            <ul className="flex flex-col gap-3 mb-8">
              {INCLUYE.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px]">
                  <span className="grid place-items-center h-[18px] w-[18px] rounded-full bg-lime text-graphite text-[10px] mt-0.5 shrink-0">
                    ✓
                  </span>
                  <span className="text-graphite/90">{item}</span>
                </li>
              ))}
            </ul>

            <p className="text-sm text-muted leading-relaxed max-w-md">
              Una vez confirmado tu pago, una persona de Guacamaya se
              comunicará contigo para acompañarte en la creación de tu club y
              darte acceso a la plataforma. Puedes desuscribirte cuando
              quieras desde tu panel.
            </p>
          </div>

          <Card className="w-full max-w-md lg:justify-self-end">
            <h2 className="text-xl font-medium mb-1">Crea tu club</h2>
            <p className="text-sm text-muted mb-6">
              Cuéntanos de tu negocio y paga el primer mes.
            </p>
            <SuscribirseForm />
          </Card>
        </div>
      </div>
    </main>
  )
}
