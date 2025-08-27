import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          backgroundColor: '#374151', // Using a solid color instead of CSS variable
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif', // Using system fonts
            lineHeight: 1,
            fontSize: 18,
            fontWeight: 700,
            color: '#ffffff',
            display: 'flex',
            transform: 'rotate(45deg)',
          }}
        >
          IF
        </span>
      </div>
    ),
    {
      ...size,
    }
  )
}
