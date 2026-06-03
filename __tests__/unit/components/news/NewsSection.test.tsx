import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockPickupNews = [
  {
    id: 1,
    code: "7203",
    title: "トヨタ自動車が新型EVを発表",
    content: '<p>トヨタが新型EV</p><img src="https://example.com/toyota.jpg" />',
    created_at: "2026-01-15",
    company_name: "トヨタ自動車",
    site: 1,
    image_url: "https://example.com/toyota.jpg",
  },
  {
    id: 2,
    code: "6758",
    title: "ソニーの決算発表",
    content: "<p>ソニーの四半期決算</p>",
    created_at: "2026-01-14",
    company_name: "ソニーグループ",
    site: 1,
  },
];

const mockMarketNews = [
  {
    id: 3,
    code: "0000",
    title: "日経平均が4万円突破",
    content: "<p>日経平均株価が大台突破</p>",
    created_at: "2026-01-15",
    company_name: "",
    site: 2,
    image_path: "/images/nikkei.jpg",
  },
  {
    id: 4,
    code: "0000",
    title: "米国市場の動向",
    content: "<p>NYダウの動き</p>",
    created_at: "2026-01-14",
    company_name: "",
    site: 2,
  },
];

import NewsSection from "@/components/news/NewsSection";

function mockFetchWithData(pickup: typeof mockPickupNews, market: typeof mockMarketNews) {
  global.fetch = vi.fn((_url, options) => {
    const body = JSON.parse((options as RequestInit).body as string);
    const data = body.pickup === 1 ? pickup : market;
    return Promise.resolve({
      json: () => Promise.resolve({ success: true, data }),
    });
  }) as unknown as typeof fetch;
}

describe("NewsSection", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
  });

  it("shows loading skeleton initially", () => {
    global.fetch = vi.fn(
      () => new Promise(() => {})
    ) as unknown as typeof fetch;

    render(<NewsSection />);

    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders pickup and market news sections after loading", async () => {
    mockFetchWithData(mockPickupNews, mockMarketNews);

    render(<NewsSection />);

    await waitFor(() => {
      expect(screen.getByText("ピックアップニュース")).toBeInTheDocument();
      expect(screen.getByText("市場ニュース")).toBeInTheDocument();
    });
  });

  it("renders news titles", async () => {
    mockFetchWithData(mockPickupNews, mockMarketNews);

    render(<NewsSection />);

    await waitFor(() => {
      // Titles appear in h3 elements; some also appear in fallback span (when no image)
      expect(screen.getAllByText("トヨタ自動車が新型EVを発表").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("ソニーの決算発表").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("日経平均が4万円突破").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("米国市場の動向").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders company names", async () => {
    mockFetchWithData(mockPickupNews, mockMarketNews);

    render(<NewsSection />);

    await waitFor(() => {
      expect(screen.getByText("トヨタ自動車")).toBeInTheDocument();
      expect(screen.getByText("ソニーグループ")).toBeInTheDocument();
    });
  });

  it("renders images when image_url or image_path is provided", async () => {
    mockFetchWithData(mockPickupNews, mockMarketNews);

    render(<NewsSection />);

    await waitFor(() => {
      const images = screen.getAllByRole("img");
      expect(images.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("renders links to news detail pages", async () => {
    mockFetchWithData(mockPickupNews, mockMarketNews);

    render(<NewsSection />);

    await waitFor(() => {
      const link = screen.getByText("トヨタ自動車が新型EVを発表").closest("a");
      expect(link).toHaveAttribute("href", "/stocks/7203/news/1");
    });
  });

  it("shows fallback div when no image is available", async () => {
    const noImageNews = [
      {
        id: 10,
        code: "1234",
        title: "画像なしニュース",
        content: "<p>テキストのみ</p>",
        created_at: "2026-01-15",
        company_name: "テスト社",
        site: 1,
      },
    ];

    mockFetchWithData(noImageNews as typeof mockPickupNews, []);

    render(<NewsSection />);

    await waitFor(() => {
      const titleInFallback = screen.getAllByText("画像なしニュース");
      expect(titleInFallback.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("handles fetch failure gracefully", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("Network error"))
    ) as unknown as typeof fetch;

    render(<NewsSection />);

    await waitFor(() => {
      expect(screen.getByText("ピックアップニュース")).toBeInTheDocument();
      expect(screen.getByText("市場ニュース")).toBeInTheDocument();
    });
  });

  it("handles API returning success: false", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: false }),
      })
    ) as unknown as typeof fetch;

    render(<NewsSection />);

    await waitFor(() => {
      expect(screen.getByText("ピックアップニュース")).toBeInTheDocument();
    });
  });

  it("uses initial data without making fetch calls", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    ) as unknown as typeof fetch;

    render(
      <NewsSection
        initialPickupNews={mockPickupNews}
        initialMarketNews={mockMarketNews}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("ピックアップニュース")).toBeInTheDocument();
      expect(screen.getByText("市場ニュース")).toBeInTheDocument();
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("makes two fetch calls (pickup=1 and pickup=2)", async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ success: true, data: [] }),
      })
    ) as unknown as typeof fetch;

    render(<NewsSection />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const bodies = calls.map((c: unknown[]) =>
      JSON.parse((c[1] as RequestInit).body as string)
    );
    expect(bodies).toContainEqual({ pickup: 1, limit: 2 });
    expect(bodies).toContainEqual({ pickup: 2, limit: 2 });
  });
});
