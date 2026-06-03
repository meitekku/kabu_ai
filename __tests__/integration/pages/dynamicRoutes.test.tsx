import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const mockSelect = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
  redirect: mockRedirect,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
  useParams: () => ({}),
}));

vi.mock("@/components/chat/ChatInterface", () => ({
  ChatInterface: ({ stockCode }: { stockCode: string }) => (
    <div data-testid="chat-interface">{stockCode}</div>
  ),
}));

vi.mock("@/app/stocks/[code]/news/NewsPageClient", () => ({
  default: ({ code }: { code: string }) => (
    <div data-testid="news-page-client">{code}</div>
  ),
}));

vi.mock("@/app/stocks/[code]/news/[id]/ArticleDetailClient", () => ({
  default: ({ code, id }: { code: string; id: string }) => (
    <div data-testid="article-detail-client">{`${code}:${id}`}</div>
  ),
}));

vi.mock("@/app/stocks/[code]/predict/PredictPageClient", () => ({
  default: ({
    code,
    companyName,
  }: {
    code: string;
    companyName?: string;
  }) => <div data-testid="predict-page-client">{`${code}|${companyName || ""}`}</div>,
}));

vi.mock("@/app/stocks/[code]/valuation/ValuationPageClient", () => ({
  default: ({ code }: { code: string }) => (
    <div data-testid="valuation-page-client">{code}</div>
  ),
}));

vi.mock("@/lib/database/Mysql", () => ({
  Database: {
    getInstance: () => ({
      select: (...args: unknown[]) => mockSelect(...args),
    }),
  },
}));

describe("dynamic server routes integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockResolvedValue([]);
  });

  it("chat page normalizes code and renders ChatInterface", async () => {
    const ChatPage = (await import("@/app/chat/page")).default;
    const element = await ChatPage({
      searchParams: Promise.resolve({ code: " 7203 " }),
    });
    render(element);

    expect(screen.getByTestId("chat-interface")).toHaveTextContent("7203");
  });

  it("chat page calls notFound when code is missing", async () => {
    const ChatPage = (await import("@/app/chat/page")).default;

    await expect(
      ChatPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("stocks news page redirects /stocks/all/news to /news/latest", async () => {
    const NewsPage = (await import("@/app/stocks/[code]/news/page")).default;

    await expect(
      NewsPage({
        params: Promise.resolve({ code: "all" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/news/latest");

    expect(mockRedirect).toHaveBeenCalledWith("/news/latest");
  });

  it("stocks news page renders NewsPageClient for normal codes", async () => {
    const NewsPage = (await import("@/app/stocks/[code]/news/page")).default;
    const element = await NewsPage({
      params: Promise.resolve({ code: "7203" }),
      searchParams: Promise.resolve({}),
    });
    render(element);

    expect(screen.getByTestId("news-page-client")).toHaveTextContent("7203");
  });

  it("article detail page redirects when canonical code differs", async () => {
    mockSelect.mockResolvedValueOnce([{ code: "6758" }]);
    const ArticleDetailPage = (
      await import("@/app/stocks/[code]/news/[id]/page")
    ).default;

    await expect(
      ArticleDetailPage({
        params: Promise.resolve({ code: "7203", id: "99" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/stocks/6758/news/99");

    expect(mockRedirect).toHaveBeenCalledWith("/stocks/6758/news/99");
  });

  it("article detail page renders client component on db failure", async () => {
    mockSelect.mockRejectedValueOnce(new Error("db failed"));
    const ArticleDetailPage = (
      await import("@/app/stocks/[code]/news/[id]/page")
    ).default;
    const element = await ArticleDetailPage({
      params: Promise.resolve({ code: "7203", id: "99" }),
    });
    render(element);

    expect(screen.getByTestId("article-detail-client")).toHaveTextContent(
      "7203:99"
    );
  });

  it("predict page resolves company name and forwards props", async () => {
    mockSelect.mockResolvedValueOnce([{ name: "トヨタ自動車" }]);
    const PredictPage = (await import("@/app/stocks/[code]/predict/page")).default;
    const element = await PredictPage({
      params: Promise.resolve({ code: "7203" }),
    });
    render(element);

    expect(screen.getByTestId("predict-page-client")).toHaveTextContent(
      "7203|トヨタ自動車"
    );
  });

  it("valuation page forwards route code", async () => {
    const ValuationPage = (await import("@/app/stocks/[code]/valuation/page"))
      .default;
    const element = await ValuationPage({
      params: Promise.resolve({ code: "7203" }),
    });
    render(element);

    expect(screen.getByTestId("valuation-page-client")).toHaveTextContent("7203");
  });
});
