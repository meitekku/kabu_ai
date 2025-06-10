"use client"

import { AuthCheck } from '@/app/admin/auth/AuthCheck'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div>
            <AuthCheck />
            <main className="dashboard-content">
                {children}
            </main>
        </div>
    )
}