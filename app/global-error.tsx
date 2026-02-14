'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="ja">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          padding: '1rem',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            エラーが発生しました
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem', textAlign: 'center' }}>
            ページの読み込み中に問題が発生しました。
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  )
}
