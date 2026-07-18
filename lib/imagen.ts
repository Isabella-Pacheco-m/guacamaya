// Solo servidor (opera sobre Buffer). Validación de contenido real de las
// imágenes subidas: el MIME type que manda el navegador es declarativo —
// cualquier archivo puede llegar con Content-Type: image/png. Los buckets son
// públicos, así que lo que se sube queda servido tal cual; verificar los
// magic bytes garantiza que lo almacenado ES una imagen del formato declarado.
import 'server-only'

// Formatos aceptados en toda la app (logo, banner, galería, evidencias...).
// SVG queda excluido a propósito: puede llevar <script>.
const FIRMAS: Record<string, (b: Buffer) => boolean> = {
  'image/png': (b) =>
    b.length > 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  'image/jpeg': (b) =>
    b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  // RIFF <size:4> WEBP
  'image/webp': (b) =>
    b.length > 12 &&
    b.toString('latin1', 0, 4) === 'RIFF' &&
    b.toString('latin1', 8, 12) === 'WEBP',
}

/**
 * true si el buffer empieza con la firma binaria del MIME declarado.
 * MIME no soportado → false (fail-closed).
 */
export function esImagenValida(buf: Buffer, mime: string): boolean {
  const check = FIRMAS[mime]
  return check ? check(buf) : false
}
