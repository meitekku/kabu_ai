import type { Metadata } from "next";
import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";

const UPDATED_AT = "2026年2月17日";

export const metadata: Metadata = {
  title: "免責事項",
  description:
    "株AIで提供する情報の利用に関する免責事項および投資判断に関する注意事項です。",
};

export default function DisclaimerPage() {
  return (
    <LegalPageLayout
      title="免責事項"
      description="本サービスをご利用いただく前に、以下の事項をご確認ください。"
      updatedAt={UPDATED_AT}
    >
      <LegalSection title="1. 情報提供の目的">
        <p>
          当サイトで提供する情報、分析、予測、コメント等は、一般的な情報提供を目的とするものであり、特定の金融商品に対する投資勧誘、売買推奨、助言を目的としたものではありません。
        </p>
      </LegalSection>

      <LegalSection title="2. 投資判断について">
        <p>
          投資には価格変動等のリスクが伴い、元本割れが生じる可能性があります。最終的な投資判断は、ユーザーご自身の責任と判断で行ってください。
        </p>
      </LegalSection>

      <LegalSection title="3. 正確性・完全性・最新性">
        <p>
          当サイトは、掲載情報の正確性、完全性、最新性、有用性を保証しません。外部データ提供元の事情により、情報遅延や誤差が発生する場合があります。
        </p>
      </LegalSection>

      <LegalSection title="4. 損害に関する責任">
        <p>
          当サイトの利用または利用不能により生じた直接・間接の損害について、当サイト運営者は、故意または重過失がある場合を除き責任を負いません。
        </p>
      </LegalSection>

      <LegalSection title="5. 外部リンク・第三者サービス">
        <p>
          当サイトからリンクされた外部サイトや第三者サービスの内容、安全性、可用性について、当サイトは責任を負いません。利用条件は各サービスの規定に従ってください。
        </p>
      </LegalSection>

      <LegalSection title="6. 内容変更">
        <p>
          当サイトは、事前の予告なく掲載内容やサービス内容を変更・中止することがあります。
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
