import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
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
          fontSize: 340,
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
