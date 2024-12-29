"use client"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div>
            <main className="dashboard-content">
                {children}
            </main>
        </div>
    )
}