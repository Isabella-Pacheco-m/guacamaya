import QRCode from 'qrcode'

// QR como SVG inline. Server-side: el HTML llega completo al cliente, sin
// hidratar nada. Margen 0 porque la tarjeta ya tiene padding.
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 0,
    color: {
      dark: '#2A2320',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  })
}
