import { hexToRgbTriplet } from '@/lib/theme'

// Sobrescribe --color-electric con el color primario del tenant durante
// el render server-side. Sin flash de color: la variable está aplicada
// antes de que el cliente reciba HTML.
export function TenantTheme({ color }: { color: string }) {
  const triplet = hexToRgbTriplet(color)
  if (!triplet) return null
  const css = `:root{--color-electric:${triplet};}`
  return <style dangerouslySetInnerHTML={{ __html: css }} />
}
