import { ImageResponse } from 'next/og'

export const alt = 'LifeCheck AI'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#18181B',
          color: '#F5F5F5',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <svg 
            width="120" 
            height="120" 
            viewBox="0 0 48 48" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M 19 9 L 4 24 L 24 44 L 44 24 L 29 9" 
              transform="rotate(8 24 24)" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M -2 24 L 14 24 L 19 12 L 29 36 L 34 24 L 50 24" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
          <div style={{ fontSize: 96, fontWeight: 'bold', display: 'flex' }}>
            <span>LifeCheck </span>
            <span style={{ color: '#F5F5F5', opacity: 0.8, marginLeft: '24px' }}>AI</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
