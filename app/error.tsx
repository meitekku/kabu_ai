'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Client error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
      <h2 className="text-xl font-bold mb-4">エラーが発生しました</h2>
      <p className="text-gray-600 mb-6 text-center">
        ページの読み込み中に問題が発生しました。
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        再試行
      </button>
    </div>
  )
}
