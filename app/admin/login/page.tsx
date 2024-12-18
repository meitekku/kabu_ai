import { redirect } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { checkAuth } from '@/utils/validation/Auth';

export default async function LoginPage() {
  const auth = await checkAuth();
  
  if (auth.isAuthenticated) {
    redirect('/admin/accept_ai');
  }
  
  return <LoginForm />;
}