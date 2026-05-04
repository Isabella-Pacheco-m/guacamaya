import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#1A1A1E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          fontSize: 120,
          fontWeight: 700,
          color: '#B8FA4E',
          letterSpacing: '-0.05em',
        }}
      >
        G
      </div>
    ),
    { ...size }
  )
}
