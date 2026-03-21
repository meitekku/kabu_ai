export default function DefaultTemplate({
  children,
  variant = 'plain',
}: {
  children: React.ReactNode
  variant?: 'card' | 'plain'
}) {
  if (variant === 'plain') {
    return (
      <div className="mx-auto">
        {children}
      </div>
    )
  }

  return (
    <div className="mx-auto bg-white dark:bg-[#1a1a1a] rounded shadow-sm border border-[#e5e5e5] dark:border-[#2a2a2a] p-6">
      {children}
    </div>
  )
}