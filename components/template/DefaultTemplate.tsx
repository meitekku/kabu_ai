export default function DefaultTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto">
      {children}
    </div>
  )
}