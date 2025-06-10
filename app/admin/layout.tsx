"use client"

import { ClientAuthCheck } from '@/app/admin/auth/ClientAuthCheck'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div>
            <ClientAuthCheck />
            <main className="dashboard-content">
                {children}
            </main>
        </div>
    )
}