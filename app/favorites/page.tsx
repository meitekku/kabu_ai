import { ProtectedRoute } from '@/components/auth';
import FavoritesPageClient from './FavoritesPageClient';

export const metadata = {
  title: 'お気に入り銘柄 | 株AI',
  description: 'お気に入り銘柄のパーソナルAIニュースレポート',
};

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesPageClient />
    </ProtectedRoute>
  );
}
