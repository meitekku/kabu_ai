"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const ClientAuthCheck = () => {
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch('/api/auth', {
                    method: 'GET',
                    credentials: 'include'
                })
                const data = await response.json()
                
                if (!data.isAuthenticated) {
                    router.push('/admin/login')
                }
            } catch (error) {
                console.error('Authentication check failed:', error)
                router.push('/admin/login')
            }
        }

        checkAuth()
    }, [router])

    return null
} 