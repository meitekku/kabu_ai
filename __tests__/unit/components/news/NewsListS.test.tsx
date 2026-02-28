import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockNewsItems = [
  {
    id: 1,
    code: "7203",
    title: "トヨタの新戦略",
    content:
      '<p>トヨタが新戦略を発表</p><img src="https://example.com/img1.jpg" />',
    created_at: "2026-01-15 10:00",
    company_name: "トヨタ自動車",
    site: 1,
    pickup: 0,
    image_path: null,
  },
  {
    id: 2,
    code: "6758",
    title: "ソニーの新製品",
    content: "<p>ソニーが新製品を発表</p>",
    created_at: "2026-01-14 09:00",
    company_name: "ソニーグループ",
    site: 1,
    pickup: 0,
    image_path: "/images/sony.jpg",
  },
  {
    id: 3,
    code: "9984",
    title: "ソフトバンク決算",
    content: "<p>ソフトバンクグループが決算発表</p>",
    created_at: "2026-01-13 08:00",
    company_name: "ソフトバンクグループ",
    site: 1,
    pickup: 0,
    image_path: null,
  },
  {
    id: 4,
    code: "4502",
    title: "武田薬品の新薬",
    content: "<p>武田薬品が新薬承認</p>",
    created_at: "2026-01-12 07:00",
    company_name: "武田薬品工業",
    site: 1,
    pickup: 0,
    image_path: null,
  },
];

import NewsListS from "@/components/news/NewsListS";

describe("NewsListS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows loading spinner initially", () => {
    global.fetch = vi.fn(
      () => new Promise(() => {})
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders news items after loading", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ data: mockNewsItems, total: 4 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      expect(screen.getByText("トヨタの新戦略")).toBeInTheDocument();
      expect(screen.getByText("ソニーの新製品")).toBeInTheDocument();
      expect(screen.getByText("ソフトバンク決算")).toBeInTheDocument();
      expect(screen.getByText("武田薬品の新薬")).toBeInTheDocument();
    });
  });

  it("renders created_at dates", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ data: mockNewsItems, total: 4 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      expect(screen.getByText("2026-01-15 10:00")).toBeInTheDocument();
      expect(screen.getByText("2026-01-14 09:00")).toBeInTheDocument();
    });
  });

  it("renders links to /stocks/:code/news/:id when code exists", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ data: mockNewsItems, total: 4 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      const link = screen.getByText("トヨタの新戦略").closest("a");
      expect(link).toHaveAttribute("href", "/stocks/7203/news/1");
    });
  });

  it("falls back to /stocks/all/news/:id when code is missing", async () => {
    vi.useRealTimers();
    const items = [
      {
        id: 99,
        code: null,
        title: "コードなし記事",
        content: "<p>コード情報がない記事</p>",
        created_at: "2026-01-11 06:00",
        company_name: null,
        site: 1,
        pickup: 0,
        image_path: null,
      },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: items, total: 1 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      const link = screen.getByText("コードなし記事").closest("a");
      expect(link).toHaveAttribute("href", "/stocks/all/news/99");
    });
  });

  it("renders company visual for items with stock code, thumbnail for items without code", async () => {
    vi.useRealTimers();
    const items = [
      {
        id: 1,
        code: "7203",
        title: "コード有り記事",
        content: "<p>コード有り</p>",
        created_at: "2026-01-15 10:00",
        company_name: "トヨタ自動車",
        site: 1,
        pickup: 0,
        image_path: null,
      },
      {
        id: 2,
        code: null,
        title: "コードなし画像付き記事",
        content: '<img src="https://example.com/img.jpg" />',
        created_at: "2026-01-14 09:00",
        company_name: "",
        site: 1,
        pickup: 0,
        image_path: null,
      },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: items, total: 2 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      // item with code renders company initial, not img thumbnail
      expect(screen.getByText("ト")).toBeInTheDocument();
      // item without code but with img in content renders thumbnail
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "https://example.com/img.jpg");
    });
  });

  it("uses image_path over content-extracted image when no stock code", async () => {
    vi.useRealTimers();
    const items = [
      {
        id: 10,
        code: null,
        title: "テスト記事",
        content: '<img src="https://content-img.com/photo.jpg" />',
        created_at: "2026-01-15",
        company_name: "テスト社",
        site: 1,
        pickup: 0,
        image_path: "/images/preferred.jpg",
      },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: items, total: 1 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", "/images/preferred.jpg");
    });
  });

  it("strips HTML tags from content for display", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ data: mockNewsItems, total: 4 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      expect(screen.getByText(/トヨタが新戦略を発表/)).toBeInTheDocument();
    });
  });

  it("shows empty state when no news", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      expect(
        screen.getByText("現在、ニュースはありません。")
      ).toBeInTheDocument();
    });
  });

  it("shows error state on fetch failure", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({ error: "Server error" }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    // Need to wait through retries (MAX_RETRIES=3, RETRY_DELAY=1000ms)
    // With real timers the retries will happen via setTimeout
    await waitFor(
      () => {
        const errorEl = document.querySelector(".text-red-600");
        expect(errorEl).toBeInTheDocument();
      },
      { timeout: 10000 }
    );
  });

  it("renders 'もっと見る' link when more=true", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ data: mockNewsItems, total: 4 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS more={true} />);

    await waitFor(() => {
      const moreLink = screen.getByText("もっと見る ›");
      expect(moreLink).toBeInTheDocument();
      expect(moreLink.closest("a")).toHaveAttribute("href", "/news/latest");
    });
  });

  it("renders pagination when more=false and totalPages > 1", async () => {
    vi.useRealTimers();
    // 20 total items with limit=4 means 5 pages
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ data: mockNewsItems, total: 20 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS limit={4} more={false} />);

    await waitFor(() => {
      // Should have page number buttons
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  it("uses initialData on first render without fetch", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [], total: 0 }),
      })
    ) as unknown as typeof fetch;

    render(
      <NewsListS
        limit={4}
        initialData={{
          news: mockNewsItems,
          total: mockNewsItems.length,
          page: 1,
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("トヨタの新戦略")).toBeInTheDocument();
      expect(screen.getByText("ソニーの新製品")).toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends correct request body with site as array", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ data: [], total: 0 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS site={[1, 70]} limit={4} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.site_type).toEqual([1, 70]);
    expect(body.limit).toBe(4);
    expect(body.page).toBe(1);
  });

  it("sends correct request body with site as number", async () => {
    vi.useRealTimers();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ data: [], total: 0 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS site={5} limit={10} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.site_type).toBe(5);
    expect(body.limit).toBe(10);
  });

  it("handles Next.js optimized image URLs in content extraction", async () => {
    vi.useRealTimers();
    const items = [
      {
        id: 20,
        code: null,
        title: "最適化画像テスト",
        content:
          '<img src="/_next/image?url=%2Fimages%2Ftest.jpg&w=640&q=75" />',
        created_at: "2026-01-15",
        company_name: "テスト社",
        site: 1,
        pickup: 0,
        image_path: null,
      },
    ];

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: items, total: 1 }),
      })
    ) as unknown as typeof fetch;

    render(<NewsListS />);

    await waitFor(() => {
      const img = screen.getByRole("img");
      // Should decode the Next.js URL to the original
      expect(img).toHaveAttribute("src", "/images/test.jpg");
    });
  });
});
