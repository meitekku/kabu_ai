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
        <footer>
            {/* メインフッター — グレー背景 */}
            <div className="border-t border-[#d9d9d9] bg-white dark:border-[#333] dark:bg-[#2a2a2a]">
                <div className="max-w-[1280px] mx-auto px-4 py-6">
                    <nav className="grid grid-cols-2 gap-x-3 gap-y-1 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-1">
                        {FOOTER_LINKS.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="py-1.5 text-sm text-[#686868] transition-colors hover:text-[#cc0000] dark:text-[#aaa] dark:hover:text-[#ff4444]"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </div>

            {/* 免責事項エリア */}
            <div className="border-t border-[#e5e5e5] bg-[#f0f0f0] dark:border-[#333] dark:bg-[#222]">
                <div className="max-w-[1280px] mx-auto px-4 py-3">
                    <p className="text-[10px] text-[#999] leading-relaxed">
                        ※当サイトの情報は投資の勧誘を目的としたものではありません。投資に関する最終決定はご自身の判断で行ってください。
                    </p>
                </div>
            </div>

            {/* ボトムフッター — ダーク背景 */}
            <div className="border-t border-[#d9d9d9] bg-[#1a1a1a] dark:border-[#333]">
                <div className="max-w-[1280px] mx-auto px-4 py-3 flex flex-col items-center gap-1 sm:flex-row sm:justify-between">
                    <span className="text-xs font-semibold tracking-wide text-[#ccc]">
                        株AI
                    </span>
                    <p className="text-xs text-[#999]">
                        © {new Date().getFullYear()} 株AI. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
