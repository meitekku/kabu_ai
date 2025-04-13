import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { href: '/admin/comment', label: 'コメント管理' },
    { href: '/admin/news', label: 'ニュース管理' },
    { href: '/admin/settings', label: '設定' },
  ];

  return (
    <div className="w-64 h-screen bg-gray-50 border-r border-gray-200">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">管理メニュー</h2>
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'block px-4 py-2 rounded-md transition-colors',
                pathname === item.href
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar; 