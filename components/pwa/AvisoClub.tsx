'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'

// Último aviso del negocio, dentro de la app.
//
// Las notificaciones del sistema dependen de que el celular las deje pasar
// (permisos, ahorro de batería, fabricante). Este aviso no: si el miembro
// abre la app, lo ve. Es la red de seguridad del push, no su reemplazo — por
// eso muestra solo el más reciente y se descarta con un toque.

const VISTO_KEY = 'aviso-club-visto'

/** Después de esto ya no es novedad y deja de mostrarse. */
const VIGENCIA_DIAS = 7

const fechaFmt = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  timeZone: 'America/Bogota',
})

export interface AvisoData {
  id: string
  titulo: string
  cuerpo: string
  url: string | null
  created_at: string
}

export function AvisoClub({ aviso }: { aviso: AvisoData }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const enviado = new Date(aviso.created_at).getTime()
    if (Date.now() - enviado > VIGENCIA_DIAS * 86_400_000) return
    if (localStorage.getItem(VISTO_KEY) === aviso.id) return
    setVisible(true)
  }, [aviso.id, aviso.created_at])

  function descartar() {
    localStorage.setItem(VISTO_KEY, aviso.id)
    setVisible(false)
  }

  if (!visible) return null

  const contenido = (
    <>
      <p className="eyebrow text-electric mb-2">Aviso del club</p>
      <p className="font-medium leading-snug">{aviso.titulo}</p>
      <p className="text-sm text-muted mt-1 leading-relaxed">{aviso.cuerpo}</p>
      <p className="text-xs text-muted mt-3">
        {fechaFmt.format(new Date(aviso.created_at))}
      </p>
    </>
  )

  return (
    <Card>
      {aviso.url ? (
        <a href={aviso.url} className="block" onClick={descartar}>
          {contenido}
        </a>
      ) : (
        contenido
      )}
      <button
        type="button"
        onClick={descartar}
        className="mt-3 text-xs text-muted hover:text-graphite"
      >
        Entendido
      </button>
    </Card>
  )
}
