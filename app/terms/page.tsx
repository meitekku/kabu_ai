import type { Metadata } from "next";
import LegalPageLayout, { LegalSection } from "@/components/legal/LegalPageLayout";

const UPDATED_AT = "2026年2月17日";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "株AIの利用条件、禁止事項、料金、免責、サービス変更等に関する利用規約です。",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="利用規約"
      description="本規約は、株AIが提供する各種サービスの利用条件を定めるものです。"
      updatedAt={UPDATED_AT}
    >
      <LegalSection title="第1条（適用）">
        <p>
          本規約は、ユーザーと当サイト運営者との間の本サービス利用に関わる一切の関係に適用されます。
        </p>
      </LegalSection>

      <LegalSection title="第2条（アカウント）">
        <p>
          ユーザーは、登録情報を正確かつ最新の内容に保つものとし、自己の責任でアカウントを管理するものとします。
        </p>
      </LegalSection>

      <LegalSection title="第3条（禁止事項）">
        <ul className="list-disc space-y-1 pl-5">
          <li>法令または公序良俗に違反する行為</li>
          <li>不正アクセス、脆弱性探索、サービス妨害行為</li>
          <li>虚偽情報の登録、なりすまし、第三者への迷惑行為</li>
          <li>当サイトの知的財産権を侵害する行為</li>
          <li>その他、運営が不適切と判断する行為</li>
        </ul>
      </LegalSection>

      <LegalSection title="第4条（有料プラン）">
        <p>
          有料プランの料金、課金周期、提供内容は、申込み時に表示される内容に従います。課金は決済事業者を通じて処理されます。
        </p>
      </LegalSection>

      <LegalSection title="第5条（解約・返金）">
        <p>
          サブスクリプションの解約は、所定の管理画面または決済事業者が提供する手続きにより行えます。法令上必要な場合を除き、支払済み料金の返金は行いません。
        </p>
      </LegalSection>

      <LegalSection title="第6条（サービスの変更・中断・終了）">
        <p>
          当サイトは、保守、障害対応、運営上の理由により、事前通知のうえまたは緊急時には通知なく、サービスの全部または一部を変更・中断・終了できるものとします。
        </p>
      </LegalSection>

      <LegalSection title="第7条（知的財産権）">
        <p>
          本サービスに関する文章、画像、プログラム、デザイン等の権利は、当サイトまたは正当な権利者に帰属します。許可なく複製、転載、再配布することを禁止します。
        </p>
      </LegalSection>

      <LegalSection title="第8条（投資判断に関する注意）">
        <p>
          本サービスで提供する情報は情報提供を目的としたものであり、特定銘柄の売買推奨、投資助言、将来成果の保証を行うものではありません。最終的な投資判断はユーザー自身の責任で行ってください。
        </p>
      </LegalSection>

      <LegalSection title="第9条（免責）">
        <p>
          当サイトは、本サービスの正確性・完全性・有用性・継続性について保証しません。本サービスの利用または利用不能により生じた損害について、当サイトの故意または重過失がある場合を除き責任を負いません。
        </p>
      </LegalSection>

      <LegalSection title="第10条（規約変更）">
        <p>
          当サイトは、必要に応じて本規約を変更できます。変更後の規約は、当サイトに掲示した時点または別途定める発効時点で効力を生じます。
        </p>
      </LegalSection>

      <LegalSection title="第11条（準拠法・管轄）">
        <p>
          本規約は日本法に準拠し、本サービスに関して紛争が生じた場合は、運営者所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
