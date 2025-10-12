"use client"

import { usePathname } from 'next/navigation'
import { ClientAuthCheck } from '@/app/admin/auth/ClientAuthCheck'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const isLoginPage = pathname === '/admin/login'

    return (
        <div>
            {!isLoginPage && <ClientAuthCheck />}
            <main className="dashboard-content">
                {children}
            </main>
        </div>
    )
}