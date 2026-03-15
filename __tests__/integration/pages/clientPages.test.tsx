import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRouterPush = vi.fn();
const mockUseParams = vi.fn(() => ({ code: "7203" }));
const mockUseSearchParams = vi.fn(() => new URLSearchParams("page=1"));
const mockUseSession = vi.fn(() => ({
  data: { user: { id: "user-1", email: "user@example.com" } },
  isPending: false,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => mockUseParams(),
  useSearchParams: () => mockUseSearchParams(),
  usePathname: () => "/",
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/auth-client", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("@/components/template/DefaultTemplate", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-template">{children}</div>
  ),
}));

describe("client page integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("news list page fetches company news and renders pagination", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: 10,
              code: "7203",
              title: "最新ニュース",
              content: "本文",
              created_at: "2026-02-17 10:00",
              company_name: "トヨタ",
              status: JSON.stringify({ news: true }),
            },
          ],
          pagination: {
            currentPage: 1,
            totalPages: 2,
            totalItems: 21,
          },
        }),
    }) as unknown as typeof fetch;

    const NewsListPage = (await import("@/app/stocks/[code]/news/list/page")).default;
    render(<NewsListPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "ニュース一覧 (全21件)" })
      ).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/stocks/7203/news",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/stocks/7203/news/list?page=2"
    );
  });

  it("news list page shows fetch error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "failed" }),
    }) as unknown as typeof fetch;

    const NewsListPage = (await import("@/app/stocks/[code]/news/list/page")).default;
    render(<NewsListPage />);

    await waitFor(() => {
      expect(screen.getByText("Error: Failed to fetch news")).toBeInTheDocument();
    });
  });

  it("billing page renders premium subscription info for logged-in user", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "user-1", email: "user@example.com" } },
      isPending: false,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          isPremium: true,
          plan: "standard",
          status: "active",
          currentPeriodEnd: "2026-03-01T00:00:00.000Z",
          hasFincodeCustomer: true,
          canCancel: true,
        }),
    }) as unknown as typeof fetch;

    const BillingPage = (await import("@/app/settings/billing/page")).default;
    render(<BillingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "請求・プラン管理" })
      ).toBeInTheDocument();
    });
    expect(screen.getByText("スタンダードプラン")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "サブスクリプションを解約" })
    ).toBeInTheDocument();
  });

  it("billing page redirects guest users to /login", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
    });
    global.fetch = vi.fn() as unknown as typeof fetch;

    const BillingPage = (await import("@/app/settings/billing/page")).default;
    render(<BillingPage />);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/login");
    });
  });
});
