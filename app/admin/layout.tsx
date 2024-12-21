"use client"
import MenuNavigator from '@/components/layout/MenuNavigator';
import { usePathname } from 'next/navigation';

interface NavUrl {
    href: string;
    label: string;
}

const links: NavUrl[] = [
    { href: '/admin/accept_ai', label: '承認リスト' },
    { href: '/admin/post/new', label: '投稿ページ' },
];

// ナビゲーションを非表示にするパスのリスト
const hideNavigationPaths = [
    '/admin/login',
    '/admin/post/new',
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    
    // 現在のパスがhideNavigationPathsに含まれているかチェック
    const shouldShowNavigation = !hideNavigationPaths.includes(pathname);

    return (
        <div>
            {shouldShowNavigation && <MenuNavigator urls={links} />}
            <main className="dashboard-content">
                {children}
            </main>
        </div>
    )
}