import type { Metadata } from "next";
import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";
import Link from "next/link";

const UPDATED_AT = "2026年3月15日";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "株AIにおける個人情報の取得・利用目的・第三者提供・安全管理措置などを定めるプライバシーポリシーです。",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="プライバシーポリシー"
      description="株AI（以下「当サイト」）は、ユーザーの個人情報を適切に取り扱い、法令に基づいて安全に管理します。"
      updatedAt={UPDATED_AT}
    >
      <LegalSection title="1. 取得する情報">
        <ul className="list-disc space-y-1 pl-4 sm:pl-5">
          <li>アカウント登録時に入力されたメールアドレス等の認証情報</li>
          <li>お問い合わせ時に提供される氏名、メールアドレス、問い合わせ内容</li>
          <li>アクセスログ、端末情報、ブラウザ情報、Cookie等の利用情報</li>
          <li>有料プラン利用時の決済関連情報（決済事業者が管理する情報を含む）</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. 利用目的">
        <ul className="list-disc space-y-1 pl-4 sm:pl-5">
          <li>当サイトの提供、運営、保守、改善のため</li>
          <li>本人確認、ログイン認証、セキュリティ確保のため</li>
          <li>有料プランの申込み、課金、契約管理、サポート対応のため</li>
          <li>不正利用防止、規約違反対応、障害調査のため</li>
          <li>利用状況分析および機能改善のため</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 第三者提供">
        <p>
          当サイトは、法令に基づく場合を除き、本人の同意なく個人情報を第三者へ提供しません。
        </p>
      </LegalSection>

      <LegalSection title="4. 外部サービスの利用">
        <p>当サイトでは、サービス運営上、以下の外部サービスを利用します。</p>
        <ul className="list-disc space-y-1 pl-4 sm:pl-5">
          <li>Google Analytics（アクセス解析）</li>
          <li>GMO fincode（決済処理）</li>
          <li>認証基盤・メール配信基盤等の運営上必要なサービス</li>
        </ul>
        <p>
          これらの事業者における情報取扱いは、各事業者のプライバシーポリシーに従います。
        </p>
      </LegalSection>

      <LegalSection title="5. Cookie等の利用">
        <p>
          当サイトは、ログイン状態の保持、利用状況分析、サービス改善を目的としてCookie等を使用します。ブラウザ設定によりCookieの無効化は可能ですが、一部機能が利用できなくなる場合があります。
        </p>
      </LegalSection>

      <LegalSection title="6. 安全管理措置">
        <p>
          当サイトは、個人情報への不正アクセス、漏えい、改ざん、滅失を防止するため、アクセス制御、権限管理、通信の暗号化等の合理的な安全管理措置を講じます。
        </p>
      </LegalSection>

      <LegalSection title="7. 開示・訂正・削除等の請求">
        <p>
          本人から、保有個人情報の開示、訂正、利用停止、削除等の請求があった場合は、法令に従い適切に対応します。請求方法はお問い合わせ窓口までご連絡ください。
        </p>
      </LegalSection>

      <LegalSection title="8. 改定">
        <p>
          本ポリシーは、法令改正やサービス内容変更に応じて改定することがあります。重要な変更がある場合は、当サイト上で告知します。
        </p>
      </LegalSection>

      <LegalSection title="9. お問い合わせ窓口">
        <p>
          本ポリシーに関するお問い合わせは、
          <Link className="text-emerald-700 underline" href="/contact">
            お問い合わせページ
          </Link>
          よりご連絡ください。
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
