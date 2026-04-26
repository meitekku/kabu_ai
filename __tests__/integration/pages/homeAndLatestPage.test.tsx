import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetTrendingContent = vi.fn();
const mockSearchNews = vi.fn();
const mockTrendingSection = vi.fn();
const mockNewsListS = vi.fn();

vi.mock("@/lib/top/trending", () => ({
  getTrendingContent: (...args: unknown[]) => mockGetTrendingContent(...args),
}));

vi.mock("@/lib/news/search", () => ({
  searchNews: (...args: unknown[]) => mockSearchNews(...args),
}));

vi.mock("@/components/template/DefaultTemplate", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-template">{children}</div>
  ),
}));

vi.mock("@/components/top/TrendingSection", () => ({
  default: (props: unknown) => {
    mockTrendingSection(props);
    return <div data-testid="trending-section" />;
  },
}));

vi.mock("@/components/news/NewsListS", () => ({
  default: (props: unknown) => {
    mockNewsListS(props);
    return <div data-testid="news-list-s" />;
  },
}));

vi.mock("@/components/top/IndexTicker", () => ({
  default: () => <div data-testid="index-ticker" />,
}));

vi.mock("@/components/top/AgentPortfolioPanel", () => ({
  default: () => <div data-testid="agent-portfolio-panel" />,
}));

vi.mock("@/components/top/FavoriteMiniChartList", () => ({
  default: () => <div data-testid="favorite-mini-chart-list" />,
}));

const mockTrendingData = {
  section1: {
    type: "market_up" as const,
    label: "値上がり注目銘柄",
    time_label: "前場",
    items: [],
  },
  section2: {
    type: "trading_value" as const,
    label: "売買代金上位銘柄",
    time_label: "前場",
    items: [],
  },
  time_context: "morning_session" as const,
  generated_at: "2026-02-28T00:00:00.000Z",
};

describe("Top/Latest pages integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("top page wires trending content and latest news to components", async () => {
    mockGetTrendingContent.mockResolvedValueOnce(mockTrendingData);
    mockSearchNews.mockResolvedValueOnce({
      response: { data: [{ id: 3, title: "latest" }], total: 4 },
    });

    const HomePage = (await import("@/app/page")).default;
    const element = await HomePage();
    render(element);

    expect(mockGetTrendingContent).toHaveBeenCalledTimes(1);
    expect(mockSearchNews).toHaveBeenCalledWith({
      site_type: [1, 70],
      limit: 4,
      page: 1,
    });

    expect(mockTrendingSection).toHaveBeenCalledWith(
      expect.objectContaining({
        initialData: expect.objectContaining({ time_context: "morning_session" }),
      })
    );
    expect(mockNewsListS).toHaveBeenCalledWith(
      expect.objectContaining({
        more: true,
        site: [1, 70],
        initialData: expect.objectContaining({ total: 4, page: 1 }),
      })
    );

    expect(screen.getByRole("heading", { name: "新着ニュース" })).toBeInTheDocument();
  });

  it("top page falls back gracefully when getTrendingContent fails", async () => {
    mockGetTrendingContent.mockRejectedValueOnce(new Error("db unavailable"));
    mockSearchNews.mockResolvedValueOnce({
      response: { data: [], total: 0 },
    });

    const HomePage = (await import("@/app/page")).default;
    const element = await HomePage();
    render(element);

    expect(mockTrendingSection).toHaveBeenCalledWith(
      expect.objectContaining({ initialData: undefined })
    );
    expect(screen.getByRole("heading", { name: "新着ニュース" })).toBeInTheDocument();
  });

  it("latest page falls back when searchNews fails", async () => {
    mockSearchNews.mockRejectedValueOnce(new Error("db unavailable"));

    const LatestNewsPage = (await import("@/app/news/latest/page")).default;
    const element = await LatestNewsPage();
    render(element);

    expect(mockSearchNews).toHaveBeenCalledWith({ limit: 10, page: 1 });
    expect(mockNewsListS).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        more: false,
        initialData: undefined,
      })
    );
    expect(
      screen.getByRole("heading", { name: "ニュース一覧" })
    ).toBeInTheDocument();
  });
});
