import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface MagicLinkEmailProps {
  magicLinkUrl: string;
}

export function MagicLinkEmail({ magicLinkUrl }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>株AI - ログインリンク</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* ヘッダー */}
          <Section style={header}>
            <Text style={logo}>株AI</Text>
          </Section>

          {/* メインコンテンツ */}
          <Section style={content}>
            <Text style={greeting}>ログインリクエスト</Text>

            <Text style={paragraph}>
              株AIへのログインリクエストを受け付けました。
            </Text>

            <Text style={paragraph}>
              以下のボタンをクリックしてログインしてください。
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={magicLinkUrl}>
                ログインする
              </Button>
            </Section>

            <Text style={expireText}>
              このリンクは15分間有効です
            </Text>

            <Hr style={hr} />

            <Text style={smallText}>
              ボタンが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください：
            </Text>
            <Link href={magicLinkUrl} style={link}>
              {magicLinkUrl}
            </Link>
          </Section>

          {/* フッター */}
          <Section style={footer}>
            <Text style={footerText}>
              このメールは株AIから自動送信されています。
            </Text>
            <Text style={footerText}>
              心当たりがない場合は、このメールを無視してください。
            </Text>
            <Text style={footerText}>
              ログインを試みていない場合、アカウントのセキュリティをご確認ください。
            </Text>
            <Hr style={footerHr} />
            <Text style={copyright}>
              © {new Date().getFullYear()} 株AI. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans JP", sans-serif',
  padding: "40px 0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "560px",
  borderRadius: "12px",
  overflow: "hidden" as const,
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

const header = {
  backgroundColor: "#1e40af",
  padding: "32px 40px",
  textAlign: "center" as const,
};

const logo = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
  letterSpacing: "1px",
};

const content = {
  padding: "40px",
};

const greeting = {
  color: "#1e293b",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  color: "#475569",
  fontSize: "15px",
  lineHeight: "26px",
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.3)",
};

const expireText = {
  color: "#94a3b8",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0",
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "32px 0",
};

const smallText = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const link = {
  color: "#2563eb",
  fontSize: "12px",
  textDecoration: "underline",
  wordBreak: "break-all" as const,
  display: "block",
  textAlign: "center" as const,
};

const footer = {
  backgroundColor: "#f8fafc",
  padding: "24px 40px",
};

const footerText = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "18px",
  textAlign: "center" as const,
  margin: "0 0 4px",
};

const footerHr = {
  borderColor: "#e2e8f0",
  margin: "16px 0",
};

const copyright = {
  color: "#cbd5e1",
  fontSize: "11px",
  textAlign: "center" as const,
  margin: "0",
};
