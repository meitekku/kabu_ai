import type { Metadata } from "next";
import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";

const UPDATED_AT = "2026年2月17日";
const CONTACT_EMAIL = "smartaiinvest@gmail.com";

export const metadata: Metadata = {
  title: "お問い合わせ",
  description:
    "株AIへのお問い合わせ窓口です。サービス、アカウント、課金、法務関連のお問い合わせを受け付けています。",
};

export default function ContactPage() {
  return (
    <LegalPageLayout
      title="お問い合わせ"
      description="サービスに関するお問い合わせは、以下の窓口までご連絡ください。"
      updatedAt={UPDATED_AT}
    >
      <LegalSection title="お問い合わせ窓口">
        <p>
          メールアドレス:{" "}
          <a className="text-emerald-700 underline" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
        <p className="text-slate-600">
          原則として3営業日以内を目安に返信します。内容により、回答まで時間をいただく場合があります。
        </p>
      </LegalSection>

      <LegalSection title="お問い合わせ時のお願い">
        <ul className="list-disc space-y-1 pl-5">
          <li>ご利用中のメールアドレスまたはアカウント情報</li>
          <li>発生している事象の内容、日時、対象ページ</li>
          <li>課金関連の場合は決済日時やプラン種別</li>
        </ul>
        <p>
          調査に必要な情報が不足している場合、追加確認をお願いすることがあります。
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
