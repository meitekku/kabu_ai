import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth-client
const mockSignInEmail = vi.fn();
const mockSignInSocial = vi.fn();
vi.mock("@/lib/auth/auth-client", () => ({
  signIn: {
    email: (...args: unknown[]) => mockSignInEmail(...args),
    social: (...args: unknown[]) => mockSignInSocial(...args),
  },
}));

// Mock next/navigation (override global setup for useSearchParams)
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: mockRefresh,
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/login",
}));

import LoginPage from "@/app/login/page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location for the useEffect that checks hostname
    Object.defineProperty(window, "location", {
      value: { hostname: "localhost" },
      writable: true,
    });
  });

  it("renders login heading and form fields", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("heading", { name: "ログイン" })
    ).toBeInTheDocument();
    expect(screen.getByText("アカウントにログイン")).toBeInTheDocument();
    expect(screen.getByLabelText("メールアドレス")).toBeInTheDocument();
    expect(screen.getByLabelText("パスワード")).toBeInTheDocument();
  });

  it("renders email and password inputs with correct types", () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");

    expect(emailInput).toHaveAttribute("type", "email");
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("renders submit button with correct text", () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole("button", { name: "ログイン" });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute("type", "submit");
  });

  it("renders social login buttons", () => {
    render(<LoginPage />);

    expect(
      screen.getByRole("button", { name: /Google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Twitter/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Facebook/i })
    ).toBeInTheDocument();
  });

  it("renders separator text", () => {
    render(<LoginPage />);

    expect(screen.getByText("または")).toBeInTheDocument();
  });

  it("updates email and password fields on user input", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("メールアドレス");
    const passwordInput = screen.getByLabelText("パスワード");

    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");

    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  it("calls signIn.email on form submission and redirects on success", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockResolvedValue({ data: { user: {} } });

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "user@test.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(mockSignInEmail).toHaveBeenCalledWith({
        email: "user@test.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });

  it("redirects admin email to /admin/comment", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockResolvedValue({ data: { user: {} } });

    render(<LoginPage />);

    await user.type(
      screen.getByLabelText("メールアドレス"),
      "smartaiinvest@gmail.com"
    );
    await user.type(screen.getByLabelText("パスワード"), "adminpass1");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/comment");
    });
  });

  it("displays error message when signIn returns error", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockResolvedValue({
      error: { message: "メールまたはパスワードが間違っています" },
    });

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "bad@test.com");
    await user.type(screen.getByLabelText("パスワード"), "wrongpass1");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(
        screen.getByText("メールまたはパスワードが間違っています")
      ).toBeInTheDocument();
    });
  });

  it("displays fallback error when signIn returns error without message", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockResolvedValue({ error: {} });

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "bad@test.com");
    await user.type(screen.getByLabelText("パスワード"), "wrongpass1");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(
        screen.getByText("ログインに失敗しました")
      ).toBeInTheDocument();
    });
  });

  it("displays generic error when signIn throws exception", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockRejectedValue(new Error("Network error"));

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "bad@test.com");
    await user.type(screen.getByLabelText("パスワード"), "wrongpass1");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => {
      expect(
        screen.getByText("エラーが発生しました。もう一度お試しください。")
      ).toBeInTheDocument();
    });
  });

  it("shows loading state during form submission", async () => {
    const user = userEvent.setup();
    // Make signIn hang to observe loading state
    mockSignInEmail.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 500))
    );

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "user@test.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    // While loading, button should say "処理中..."
    expect(screen.getByText("処理中...")).toBeInTheDocument();
  });

  it("disables buttons during loading", async () => {
    const user = userEvent.setup();
    mockSignInEmail.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: {} }), 500))
    );

    render(<LoginPage />);

    await user.type(screen.getByLabelText("メールアドレス"), "user@test.com");
    await user.type(screen.getByLabelText("パスワード"), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    // All buttons should be disabled during loading
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("calls signIn.social with google provider", async () => {
    const user = userEvent.setup();
    mockSignInSocial.mockResolvedValue({});

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /Google/i }));

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: "google",
        callbackURL: "/",
      });
    });
  });

  it("calls signIn.social with twitter provider", async () => {
    const user = userEvent.setup();
    mockSignInSocial.mockResolvedValue({});

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /Twitter/i }));

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: "twitter",
        callbackURL: "/",
      });
    });
  });

  it("calls signIn.social with facebook provider", async () => {
    const user = userEvent.setup();
    mockSignInSocial.mockResolvedValue({});

    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /Facebook/i }));

    await waitFor(() => {
      expect(mockSignInSocial).toHaveBeenCalledWith({
        provider: "facebook",
        callbackURL: "/",
      });
    });
  });

  it("shows signup link on localhost", async () => {
    render(<LoginPage />);

    await waitFor(() => {
      expect(
        screen.getByText("アカウントをお持ちでない方はこちら")
      ).toBeInTheDocument();
    });
  });

  it("signup link points to /signup?test=1", async () => {
    render(<LoginPage />);

    await waitFor(() => {
      const link = screen.getByText("アカウントをお持ちでない方はこちら");
      expect(link).toHaveAttribute("href", "/signup?test=1");
    });
  });
});
