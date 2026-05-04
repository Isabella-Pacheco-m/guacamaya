import QRCode from 'qrcode'

// QR como SVG inline. Server-side: el HTML llega completo al cliente, sin
// hidratar nada. Margen 0 porque la tarjeta ya tiene padding.
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 0,
    color: {
      dark: '#1A1A1E',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  })
}
