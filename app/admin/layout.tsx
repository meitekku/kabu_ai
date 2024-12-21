import MenuNavigator from '@/components/layout/MenuNavigator';
interface NavUrl {
    href: string;
    label: string;
}

const links: NavUrl[] = [
    { href: '/admin/accept_ai', label: '承認リスト' },
    { href: '/admin/post/new', label: '投稿ページ' },
  ];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div>
            <MenuNavigator urls={links} />
            <main className="dashboard-content">
                {children}
            </main>
        </div>
    )
}