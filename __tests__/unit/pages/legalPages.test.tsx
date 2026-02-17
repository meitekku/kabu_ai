import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage from "@/app/terms/page";
import PrivacyPolicyPage from "@/app/privacy-policy/page";
import ContactPage from "@/app/contact/page";
import DisclaimerPage from "@/app/disclaimer/page";
import CommercialTransactionsPage from "@/app/commercial-transactions/page";
import SuccessPage from "@/app/premium/success/page";

describe("legal/static pages", () => {
  it("renders terms page heading", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { name: "利用規約" })).toBeInTheDocument();
  });

  it("renders privacy policy and contact link", () => {
    render(<PrivacyPolicyPage />);
    expect(
      screen.getByRole("heading", { name: "プライバシーポリシー" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "お問い合わせページ" })).toHaveAttribute(
      "href",
      "/contact"
    );
  });

  it("renders contact email link", () => {
    render(<ContactPage />);
    expect(screen.getByRole("heading", { name: "お問い合わせ" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "smartaiinvest@gmail.com" })
    ).toHaveAttribute("href", "mailto:smartaiinvest@gmail.com");
  });

  it("renders disclaimer page heading", () => {
    render(<DisclaimerPage />);
    expect(screen.getByRole("heading", { name: "免責事項" })).toBeInTheDocument();
  });

  it("renders commercial transactions page heading", () => {
    render(<CommercialTransactionsPage />);
    expect(
      screen.getByRole("heading", { name: "特定商取引法に基づく表記" })
    ).toBeInTheDocument();
  });

  it("renders premium success page", () => {
    render(<SuccessPage />);
    expect(
      screen.getByRole("heading", { name: "ありがとうございます！" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ダッシュボードへ移動" })
    ).toBeInTheDocument();
  });
});
