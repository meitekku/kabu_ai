import Link from "next/link";
import DefaultTemplate from "@/components/template/DefaultTemplate";

const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "プライバシーポリシー" },
  { href: "/terms", label: "利用規約" },
  { href: "/commercial-transactions", label: "特定商取引法に基づく表記" },
  { href: "/disclaimer", label: "免責事項" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

interface LegalPageLayoutProps {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 sm:space-y-3">
      <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
      <div className="space-y-2 text-sm leading-7 text-slate-700 sm:space-y-3 sm:text-base">
        {children}
      </div>
    </section>
  );
}

export default function LegalPageLayout({
  title,
  description,
  updatedAt,
  children,
}: LegalPageLayoutProps) {
  return (
    <DefaultTemplate>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-14">
        <header className="mb-6 space-y-2 border-b border-slate-200 pb-5 sm:mb-8 sm:space-y-3 sm:pb-6">
          <p className="text-xs font-semibold tracking-wider text-emerald-700">
            株AI ポリシー
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
          <p className="text-sm leading-7 text-slate-600 sm:text-base">{description}</p>
          <p className="text-xs text-slate-500">最終更新日: {updatedAt}</p>
        </header>

        <div className="space-y-6 sm:space-y-8">{children}</div>

        <div className="mt-10 border-t border-slate-200 pt-5 sm:mt-12 sm:pt-6">
          <p className="mb-3 text-sm font-medium text-slate-700">関連ページ</p>
          <div className="flex flex-wrap gap-2">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-emerald-600 hover:text-emerald-700 sm:py-1 sm:text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DefaultTemplate>
  );
}
