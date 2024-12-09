import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { headers } from 'next/headers';

async function checkAuth() {
  try {
    const headersList = await headers();
    const cookieStore = await cookies();
    const host = headersList.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    
    const url = `${protocol}://${host}/api/auth`;
    
    const res = await fetch(url, {
      headers: {
        Cookie: cookieStore.toString(),
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    console.error('Auth check error:', error);
    return { isAuthenticated: false };
  }
}

export default async function LoginPage() {
  const auth = await checkAuth();
  
  if (auth.isAuthenticated) {
    redirect('/admin/accept_ai');
  }
  
  return <LoginForm />;
}