'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

// Invitación a instalar la PWA (solo tiene sentido en el celular — el padre
// la esconde en desktop). No aparece si ya está instalada o si se descartó
// hace poco. En Android/Chrome usa el prompt nativo (beforeinstallprompt);
// donde no existe (iPhone), explica el gesto de "Añadir a pantalla de inicio"
// — allí es requisito para poder recibir notificaciones (iOS 16.4+).

const DISMISS_KEY = 'install-prompt-dismissed-at'
const DISMISS_DIAS = 30

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt({ nombre }: { nombre: string }) {
  const [visible, setVisible] = useState(false)
  const [instalador, setInstalador] = useState<BeforeInstallPromptEvent | null>(
    null
  )
  const [esIos, setEsIos] = useState(false)

  useEffect(() => {
    // Ya instalada: nada que invitar.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true
    if (standalone) return

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (Date.now() - dismissedAt < DISMISS_DIAS * 86_400_000) return

    setEsIos(/iPad|iPhone|iPod/.test(navigator.userAgent))
    setVisible(true)

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setInstalador(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function instalar() {
    if (!instalador) return
    await instalador.prompt()
    const { outcome } = await instalador.userChoice
    if (outcome === 'accepted') setVisible(false)
    setInstalador(null)
  }

  function ahoraNo() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <Card className="mb-5">
      <p className="eyebrow text-electric mb-2">Llévanos contigo</p>
      <p className="text-sm text-graphite mb-1">
        Instala la app de {nombre} en tu celular y recibe las notificaciones
        de promos y novedades del club.
      </p>
      {instalador ? (
        <div className="mt-4 flex items-center gap-4">
          <Button variant="secondary" onClick={instalar}>
            Instalar la app
          </Button>
          <button
            type="button"
            onClick={ahoraNo}
            className="text-xs text-muted hover:text-graphite"
          >
            Ahora no
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-xs text-muted leading-relaxed">
            {esIos ? (
              <>
                En iPhone: toca <span className="font-medium">Compartir</span>{' '}
                y elige{' '}
                <span className="font-medium">
                  Añadir a pantalla de inicio
                </span>
                .
              </>
            ) : (
              <>
                En el menú de tu navegador elige{' '}
                <span className="font-medium">
                  Añadir a pantalla de inicio
                </span>
                .
              </>
            )}
          </p>
          <button
            type="button"
            onClick={ahoraNo}
            className="mt-3 text-xs text-muted hover:text-graphite"
          >
            Ahora no
          </button>
        </div>
      )}
    </Card>
  )
}
