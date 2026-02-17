import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSearchNews = vi.fn();
const mockNewsSection = vi.fn();
const mockNewsListS = vi.fn();

vi.mock("@/lib/news/search", () => ({
  searchNews: (...args: unknown[]) => mockSearchNews(...args),
}));

vi.mock("@/components/template/DefaultTemplate", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-template">{children}</div>
  ),
}));

vi.mock("@/components/news/NewsSection", () => ({
  default: (props: unknown) => {
    mockNewsSection(props);
    return <div data-testid="news-section" />;
  },
}));

vi.mock("@/components/news/NewsListS", () => ({
  default: (props: unknown) => {
    mockNewsListS(props);
    return <div data-testid="news-list-s" />;
  },
}));

describe("Top/Latest pages integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("top page wires initial search results to NewsSection/NewsListS", async () => {
    mockSearchNews
      .mockResolvedValueOnce({
        response: { data: [{ id: 1, title: "pickup" }], total: 1 },
      })
      .mockResolvedValueOnce({
        response: { data: [{ id: 2, title: "market" }], total: 1 },
      })
      .mockResolvedValueOnce({
        response: { data: [{ id: 3, title: "latest" }], total: 4 },
      });

    const HomePage = (await import("@/app/page")).default;
    const element = await HomePage();
    render(element);

    expect(mockSearchNews).toHaveBeenNthCalledWith(1, { pickup: 1, limit: 2 });
    expect(mockSearchNews).toHaveBeenNthCalledWith(2, { pickup: 2, limit: 2 });
    expect(mockSearchNews).toHaveBeenNthCalledWith(3, {
      site_type: [1, 70],
      limit: 4,
      page: 1,
    });

    expect(mockNewsSection).toHaveBeenCalledWith(
      expect.objectContaining({
        initialPickupNews: expect.any(Array),
        initialMarketNews: expect.any(Array),
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
