import { redirect } from 'next/navigation'

// Esta sección se unificó en /comunidad (pestañas). La ruta se conserva para no
// romper enlaces compartidos, accesos guardados ni el caché del PWA.
export default function GaleriaRedirect() {
  redirect('/comunidad?tab=galeria')
}
