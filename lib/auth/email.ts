import { Resend } from "resend";
import { VerificationEmail } from "@/emails/VerificationEmail";
import { MagicLinkEmail } from "@/emails/MagicLinkEmail";

console.log("[Email] RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
console.log("[Email] FROM_EMAIL:", process.env.FROM_EMAIL);

const resend = new Resend(process.env.RESEND_API_KEY);

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
  console.log("[Email] sendVerificationEmail called");
  console.log("[Email] To:", email);
  console.log("[Email] From:", FROM_EMAIL);
  console.log("[Email] URL:", url);

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      subject: "メールアドレスの確認 - 株AI",
      react: VerificationEmail({ verificationUrl: url }),
    });
    console.log("[Email] Resend result:", result);
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
    await resend.emails.send({
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
    await resend.emails.send({
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
