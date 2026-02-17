import Link from 'next/link'

const FOOTER_LINKS = [
    { href: '/privacy-policy', label: 'プライバシーポリシー' },
    { href: '/terms', label: '利用規約' },
    { href: '/commercial-transactions', label: '特定商取引法に基づく表記' },
    { href: '/disclaimer', label: '免責事項' },
    { href: '/contact', label: 'お問い合わせ' },
] as const

const Footer = ({ isDark }: { isDark?: boolean }) => {
    return (
        <footer className={`${isDark ? 'bg-[#0a0a0f] border-t border-slate-800' : 'bg-gray-800'} text-white p-4`}>
            <div className="max-w-7xl mx-auto text-center text-sm">
                <nav className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
                    {FOOTER_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-300 hover:text-white'}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <p className={`${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    © {new Date().getFullYear()} 株AI. All rights reserved.
                </p>
            </div>
        </footer>
    )
}

export default Footer
