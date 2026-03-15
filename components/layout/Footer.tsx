import Link from 'next/link'

const FOOTER_LINKS = [
    { href: '/privacy-policy', label: 'プライバシーポリシー' },
    { href: '/terms', label: '利用規約' },
    { href: '/commercial-transactions', label: '特定商取引法に基づく表記' },
    { href: '/disclaimer', label: '免責事項' },
    { href: '/contact', label: 'お問い合わせ' },
] as const

const Footer = ({ isDark: _isDark }: { isDark?: boolean }) => {
    return (
        <footer className="border-t bg-muted border-border">
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 text-center">
                <nav className="mb-5 flex flex-col sm:flex-row flex-wrap justify-center items-center gap-x-1 gap-y-1">
                    {FOOTER_LINKS.map((link, index) => (
                        <div key={link.href} className="flex items-center">
                            <Link
                                href={link.href}
                                className="min-h-[44px] flex items-center px-3 transition-colors text-[13px] text-muted-foreground hover:text-foreground"
                            >
                                {link.label}
                            </Link>
                            {index < FOOTER_LINKS.length - 1 && (
                                <span className="hidden sm:inline text-muted-foreground">·</span>
                            )}
                        </div>
                    ))}
                </nav>
                <p className="text-[12px] text-muted-foreground">
                    © {new Date().getFullYear()} 株AI. All rights reserved.
                </p>
            </div>
        </footer>
    )
}

export default Footer
