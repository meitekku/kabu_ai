import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { FC } from 'react'

export const AuthCheck: FC = async () => {
    const cookiesList = await cookies()
    const headersList = await headers()
    
    const username = cookiesList.get('username')?.value
    const pathname = headersList.get('x-invoke-path') || ''

    if (!username && !pathname.includes('/admin/login')) {
        redirect('/admin/login')
    }

    return null
} 