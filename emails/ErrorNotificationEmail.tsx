import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ErrorNotificationEmailProps {
  errorMessage: string;
  errorContext: string;
  userId?: string;
  timestamp: string;
}

export function ErrorNotificationEmail({
  errorMessage,
  errorContext,
  userId,
  timestamp,
}: ErrorNotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>株AI - Agent Chatエラー通知</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>株AI</Text>
          </Section>

          <Section style={content}>
            <Text style={title}>Agent Chat エラー通知</Text>

            <Text style={label}>発生日時</Text>
            <Text style={value}>{timestamp}</Text>

            <Text style={label}>エラー箇所</Text>
            <Text style={value}>{errorContext}</Text>

            <Text style={label}>エラー内容</Text>
            <Text style={errorBox}>{errorMessage}</Text>

            {userId && (
              <>
                <Text style={label}>ユーザーID</Text>
                <Text style={value}>{userId}</Text>
              </>
            )}

            <Hr style={hr} />

            <Text style={smallText}>
              この通知は株AIのAgent Chatでエラーが発生した際に自動送信されています。
            </Text>
          </Section>

          <Section style={footer}>
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
  backgroundColor: "#dc2626",
  padding: "24px 40px",
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
  padding: "32px 40px",
};

const title = {
  color: "#1e293b",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 24px",
};

const label = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "16px 0 4px",
};

const value = {
  color: "#1e293b",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 8px",
};

const errorBox = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "6px",
  color: "#991b1b",
  fontSize: "13px",
  lineHeight: "20px",
  padding: "12px 16px",
  margin: "0 0 8px",
  whiteSpace: "pre-wrap" as const,
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const smallText = {
  color: "#94a3b8",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0",
};

const footer = {
  backgroundColor: "#f8fafc",
  padding: "16px 40px",
};

const copyright = {
  color: "#cbd5e1",
  fontSize: "11px",
  textAlign: "center" as const,
  margin: "0",
};
