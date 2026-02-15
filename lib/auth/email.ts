import { Resend } from "resend";
import { VerificationEmail } from "@/emails/VerificationEmail";
import { MagicLinkEmail } from "@/emails/MagicLinkEmail";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@example.com";
const FROM_NAME = "株AI";
const FROM_ADDRESS = `${FROM_NAME} <${FROM_EMAIL}>`;

export async function sendVerificationEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  try {
    const result = await getResend().emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "メールアドレスの確認 - 株AI",
      react: VerificationEmail({ verificationUrl: url }),
    });
    return result;
  } catch (error) {
    console.error("[Email] Failed to send verification email:", error);
    throw error;
  }
}

export async function sendMagicLinkEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  try {
    await getResend().emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "ログインリンク - 株AI",
      react: MagicLinkEmail({ magicLinkUrl: url }),
    });
  } catch (error) {
    console.error("Failed to send magic link email:", error);
    throw error;
  }
}

export async function sendPasswordResetEmail({
  email,
  url,
}: {
  email: string;
  url: string;
}) {
  try {
    await getResend().emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "パスワードリセット - 株AI",
      react: MagicLinkEmail({ magicLinkUrl: url }),
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    throw error;
  }
}
