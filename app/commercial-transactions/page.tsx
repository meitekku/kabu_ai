import type { Metadata } from "next";
import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";

const UPDATED_AT = "2026年3月15日";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description:
    "株AIの有料プラン提供に関する特定商取引法に基づく表記です。",
};

const rows = [
  { label: "販売事業者", value: "株AI 運営事務局" },
  { label: "運営統括責任者", value: "株AI 運営責任者" },
  {
    label: "所在地",
    value: "請求があった場合、遅滞なく開示いたします。",
  },
  {
    label: "電話番号",
    value: "請求があった場合、遅滞なく開示いたします。",
  },
  { label: "お問い合わせ先", value: "smartaiinvest@gmail.com" },
  {
    label: "販売価格",
    value: "各プラン申込画面に税込価格を表示（例: スタンダードプラン 月額3,000円、エージェントプラン 月額1,000円）。",
  },
  {
    label: "商品代金以外の必要料金",
    value:
      "インターネット接続料金、通信料金等はお客様負担です。決済に伴う手数料が発生する場合は、決済事業者の規定に従います。",
  },
  { label: "支払方法", value: "クレジットカード（GMO fincode による決済）。" },
  {
    label: "支払時期",
    value:
      "初回申込時および以後各契約更新日に自動課金されます。詳細は決済時に表示される条件に従います。",
  },
  {
    label: "役務の提供時期",
    value: "決済完了後、直ちに有料機能をご利用いただけます。",
  },
  {
    label: "解約方法",
    value:
      "アカウントの請求・プラン管理ページから解約手続きが可能です。解約後は次回以降の自動課金を停止し、有料機能は利用できなくなります。",
  },
  {
    label: "返品・交換・キャンセル",
    value:
      "デジタルサービスの性質上、提供開始後の返品・返金は原則としてお受けしていません。法令に基づく場合はこの限りではありません。",
  },
] as const;

export default function CommercialTransactionsPage() {
  return (
    <LegalPageLayout
      title="特定商取引法に基づく表記"
      description="当サイトの有料サブスクリプション提供に関する法定表示です。"
      updatedAt={UPDATED_AT}
    >
      <LegalSection title="事業者情報">
        <div className="overflow-x-auto">
          <dl className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-1 px-3 py-3 sm:gap-2 sm:px-4 sm:py-4 sm:grid-cols-[180px_1fr]">
                <dt className="text-sm font-semibold text-slate-900">{row.label}</dt>
                <dd className="text-sm leading-7 text-slate-700">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </LegalSection>

      <LegalSection title="補足">
        <p>
          表示内容は、法令改正やサービス内容変更に応じて改定される場合があります。最新情報は本ページをご確認ください。
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
