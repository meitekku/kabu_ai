import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSearchNews = vi.fn();
const mockNewsListS = vi.fn();

vi.mock("@/lib/news/search", () => ({
  searchNews: (...args: unknown[]) => mockSearchNews(...args),
}));

vi.mock("@/components/template/DefaultTemplate", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="default-template">{children}</div>
  ),
}));

vi.mock("@/components/news/NewsListS", () => ({
  default: (props: unknown) => {
    mockNewsListS(props);
    return <div data-testid="news-list-s" />;
  },
}));

vi.mock("@/components/top/TopChatShell", () => ({
  default: () => <div data-testid="top-chat-shell" />,
}));

describe("Top/Latest pages integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("top page renders the chat shell only", async () => {
    const HomePage = (await import("@/app/page")).default;
    const element = await HomePage();
    render(element);

    expect(screen.getByTestId("top-chat-shell")).toBeInTheDocument();
    expect(mockNewsListS).not.toHaveBeenCalled();
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
